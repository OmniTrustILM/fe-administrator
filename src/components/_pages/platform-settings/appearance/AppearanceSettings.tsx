import cn from 'classnames';
import { Info, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import Callout from 'components/Callout';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import Toggletip from 'components/Toggletip';
import { actions, selectors } from 'ducks/branding';
import type { BrandingSettingsModel, BrandingSettingsUpdateModel } from 'types/branding';
import { brandFindings, groupBrandFindings, suggestBrandColor, type FindingCategory } from 'utils/brand-contrast';
import { BRAND_DEFAULT_COLORS, brandColors, type BrandColorKey } from 'utils/brand-tokens';
import { isBrandColor, LOGO_HELP, readLogoFile } from 'utils/branding';
import ColorField from './ColorField';
import LogoSlot from './LogoSlot';

type ColorKey = 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor';
type LogoKey = 'lightLogo' | 'darkLogo';

type ColorFieldSpec = { category: BrandColorKey; key: ColorKey; label: string; description: string; defaultColor: string };

/**
 * Each colour says what it actually drives and which theme it reaches, because the label alone does not: an operator
 * choosing "Background" has no way to know it will not touch the dark theme.
 *
 * `defaultColor` is the platform value the field falls back to when it is left unset, and is the light-theme one even
 * for the two colours that reach both themes: one input drives both, and the dark step is derived from it rather than
 * entered here.
 */
const COLOR_FIELDS: readonly ColorFieldSpec[] = [
    {
        category: 'primary',
        key: 'primaryColor',
        label: 'Primary',
        description: 'Buttons, links, active states and the page header. Applies to both the light and the dark theme.',
        defaultColor: BRAND_DEFAULT_COLORS.primary,
    },
    {
        category: 'secondary',
        key: 'secondaryColor',
        label: 'Secondary',
        description: 'Accents, chips and informational badges. Applies to both the light and the dark theme.',
        defaultColor: BRAND_DEFAULT_COLORS.secondary,
    },
    {
        category: 'background',
        key: 'backgroundColor',
        label: 'Background',
        description: 'The page background and raised surfaces such as cards and dialogs. Light theme only.',
        defaultColor: BRAND_DEFAULT_COLORS.background,
    },
    {
        category: 'text',
        key: 'textColor',
        label: 'Text',
        description: 'Body text and headings. Light theme only.',
        defaultColor: BRAND_DEFAULT_COLORS.text,
    },
];

/**
 * The field a contrast box points at, which is where its heading and the key its suggestion writes to both come from:
 * a box asks the operator to change a field, so it has to name that field as the form does.
 */
const COLOR_FIELD_BY_CATEGORY = Object.fromEntries(COLOR_FIELDS.map((field) => [field.category, field])) as Record<
    BrandColorKey,
    ColorFieldSpec
>;

/** The one finding category with no colour field behind it: `logo` carries advice about an uploaded image. */
const LOGO_GROUP_LABEL = 'Logos';

const LOGO_FALLBACK = "Each theme uses its own logo. A slot left empty shows the platform logo in that theme rather than the other slot's.";

const LOGO_SLOTS: ReadonlyArray<{ key: LogoKey; label: string }> = [
    { key: 'lightLogo', label: 'Light' },
    { key: 'darkLogo', label: 'Dark' },
];

/**
 * Contrast warns, it never blocks: the brand belongs to the operator, and the platform's job is to say what a choice
 * costs rather than to overrule it. What each box says comes from `utils/brand-contrast.ts`.
 *
 * The lead names no standard: an operator who has pressed Save needs to know which field to go back to, not which
 * specification says so.
 */
const CONTRAST_LEAD = 'Some of these colors will be hard to read. You can save anyway.';

/** Taking a suggestion empties the boxes, and an empty dialog under the first sentence reads as a bug. */
const CONTRAST_CLEARED = 'These colors all pass now. Save to store them.';

/** Spelled out under the boxes rather than behind a toggletip: the figures above are meaningless without it. */
const CONTRAST_LEGEND =
    'A contrast ratio compares two colors against each other. WCAG 2.1 AA, which the platform holds itself to, asks for at least 4.5:1 for text and 3:1 for outlines and indicators.';

const CONTRAST_LEARN_MORE = 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html';

/**
 * Reset is an empty update, and Core clears every field left out of one, so the operator's default theme goes with the
 * colours and logos. Named here because nothing in this application can set it again.
 */
const RESET_CONFIRMATION =
    'This removes the configured colors, logos and default theme, and the instance returns to the platform default look. Continue?';

type Colors = Record<ColorKey, string>;
type LogoState = { dataUri?: string; fileName?: string; ratio?: number; error?: string };
type Logos = Record<LogoKey, LogoState>;

const toColors = (branding?: BrandingSettingsModel): Colors => ({
    primaryColor: branding?.primaryColor ?? '',
    secondaryColor: branding?.secondaryColor ?? '',
    backgroundColor: branding?.backgroundColor ?? '',
    textColor: branding?.textColor ?? '',
});

const toLogos = (branding?: BrandingSettingsModel): Logos => ({
    lightLogo: { dataUri: branding?.lightLogo },
    darkLogo: { dataUri: branding?.darkLogo },
});

/**
 * The Appearance tab. Rendered only for a viewer holding `SETTINGS` + `UPDATE_BRANDING` - the tab that mounts this
 * component reads that grant from the user profile and omits the tab entirely otherwise - so there is no read-only
 * mode here. Core still enforces the grant on the write.
 */
function AppearanceSettings() {
    const dispatch = useDispatch();

    const branding = useSelector(selectors.branding);
    const isFetching = useSelector(selectors.isFetchingBranding);
    const isUpdating = useSelector(selectors.isUpdatingBranding);
    const isResetting = useSelector(selectors.isResettingBranding);
    const error = useSelector(selectors.error);

    const [colors, setColors] = useState<Colors>(() => toColors(branding));
    const [logos, setLogos] = useState<Logos>(() => toLogos(branding));
    const [readingLogos, setReadingLogos] = useState<Record<LogoKey, boolean>>({ lightLogo: false, darkLogo: false });
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isContrastDialogOpen, setIsContrastDialogOpen] = useState(false);

    const contrastLeadRef = useRef<HTMLDivElement>(null);

    // Reads settle asynchronously, so the slot is claimed by a token. Anything that supersedes a read - a second file,
    // or a delete - bumps the token, and the earlier read's result is then dropped instead of overwriting the newer
    // choice. A plain `await` would let the slower of two selections win.
    const logoReadTokens = useRef<Record<LogoKey, number>>({ lightLogo: 0, darkLogo: 0 });

    useEffect(() => {
        dispatch(actions.getBranding());
    }, [dispatch]);

    // Re-seeds the form whenever the stored branding changes, which is also what discards a pending logo once the save
    // has landed: what comes back is what Core stored, which for an SVG is not byte-for-byte what was sent.
    useEffect(() => {
        setColors(toColors(branding));
        setLogos(toLogos(branding));
    }, [branding]);

    const isBusy = isFetching || isUpdating || isResetting;

    // A read that succeeds always leaves a value behind - a Core with nothing stored answers 404, which the epic maps
    // to an empty success - so an absent one means no read has landed. The form seeded from it is empty and looks
    // exactly like an unbranded instance, and since Core clears every field left out of a request, saving from it
    // would wipe the branding that is actually stored, `defaultTheme` included. There is no known-good state to edit
    // from until a read succeeds, so the tab stays read-only until one does.
    const hasKnownBranding = branding !== undefined;
    const isReadOnly = isBusy || !hasKnownBranding;

    const hasInvalidColor = useMemo(() => Object.values(colors).some((value) => value !== '' && !isBrandColor(value)), [colors]);

    // Measured over the token families the colours derive, in both compositions, so the warning is about what the
    // page will paint rather than about the four inputs on their own. An unset or half-typed colour drives nothing and
    // is simply left out of the evaluation.
    const contrastFindings = useMemo(() => brandFindings(brandColors(colors)), [colors]);
    const findingGroups = useMemo(() => groupBrandFindings(contrastFindings), [contrastFindings]);

    // Searched per field rather than per line: one input drives a whole family, so the shade that silences a box is a
    // property of the field, not of any single pairing it broke.
    const suggestions = useMemo(() => {
        if (!isContrastDialogOpen) {
            return {};
        }

        const brand = brandColors(colors);

        return Object.fromEntries(
            findingGroups.flatMap(({ category }) => (category === 'logo' ? [] : [[category, suggestBrandColor(brand, category)] as const])),
        ) as Partial<Record<FindingCategory, string>>;
    }, [colors, findingGroups, isContrastDialogOpen]);

    // Saving mid-read would send the branding without the file the user just chose.
    const isReadingLogo = LOGO_SLOTS.some(({ key }) => readingLogos[key]);

    const isDirty = useMemo(() => {
        const stored = toColors(branding);
        const storedLogos = toLogos(branding);

        return (
            COLOR_FIELDS.some(({ key }) => colors[key] !== stored[key]) ||
            LOGO_SLOTS.some(({ key }) => logos[key].dataUri !== storedLogos[key].dataUri)
        );
    }, [branding, colors, logos]);

    const onColorChange = useCallback((key: ColorKey, value: string) => {
        setColors((current) => ({ ...current, [key]: value }));
    }, []);

    // Taking a suggestion silences its box, which unmounts the button that was just pressed - Radix would then park
    // focus on the dialog itself. Moved first, so it lands on the lead, which is where the save now reports it stands.
    const onSuggestionTaken = useCallback(
        (key: ColorKey, suggestion: string) => {
            contrastLeadRef.current?.focus();
            onColorChange(key, suggestion);
        },
        [onColorChange],
    );

    const onLogoSelect = useCallback(async (key: LogoKey, file: File) => {
        logoReadTokens.current[key] += 1;
        const token = logoReadTokens.current[key];
        const stillOwnsSlot = () => logoReadTokens.current[key] === token;

        setReadingLogos((current) => ({ ...current, [key]: true }));

        try {
            const result = await readLogoFile(file);

            if (stillOwnsSlot()) {
                setLogos((current) => ({
                    ...current,
                    [key]: result.error
                        ? { ...current[key], error: result.error }
                        : { dataUri: result.dataUri, fileName: file.name, ratio: result.ratio, error: undefined },
                }));
            }
        } catch {
            // readLogoFile reports its own failures as a result rather than throwing, so this is a guard against that
            // changing: an escaping rejection would otherwise strand the slot mid-read and keep Save disabled for the
            // rest of the session with nothing on screen to explain it.
            if (stillOwnsSlot()) {
                setLogos((current) => ({ ...current, [key]: { ...current[key], error: 'Could not read the selected file.' } }));
            }
        } finally {
            // Only the read that still owns the slot may clear the flag. A superseded one would otherwise turn it off
            // while the selection that replaced it is still being read.
            if (stillOwnsSlot()) {
                setReadingLogos((current) => ({ ...current, [key]: false }));
            }
        }
    }, []);

    const onLogoDelete = useCallback((key: LogoKey) => {
        logoReadTokens.current[key] += 1;

        setReadingLogos((current) => ({ ...current, [key]: false }));
        setLogos((current) => ({ ...current, [key]: { dataUri: undefined, fileName: undefined, ratio: undefined, error: undefined } }));
    }, []);

    const sendSave = useCallback(() => {
        const update: BrandingSettingsUpdateModel = {
            // Carried through untouched. The tab does not edit it, and Core clears any field left out of the request,
            // so omitting it would wipe the operator's default theme on every save.
            defaultTheme: branding?.defaultTheme,
            lightLogo: logos.lightLogo.dataUri,
            darkLogo: logos.darkLogo.dataUri,
        };

        // An unset colour is omitted rather than sent as an empty string: Core validates the format of any value it
        // is given, so '' is rejected outright, while an absent field is what clears that part of the brand.
        for (const { key } of COLOR_FIELDS) {
            update[key] = colors[key] === '' ? undefined : colors[key];
        }

        dispatch(actions.updateBranding({ branding: update }));
    }, [branding?.defaultTheme, colors, dispatch, logos]);

    const onSave = useCallback(() => {
        if (contrastFindings.length > 0) {
            setIsContrastDialogOpen(true);
            return;
        }

        sendSave();
    }, [contrastFindings, sendSave]);

    const onContrastConfirmed = useCallback(() => {
        setIsContrastDialogOpen(false);
        sendSave();
    }, [sendSave]);

    const onResetConfirmed = useCallback(() => {
        setIsResetDialogOpen(false);

        // Every slot gives up ownership before the reset goes out. Reset is offered while a logo is still being read -
        // only Save is held back for that - and the branding effect clears the form when the reset lands, so a read
        // that still owned its slot would write its logo back into a form that has just been emptied, leaving the tab
        // partially populated under a message saying the reset succeeded.
        for (const { key } of LOGO_SLOTS) {
            logoReadTokens.current[key] += 1;
        }
        setReadingLogos({ lightLogo: false, darkLogo: false });

        dispatch(actions.resetBranding());
    }, [dispatch]);

    return (
        <div className="@container space-y-6 py-6" data-testid="appearance-settings">
            {!hasKnownBranding && !isFetching && (
                <Callout severity="warning" dataTestId="appearance-unavailable">
                    The stored branding could not be read, so it cannot be changed here. Reload the page to try again.
                </Callout>
            )}

            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Colors</h3>
                <div className="grid gap-4 @md:grid-cols-2">
                    {COLOR_FIELDS.map(({ key, label, description, defaultColor }) => (
                        <ColorField
                            key={key}
                            id={key}
                            label={label}
                            description={description}
                            value={colors[key]}
                            defaultColor={defaultColor}
                            disabled={isReadOnly}
                            onChange={(value) => onColorChange(key, value)}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-content">Logos</h3>
                    <Toggletip
                        ariaLabel="Logo requirements"
                        content={
                            <>
                                <p>{LOGO_HELP}</p>
                                <p className="mt-2">{LOGO_FALLBACK}</p>
                            </>
                        }
                        dataTestId="appearance-logo-help"
                    />
                </div>
                <div className="grid gap-6 @md:grid-cols-2">
                    {LOGO_SLOTS.map(({ key, label }) => (
                        <LogoSlot
                            key={key}
                            id={key}
                            label={label}
                            value={logos[key].dataUri}
                            fileName={logos[key].fileName}
                            ratio={logos[key].ratio}
                            error={logos[key].error}
                            disabled={isReadOnly}
                            onSelect={(file) => void onLogoSelect(key, file)}
                            onDelete={() => onLogoDelete(key)}
                        />
                    ))}
                </div>
            </div>

            {error && (
                <Callout severity="danger" role="alert" dataTestId="appearance-error">
                    {error}
                </Callout>
            )}

            <div className="flex items-center gap-2">
                <ProgressButton
                    title="Save"
                    inProgress={isUpdating}
                    type="button"
                    onClick={onSave}
                    disabled={isReadOnly || isReadingLogo || hasInvalidColor || !isDirty}
                    dataTestId="appearance-save"
                />
                <Button
                    variant="outline"
                    color="secondary"
                    disabled={isReadOnly}
                    onClick={() => setIsResetDialogOpen(true)}
                    data-testid="appearance-reset"
                >
                    Reset to Default
                </Button>
            </div>

            <Dialog
                isOpen={isContrastDialogOpen}
                toggle={() => setIsContrastDialogOpen(false)}
                caption="Contrast check"
                // Dialog paints its own `warning` icon in the danger colour, which is not what this dialog says.
                icon={
                    findingGroups.length > 0 ? (
                        <TriangleAlert size={26} strokeWidth={1} className="text-warning" data-testid="appearance-contrast-dialog-icon" />
                    ) : (
                        'check'
                    )
                }
                size="lg"
                dataTestId="appearance-contrast-dialog"
                body={
                    <div className="space-y-3">
                        {/* On the boxes' surface for the same reason the legend is: left on the dialog's own chrome it
                            would render in content-muted on surface-raised, which is one of the pairings measured
                            below - so the sentence saying a colour is hard to read could be the proof of it. It also
                            changes in place while the boxes unmount, which only a live region tells a reader about. */}
                        <Callout
                            ref={contrastLeadRef}
                            severity={findingGroups.length > 0 ? 'warning' : 'success'}
                            role="status"
                            tabIndex={-1}
                            dataTestId="appearance-contrast-lead"
                        >
                            {findingGroups.length > 0 ? CONTRAST_LEAD : CONTRAST_CLEARED}
                        </Callout>
                        <div className="space-y-2" data-testid="appearance-contrast-findings">
                            {findingGroups.map(({ category, severity, findings }) => {
                                const field = category === 'logo' ? undefined : COLOR_FIELD_BY_CATEGORY[category];
                                const label = field?.label ?? LOGO_GROUP_LABEL;
                                const suggestion = suggestions[category];
                                const isAdvisory = severity === 'info';
                                // The warning tint is the only unbranded one, so an advisory keeps the surface and
                                // says what it is through the icon and the missing accent instead.
                                const Icon = isAdvisory ? Info : TriangleAlert;

                                return (
                                    <Callout
                                        key={category}
                                        severity="warning"
                                        dataTestId={`appearance-contrast-${category}`}
                                        className={cn('flex items-start gap-3 border border-divider shadow-sm', {
                                            'border-l-4 border-l-warning-solid': !isAdvisory,
                                        })}
                                    >
                                        <Icon
                                            size={16}
                                            aria-hidden="true"
                                            className="mt-0.5 shrink-0"
                                            data-testid={`appearance-contrast-${category}-icon`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold" id={`appearance-contrast-${category}-label`}>
                                                {label}
                                            </p>
                                            {/* Named by its heading: the field to change is the box's, so a reader
                                                stepping through the list would otherwise hear every consequence and
                                                never the field. */}
                                            <ul className="mt-1 space-y-1.5" aria-labelledby={`appearance-contrast-${category}-label`}>
                                                {findings.map(({ message, detail }) => (
                                                    <li key={message}>
                                                        {message}
                                                        {detail && <span className="mt-0.5 block text-xs">{detail}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                            {suggestion && field && (
                                                <button
                                                    type="button"
                                                    className="mt-2 inline-flex items-center gap-2 rounded-md border border-warning px-2 py-1 text-xs font-medium hover:border-warning-solid"
                                                    onClick={() => onSuggestionTaken(field.key, suggestion)}
                                                    // Named for the same reason the list above is: several boxes carry
                                                    // one of these, and the shade alone does not say which field it is
                                                    // for. The visible text opens the name so that saying what is on
                                                    // screen still activates it.
                                                    aria-label={`Use ${suggestion} instead for ${label}`}
                                                    data-testid={`appearance-contrast-fix-${category}`}
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="size-3 rounded-full border border-divider"
                                                        style={{ background: suggestion }}
                                                    />
                                                    Use {suggestion} instead
                                                </button>
                                            )}
                                        </div>
                                    </Callout>
                                );
                            })}
                        </div>
                        {/* On the boxes' own surface rather than the dialog's: the dialog panel is branded chrome,
                            and a legend explaining the figures is no use painted in the colours they are about. It
                            goes with them, or a caution paragraph outlives the last figure it explains. */}
                        {findingGroups.length > 0 && (
                            <Callout severity="warning" className="text-xs" dataTestId="appearance-contrast-legend">
                                {CONTRAST_LEGEND}{' '}
                                <a href={CONTRAST_LEARN_MORE} target="_blank" rel="noopener noreferrer" className="underline">
                                    How WCAG measures contrast
                                </a>
                            </Callout>
                        )}
                    </div>
                }
                buttons={[
                    // "Anyway" has no referent once the boxes are gone, which a suggestion can do while this is open.
                    {
                        color: findingGroups.length > 0 ? 'warning' : 'primary',
                        body: findingGroups.length > 0 ? 'Save anyway' : 'Save',
                        onClick: onContrastConfirmed,
                    },
                    { color: 'secondary', variant: 'outline', body: 'Cancel', onClick: () => setIsContrastDialogOpen(false) },
                ]}
            />

            <Dialog
                isOpen={isResetDialogOpen}
                toggle={() => setIsResetDialogOpen(false)}
                caption="Reset branding to default"
                icon="warning"
                dataTestId="appearance-reset-dialog"
                body={RESET_CONFIRMATION}
                buttons={[
                    { color: 'danger', body: 'Reset', onClick: onResetConfirmed },
                    { color: 'secondary', variant: 'outline', body: 'Cancel', onClick: () => setIsResetDialogOpen(false) },
                ]}
            />
        </div>
    );
}

export default AppearanceSettings;
