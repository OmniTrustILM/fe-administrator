import AttributeEditor from 'components/Attributes/AttributeEditor';
import Badge, { type BadgeColor } from 'components/Badge';
import Button from 'components/Button';
import Callout from 'components/Callout';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import RetryCallout from 'components/RetryCallout';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import Toggletip from 'components/Toggletip';
import WizardSection from 'components/_pages/certificates/ImportWizard/WizardSection';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as tokenKeysActions, selectors as tokenKeysSelectors } from 'ducks/token-keys';
import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { transformAttributeRequestModelToDto } from 'ducks/transform/attributes';
import { explanationOf, handleOf, isOnboarded } from 'ducks/transform/token-keys';
import { type ReactNode, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { type FieldValues, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
    type MetadataAttribute,
    PlatformEnum,
    Resource,
    type TokenKeyDto,
    TokenKeyOnboardingOutcome,
    type TokenKeyOnboardingResultDto,
    TokenKeyStatus,
    type TokenProfileDto,
} from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';

type Props = Readonly<{
    onCancel: () => void;
    onDone: () => void;
}>;

/**
 * A selection keeps its pair as last listed, so a pair picked on another page still names its onboarding result.
 * The name is set once the user types one, and the name conflict holds the last onboarding's verdict on that name.
 */
type Selection = Readonly<{ keyPairMeta: MetadataAttribute[]; listed: TokenKeyDto; name?: string; nameConflict?: string }>;

type SelectionsByHandle = Record<string, Selection>;

type NamesByHandle = Record<string, string | undefined>;

type SelectionCells = [select: ReactNode, name: ReactNode];

const KEY_CUSTOM_ATTRIBUTES_ID = 'customOnboardKey';

const statusColors: Record<TokenKeyStatus, BadgeColor> = {
    [TokenKeyStatus.Onboardable]: 'success',
    [TokenKeyStatus.OnboardableIntoKey]: 'success',
    [TokenKeyStatus.InInventory]: 'gray',
    [TokenKeyStatus.InInventoryWithoutToken]: 'warning',
    [TokenKeyStatus.ImportInProgress]: 'gray',
    [TokenKeyStatus.PublicKeyUnavailable]: 'danger',
    [TokenKeyStatus.Unaddressable]: 'danger',
    [TokenKeyStatus.Refused]: 'danger',
    [TokenKeyStatus.UnsupportedKeyType]: 'danger',
    [TokenKeyStatus.Unreadable]: 'danger',
    [TokenKeyStatus.Gone]: 'gray',
};

const headers: TableHeader[] = [
    { id: 'select', content: '', width: '5%' },
    { id: 'storageName', content: 'Storage name' },
    { id: 'algorithm', content: 'Algorithm' },
    { id: 'length', content: 'Size' },
    { id: 'status', content: 'Status' },
    { id: 'name', content: 'Onboard as' },
];

/** The prefixes keep a handle-less row's id apart from every handle's. */
function rowId(handle: string | undefined, index: number): string {
    return handle === undefined ? `unidentified-${index}` : `handle-${handle}`;
}

const unselectableCells: SelectionCells = ['', ''];

/** A storage name is optional. A pair without one goes by its fingerprint. */
function captionOf(key: TokenKeyDto): string {
    return key.storageName || key.fingerprint || '';
}

/** The fingerprint is muted to set it apart from a storage name. */
function storageNameCell(key: TokenKeyDto): ReactNode {
    if (key.storageName) return key.storageName;
    if (!key.fingerprint) return '';
    return (
        <span key="fingerprint" className="break-all text-content-muted">
            {key.fingerprint}
        </span>
    );
}

/**
 * A listed entry's explanation opens from its status on hover, tap or Enter, so the column holds only statuses and the keys holding pairs.
 * The explanation opens to the right, clear of the statuses below.
 */
function statusCell(key: TokenKeyDto, statusLabel: string): ReactNode {
    const badge = <Badge color={statusColors[key.status]}>{statusLabel}</Badge>;
    const explanation = explanationOf(key);
    return (
        <span key="status" className="flex flex-wrap items-center gap-2">
            {explanation.length > 0 ? (
                <Toggletip
                    ariaLabel={[statusLabel, ...explanation].join(' ')}
                    triggerContent={badge}
                    triggerClassName="cursor-help"
                    content={explanation.map((line) => (
                        <span key={line} className="block">
                            {line}
                        </span>
                    ))}
                    placement="right"
                />
            ) : (
                badge
            )}
            {key.inventoryKeyName && <span className="text-sm text-content-muted">{key.inventoryKeyName}</span>}
        </span>
    );
}

function isOnboardable(status: TokenKeyStatus): boolean {
    return status === TokenKeyStatus.Onboardable || status === TokenKeyStatus.OnboardableIntoKey;
}

/** Every result except an onboarded one keeps its pair selected, with the name conflict that result implies. */
function withOnboardingResults(
    selections: SelectionsByHandle,
    results: TokenKeyOnboardingResultDto[],
    sentNames: NamesByHandle,
): SelectionsByHandle {
    const resultsByHandle = new Map(results.map((result) => [handleOf(result.keyPairMeta), result]));
    const remaining: SelectionsByHandle = {};
    for (const [handle, selection] of Object.entries(selections)) {
        const result = resultsByHandle.get(handle);
        if (result === undefined) {
            remaining[handle] = selection;
        } else if (!isOnboarded(result)) {
            const holdsSentName = nameToSend(selection) === sentNames[handle];
            remaining[handle] = { ...selection, nameConflict: holdsSentName ? nameConflictOf(result) : undefined };
        }
    }
    return remaining;
}

const UNEXPLAINED_NAME_CONFLICT = 'Another key already has this name.';

function nameConflictOf(result: TokenKeyOnboardingResultDto): string | undefined {
    if (result.outcome !== TokenKeyOnboardingOutcome.NameTaken) return undefined;
    return result.reason || UNEXPLAINED_NAME_CONFLICT;
}

function withRelisted(selections: SelectionsByHandle, keys: readonly TokenKeyDto[]): SelectionsByHandle {
    const relisted: SelectionsByHandle = {};
    for (const key of keys) {
        if (key.keyPairMeta === undefined) continue;
        const handle = handleOf(key.keyPairMeta);
        const selection = selections[handle];
        if (selection !== undefined) relisted[handle] = { ...selection, listed: key };
    }
    if (Object.keys(relisted).length === 0) return selections;
    return Object.fromEntries(
        Object.entries({ ...selections, ...relisted }).filter(([, selection]) => isOnboardable(selection.listed.status)),
    );
}

/**
 * Only a name the user typed is sent. Without one, Core picks an unused name when it onboards the pair.
 * A pair that joins an existing key keeps that key's name, so it sends none.
 */
function nameToSend({ listed, name }: Selection): string | undefined {
    return listed.status === TokenKeyStatus.OnboardableIntoKey ? undefined : name;
}

/** Onboards the key pairs a token already holds, picked from the listing of a profile whose connector lists keys. */
export default function OnboardFromToken({ onCancel, onDone }: Props) {
    const dispatch = useDispatch();
    const keyListableProfiles = useSelector(tokenProfilesSelectors.keyListableTokenProfiles);
    const profiles = useMemo(() => keyListableProfiles.filter((each) => each.enabled), [keyListableProfiles]);
    const profilesListed = useSelector(tokenProfilesSelectors.isKeyListableTokenProfilesListed);
    const profilesError = useSelector(tokenProfilesSelectors.keyListableTokenProfilesError);
    const isOnboarding = useSelector(tokenKeysSelectors.isOnboardingTokenKeys);
    const [profile, setProfile] = useState<TokenProfileDto>();
    const methods = useForm({ mode: 'onChange' });

    const listProfiles = useCallback(() => {
        dispatch(tokenProfilesActions.listKeyListableTokenProfiles());
    }, [dispatch]);

    const listKeyCustomAttributes = useCallback(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Keys));
    }, [dispatch]);

    useEffect(() => {
        listProfiles();
    }, [listProfiles]);

    useEffect(() => {
        listKeyCustomAttributes();
    }, [listKeyCustomAttributes]);

    const switchProfile = useCallback(
        (uuid: unknown) => {
            if (uuid === profile?.uuid) return;
            // The old form's cleanup clears the store only after the new form has rendered.
            // That form would otherwise show the old rows, and the old results would make it list a second time.
            dispatch(tokenKeysActions.clearTokenKeys());
            setProfile(profiles.find((each) => each.uuid === uuid));
        },
        [dispatch, profile, profiles],
    );

    const options = useMemo(
        () => profiles.map((each) => ({ value: each.uuid, label: `${each.tokenInstanceName} / ${each.name}` })),
        [profiles],
    );

    let profileNote: ReactNode;
    if (profilesError) {
        profileNote = (
            <div className="mt-2">
                <RetryCallout message={profilesError} onRetry={listProfiles} />
            </div>
        );
    } else if (profilesListed && profiles.length === 0) {
        profileNote = (
            <Callout severity="warning" className="mt-2">
                No enabled token profile lists the keys in its key storage.
            </Callout>
        );
    }

    return (
        <FormProvider {...methods}>
            <div className="space-y-6">
                <p className="text-sm text-content-muted">Onboarded keys stay in the key storage.</p>
                <WizardSection id="onboardTokenProfile" title="Token profile">
                    <div>
                        <Select
                            id="onboardTokenProfileSelect"
                            label="Token profile"
                            value={profile?.uuid ?? ''}
                            options={options}
                            placeholder="Select token profile"
                            placement="bottom"
                            isDisabled={isOnboarding}
                            onChange={switchProfile}
                        />
                        {profileNote}
                    </div>
                </WizardSection>
                {profile ? (
                    <ProfileOnboarding
                        key={profile.uuid}
                        profile={profile}
                        onRetryKeyCustomAttributes={listKeyCustomAttributes}
                        onCancel={onCancel}
                        onDone={onDone}
                    />
                ) : (
                    <div className="flex justify-end">
                        <Button variant="outline" type="button" onClick={onCancel}>
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </FormProvider>
    );
}

type ProfileOnboardingProps = Readonly<{
    profile: TokenProfileDto;
    onRetryKeyCustomAttributes: () => void;
    onCancel: () => void;
    onDone: () => void;
}>;

function ProfileOnboarding({ profile, onRetryKeyCustomAttributes, onCancel, onDone }: ProfileOnboardingProps) {
    const dispatch = useDispatch();
    const { handleSubmit } = useFormContext();
    const tokenKeys = useSelector(tokenKeysSelectors.tokenKeys);
    const listingError = useSelector(tokenKeysSelectors.tokenKeysError);
    const isListing = useSelector(tokenKeysSelectors.isListingTokenKeys);
    const isOnboarding = useSelector(tokenKeysSelectors.isOnboardingTokenKeys);
    const results = useSelector(tokenKeysSelectors.tokenKeyOnboardingResults);
    const keyCustomAttributeDescriptors = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const keyCustomAttributesError = useSelector(customAttributesSelectors.resourceCustomAttributesError);
    const isListingKeyCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const statusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TokenKeyStatus));
    const algorithmEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyAlgorithm));
    const [pageNumber, setPageNumber] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selections, setSelections] = useState<SelectionsByHandle>({});
    // A name typed while the onboarding runs is a new attempt, so Core's verdict on the sent name leaves it unflagged.
    const sentNames = useRef<NamesByHandle>({});
    const tokenInstanceUuid = profile.tokenInstanceUuid;
    const tokenProfileUuid = profile.uuid;

    const listPage = useCallback(() => {
        dispatch(tokenKeysActions.listTokenKeys({ tokenInstanceUuid, tokenProfileUuid, pageNumber, itemsPerPage }));
    }, [dispatch, tokenInstanceUuid, tokenProfileUuid, pageNumber, itemsPerPage]);

    useEffect(() => {
        listPage();
    }, [listPage]);

    const onOnboardingFinished = useEffectEvent((finished: TokenKeyOnboardingResultDto[]) => {
        setSelections((current) => withOnboardingResults(current, finished, sentNames.current));
        listPage();
    });

    useEffect(() => {
        if (results) onOnboardingFinished(results);
    }, [results]);

    useEffect(() => {
        setSelections((current) => withRelisted(current, tokenKeys?.items ?? []));
    }, [tokenKeys]);

    useEffect(
        () => () => {
            dispatch(tokenKeysActions.clearTokenKeys());
        },
        [dispatch],
    );

    const toggle = useCallback((key: TokenKeyDto, keyPairMeta: MetadataAttribute[], handle: string) => {
        setSelections((current) => {
            const { [handle]: previous, ...rest } = current;
            if (previous !== undefined) return rest;
            return { ...current, [handle]: { keyPairMeta, listed: key } };
        });
    }, []);

    const rename = useCallback((handle: string, name: string) => {
        setSelections((current) => {
            const selection = current[handle];
            return selection === undefined ? current : { ...current, [handle]: { ...selection, name, nameConflict: undefined } };
        });
    }, []);

    const onboard = useCallback(
        (values: FieldValues) => {
            const customAttributes = collectFormAttributes(KEY_CUSTOM_ATTRIBUTES_ID, keyCustomAttributeDescriptors, values).map(
                transformAttributeRequestModelToDto,
            );
            const keys = Object.values(selections).map((selection) => ({
                keyPairMeta: selection.keyPairMeta,
                name: nameToSend(selection),
            }));
            const captions = Object.fromEntries(Object.entries(selections).map(([handle, { listed }]) => [handle, captionOf(listed)]));
            sentNames.current = Object.fromEntries(
                Object.entries(selections).map(([handle, selection]) => [handle, nameToSend(selection)]),
            );
            dispatch(tokenKeysActions.onboardTokenKeys({ tokenInstanceUuid, tokenProfileUuid, keys, captions, customAttributes }));
        },
        [dispatch, selections, keyCustomAttributeDescriptors, tokenInstanceUuid, tokenProfileUuid],
    );

    const rows: TableDataRow[] = useMemo(() => {
        const nameCell = (key: TokenKeyDto, handle: string, shownLabel: string, selection: Selection): ReactNode => {
            if (key.status === TokenKeyStatus.OnboardableIntoKey) {
                return <span className="text-sm">{`Into ${key.inventoryKeyName ?? 'the existing key'}`}</span>;
            }
            return (
                <TextInput
                    key="name"
                    ariaLabel={`Name for ${shownLabel}`}
                    value={selection.name ?? key.suggestedName ?? ''}
                    invalid={selection.nameConflict !== undefined}
                    error={selection.nameConflict}
                    onChange={(newName) => rename(handle, newName)}
                />
            );
        };

        const selectionCells = (key: TokenKeyDto, keyPairMeta: MetadataAttribute[], shownLabel: string): SelectionCells => {
            const handle = handleOf(keyPairMeta);
            const selection = selections[handle];
            const selected = selection !== undefined;
            return [
                <input
                    key="select"
                    type="checkbox"
                    aria-label={`Select ${shownLabel}`}
                    checked={selected}
                    onChange={() => toggle(key, keyPairMeta, handle)}
                />,
                selected ? nameCell(key, handle, shownLabel, selection) : '',
            ];
        };

        return (tokenKeys?.items ?? []).map((key, index) => {
            const shownLabel = captionOf(key);
            const [select, name] =
                key.keyPairMeta === undefined || !isOnboardable(key.status)
                    ? unselectableCells
                    : selectionCells(key, key.keyPairMeta, shownLabel);
            return {
                id: rowId(key.keyPairMeta && handleOf(key.keyPairMeta), index),
                columns: [
                    select,
                    storageNameCell(key),
                    key.keyAlgorithm ? getEnumLabel(algorithmEnum, key.keyAlgorithm) : '',
                    key.length?.toString() ?? '',
                    statusCell(key, getEnumLabel(statusEnum, key.status)),
                    name,
                ],
            };
        });
    }, [tokenKeys, selections, statusEnum, algorithmEnum, toggle, rename]);

    const anySelected = Object.keys(selections).length > 0;
    const anyOnboarded = (results ?? []).some(isOnboarded);
    // A failed listing leaves required custom attributes unasked, so onboarding waits for it.
    const canOnboard = anySelected && !isOnboarding && !isListingKeyCustomAttributes && !keyCustomAttributesError;

    return (
        <>
            <WizardSection id="onboardKeyPairs" title="Key pairs in the key storage">
                {listingError ? (
                    <RetryCallout message={listingError} onRetry={listPage} />
                ) : (
                    <CustomTable
                        headers={headers}
                        data={rows}
                        hasPagination
                        isLoading={isListing}
                        paginationData={{
                            page: pageNumber,
                            pageSize: itemsPerPage,
                            loadedPageSize: itemsPerPage,
                            totalItems: tokenKeys?.totalItems ?? 0,
                            totalPages: tokenKeys?.totalPages ?? 0,
                        }}
                        onPageChanged={setPageNumber}
                        onPageSizeChanged={setItemsPerPage}
                        emptyStateDescription="The key storage holds no key pairs."
                    />
                )}
            </WizardSection>
            {(keyCustomAttributesError || keyCustomAttributeDescriptors.length > 0) && (
                <WizardSection id="onboardKeyCustomAttributes" title="Key custom attributes">
                    {keyCustomAttributesError ? (
                        <RetryCallout message={keyCustomAttributesError} onRetry={onRetryKeyCustomAttributes} />
                    ) : (
                        <AttributeEditor id={KEY_CUSTOM_ATTRIBUTES_ID} attributeDescriptors={keyCustomAttributeDescriptors} />
                    )}
                </WizardSection>
            )}
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" disabled={isOnboarding} onClick={onCancel}>
                    Cancel
                </Button>
                {anyOnboarded && (
                    <Button variant="outline" type="button" onClick={onDone}>
                        Done
                    </Button>
                )}
                <Button color="primary" type="button" disabled={!canOnboard} onClick={handleSubmit(onboard)}>
                    {isOnboarding ? 'Onboarding...' : 'Onboard'}
                </Button>
            </div>
        </>
    );
}
