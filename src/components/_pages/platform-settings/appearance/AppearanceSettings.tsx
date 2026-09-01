import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import { actions, selectors } from 'ducks/branding';
import type { BrandingSettingsModel, BrandingSettingsUpdateModel } from 'types/branding';
import { isBrandColor, readLogoFile } from 'utils/branding';
import ColorField from './ColorField';
import LogoSlot from './LogoSlot';

type ColorKey = 'primaryColor' | 'secondaryColor' | 'tertiaryColor' | 'backgroundColor' | 'textColor';
type LogoKey = 'lightLogo' | 'darkLogo';

const COLOR_FIELDS: ReadonlyArray<{ key: ColorKey; label: string; hint: string }> = [
    { key: 'primaryColor', label: 'Primary', hint: 'Buttons, links and active states' },
    { key: 'secondaryColor', label: 'Secondary', hint: 'Accents, chips and info badges' },
    { key: 'tertiaryColor', label: 'Tertiary', hint: 'Accents. Stored, not yet applied anywhere.' },
    { key: 'backgroundColor', label: 'Background', hint: 'Page background, light theme only' },
    { key: 'textColor', label: 'Text', hint: 'Body text and headings, light theme only' },
];

/**
 * Named in the form because it is the first thing an operator gets wrong: the five colours do not all reach both
 * themes, and none of them is inverted to produce the other. Background and Text are chosen against a light page, so
 * reusing them on a dark one is exactly what would break its readability.
 */
const COLOR_COMPOSITION =
    'Primary, Secondary and Tertiary apply to both the light and the dark theme. Background and Text apply to the light theme only - the dark theme keeps its own surfaces, and no color is inverted for it automatically.';

const LOGO_SLOTS: ReadonlyArray<{ key: LogoKey; label: string }> = [
    { key: 'lightLogo', label: 'Light Logo' },
    { key: 'darkLogo', label: 'Dark Logo' },
];

const LOGO_COMPOSITION = 'Each theme uses its own logo, so both are required. Neither slot falls back to the other.';

/**
 * Reset is an empty update, and Core clears every field left out of one, so the operator's default theme goes with the
 * colours and logos. Named here because nothing in this application can set it again.
 */
const RESET_CONFIRMATION =
    'This removes the configured colors, logos and default theme, and the instance returns to the platform default look. Continue?';

type Colors = Record<ColorKey, string>;
type LogoState = { dataUri?: string; fileName?: string; error?: string };
type Logos = Record<LogoKey, LogoState>;

const toColors = (branding?: BrandingSettingsModel): Colors => ({
    primaryColor: branding?.primaryColor ?? '',
    secondaryColor: branding?.secondaryColor ?? '',
    tertiaryColor: branding?.tertiaryColor ?? '',
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

    // Branding is saved whole or not at all. Core clears any field left out of an update, so a partial save is not a
    // partial brand but a brand with holes in it - a light logo and no dark one, or a background with no text colour
    // to sit on. Reset to Default is the way back to the platform look, not an emptied field.
    const missingFields = useMemo(
        () => [
            ...COLOR_FIELDS.filter(({ key }) => colors[key] === '').map(({ label }) => label),
            ...LOGO_SLOTS.filter(({ key }) => logos[key].dataUri === undefined).map(({ label }) => label),
        ],
        [colors, logos],
    );

    // A read that succeeds always leaves a value behind - a Core with nothing stored answers 404, which the epic maps
    // to an empty success - so an absent one means no read has landed. The form seeded from it is empty and looks
    // exactly like an unbranded instance, and since Core clears every field left out of a request, saving from it
    // would wipe the branding that is actually stored, `defaultTheme` included. There is no known-good state to edit
    // from until a read succeeds, so the tab stays read-only until one does.
    const hasKnownBranding = branding !== undefined;
    const isReadOnly = isBusy || !hasKnownBranding;

    const hasInvalidColor = useMemo(() => Object.values(colors).some((value) => value !== '' && !isBrandColor(value)), [colors]);

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
                        : { dataUri: result.dataUri, fileName: file.name, error: undefined },
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
        setLogos((current) => ({ ...current, [key]: { dataUri: undefined, fileName: undefined, error: undefined } }));
    }, []);

    const onSave = useCallback(() => {
        const update: BrandingSettingsUpdateModel = {
            // Carried through untouched. The tab does not edit it, and Core clears any field left out of the request,
            // so omitting it would wipe the operator's default theme on every save.
            defaultTheme: branding?.defaultTheme,
            lightLogo: logos.lightLogo.dataUri,
            darkLogo: logos.darkLogo.dataUri,
        };

        for (const { key } of COLOR_FIELDS) {
            update[key] = colors[key];
        }

        dispatch(actions.updateBranding({ branding: update }));
    }, [branding?.defaultTheme, colors, dispatch, logos]);

    const onResetConfirmed = useCallback(() => {
        setIsResetDialogOpen(false);
        dispatch(actions.resetBranding());
    }, [dispatch]);

    return (
        <div className="@container space-y-6 py-6" data-testid="appearance-settings">
            {!hasKnownBranding && !isFetching && (
                <p className="rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning" data-testid="appearance-unavailable">
                    The stored branding could not be read, so it cannot be changed here. Reload the page to try again.
                </p>
            )}

            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Colors</h3>
                <p className="text-sm text-content-muted" data-testid="appearance-color-composition">
                    {COLOR_COMPOSITION}
                </p>
                <div className="grid gap-4 @md:grid-cols-2">
                    {COLOR_FIELDS.map(({ key, label, hint }) => (
                        <ColorField
                            key={key}
                            id={key}
                            label={label}
                            hint={hint}
                            value={colors[key]}
                            disabled={isReadOnly}
                            required
                            onChange={(value) => onColorChange(key, value)}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Logos</h3>
                <p className="text-sm text-content-muted" data-testid="appearance-logo-composition">
                    {LOGO_COMPOSITION}
                </p>
                <div className="grid gap-6 @md:grid-cols-2">
                    {LOGO_SLOTS.map(({ key, label }) => (
                        <LogoSlot
                            key={key}
                            id={key}
                            label={label}
                            value={logos[key].dataUri}
                            fileName={logos[key].fileName}
                            error={logos[key].error}
                            disabled={isReadOnly}
                            required
                            onSelect={(file) => void onLogoSelect(key, file)}
                            onDelete={() => onLogoDelete(key)}
                        />
                    ))}
                </div>
            </div>

            {hasKnownBranding && missingFields.length > 0 && (
                <p className="rounded-lg bg-info-surface px-3 py-2 text-sm text-info" data-testid="appearance-incomplete">
                    Every color and both logos are required before branding can be saved. Still to fill in: {missingFields.join(', ')}.
                </p>
            )}

            {error && (
                <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger" role="alert" data-testid="appearance-error">
                    {error}
                </p>
            )}

            <div className="flex items-center gap-2">
                <ProgressButton
                    title="Save"
                    inProgress={isUpdating}
                    type="button"
                    onClick={onSave}
                    disabled={isReadOnly || isReadingLogo || hasInvalidColor || missingFields.length > 0 || !isDirty}
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
