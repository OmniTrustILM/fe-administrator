import AttributeEditor from 'components/Attributes/AttributeEditor';
import Badge, { type BadgeColor } from 'components/Badge';
import Button from 'components/Button';
import Callout from 'components/Callout';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import RetryCallout from 'components/RetryCallout';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import Tooltip from 'components/Tooltip';
import WizardSection from 'components/_pages/certificates/ImportWizard/WizardSection';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as tokenKeysActions, selectors as tokenKeysSelectors } from 'ducks/token-keys';
import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { transformAttributeRequestModelToDto } from 'ducks/transform/attributes';
import { type ReactNode, useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { type FieldValues, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
    type MetadataAttribute,
    PlatformEnum,
    Resource,
    type TokenKeyDto,
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
 * The label names the pair in its onboarding result, whichever page it was picked on. The name is set only once the
 * user types one, since Core names the key otherwise.
 */
type Selection = Readonly<{ keyPairMeta: MetadataAttribute[]; label: string | undefined; name?: string }>;

type SelectionsByHandle = Record<string, Selection>;

type SelectionCells = [select: ReactNode, name: ReactNode];

const KEY_CUSTOM_ATTRIBUTES_ID = 'customOnboardKey';

const statusColors: Record<TokenKeyStatus, BadgeColor> = {
    [TokenKeyStatus.Onboardable]: 'success',
    [TokenKeyStatus.OnboardableIntoKey]: 'success',
    [TokenKeyStatus.InInventory]: 'gray',
    [TokenKeyStatus.InInventoryWithoutToken]: 'warning',
    [TokenKeyStatus.ImportInProgress]: 'gray',
    [TokenKeyStatus.NoPublicKey]: 'danger',
    [TokenKeyStatus.NoUsableId]: 'danger',
    [TokenKeyStatus.UnsupportedKeyType]: 'danger',
    [TokenKeyStatus.Unreadable]: 'danger',
    [TokenKeyStatus.Gone]: 'gray',
};

const headers: TableHeader[] = [
    { id: 'select', content: '', width: '5%' },
    { id: 'label', content: 'Label' },
    { id: 'algorithm', content: 'Algorithm' },
    { id: 'length', content: 'Length' },
    { id: 'status', content: 'Status' },
    { id: 'name', content: 'Onboard as' },
];

/** The FE's own key for a pair across listings and in its onboarding result: each metadata name with its data, in name order. */
function handleOf(keyPairMeta: readonly MetadataAttribute[]): string {
    const dataByName = keyPairMeta.map((attribute) => [attribute.name, (attribute.content ?? []).map((item) => item.data)] as const);
    return JSON.stringify([...dataByName].sort(([name], [other]) => (name < other ? -1 : 1)));
}

/** The prefixes keep a handle-less row's id apart from every handle's. */
function rowId(handle: string | undefined, index: number): string {
    return handle === undefined ? `unidentified-${index}` : `handle-${handle}`;
}

function unselectableCells(shownLabel: string): SelectionCells {
    return [<input key="select" type="checkbox" aria-label={`Select ${shownLabel}`} checked={false} disabled />, ''];
}

/**
 * A pair's reason shows on hovering its status, so the column holds only statuses and the keys holding pairs.
 * The reason opens to the right, clear of the statuses below.
 */
function statusCell(key: TokenKeyDto, statusLabel: string): ReactNode {
    const badge = <Badge color={statusColors[key.status]}>{statusLabel}</Badge>;
    return (
        <span key="status" className="flex flex-wrap items-center gap-2">
            {key.reason ? (
                <Tooltip content={key.reason} placement="right">
                    <span className="cursor-help">
                        {badge}
                        <span className="sr-only">{key.reason}</span>
                    </span>
                </Tooltip>
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

function withoutOnboarded(selections: SelectionsByHandle, results: TokenKeyOnboardingResultDto[]): SelectionsByHandle {
    const onboarded = new Set(results.filter((result) => result.onboarded).map((result) => handleOf(result.keyPairMeta)));
    return Object.fromEntries(Object.entries(selections).filter(([handle]) => !onboarded.has(handle)));
}

function describeResult(result: TokenKeyOnboardingResultDto): string {
    if (!result.onboarded) return result.reason ?? '';
    if (!result.intoExistingKey) return `onboarded as ${result.keyName}`;
    return result.keyName ? `private key added to key ${result.keyName}` : 'private key added to an existing key';
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
                            onChange={(value) => setProfile(profiles.find((each) => each.uuid === value))}
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

/** Lists the key pairs in one profile's key storage and onboards the selected ones. */
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
    // The results name their pairs from what was sent, since the onboarded pairs leave the selection.
    const [sentSelections, setSentSelections] = useState<SelectionsByHandle>({});
    const tokenInstanceUuid = profile.tokenInstanceUuid;
    const tokenProfileUuid = profile.uuid;

    const listPage = useCallback(() => {
        dispatch(tokenKeysActions.listTokenKeys({ tokenInstanceUuid, tokenProfileUuid, pageNumber, itemsPerPage }));
    }, [dispatch, tokenInstanceUuid, tokenProfileUuid, pageNumber, itemsPerPage]);

    useEffect(() => {
        listPage();
    }, [listPage]);

    const onOnboardingFinished = useEffectEvent((finished: TokenKeyOnboardingResultDto[]) => {
        setSelections((current) => withoutOnboarded(current, finished));
        listPage();
    });

    useEffect(() => {
        if (results) onOnboardingFinished(results);
    }, [results]);

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
            return { ...current, [handle]: { keyPairMeta, label: key.label } };
        });
    }, []);

    const rename = useCallback((handle: string, name: string) => {
        setSelections((current) => {
            const selection = current[handle];
            return selection === undefined ? current : { ...current, [handle]: { ...selection, name } };
        });
    }, []);

    const onboard = useCallback(
        (values: FieldValues) => {
            const customAttributes = collectFormAttributes(KEY_CUSTOM_ATTRIBUTES_ID, keyCustomAttributeDescriptors, values).map(
                transformAttributeRequestModelToDto,
            );
            const keys = Object.values(selections).map(({ keyPairMeta, name }) => ({ keyPairMeta, name }));
            setSentSelections(selections);
            dispatch(tokenKeysActions.onboardTokenKeys({ tokenInstanceUuid, tokenProfileUuid, keys, customAttributes }));
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
                    onChange={(newName) => rename(handle, newName)}
                />
            );
        };

        const selectionCells = (key: TokenKeyDto, keyPairMeta: MetadataAttribute[], shownLabel: string): SelectionCells => {
            const handle = handleOf(keyPairMeta);
            const selection = selections[handle];
            const selected = selection !== undefined;
            const canToggle = selected || isOnboardable(key.status);
            return [
                <input
                    key="select"
                    type="checkbox"
                    aria-label={`Select ${shownLabel}`}
                    checked={selected}
                    disabled={!canToggle}
                    onChange={() => toggle(key, keyPairMeta, handle)}
                />,
                selected ? nameCell(key, handle, shownLabel, selection) : '',
            ];
        };

        return (tokenKeys?.items ?? []).map((key, index) => {
            const shownLabel = key.label ?? key.fingerprint ?? '';
            const [select, name] =
                key.keyPairMeta === undefined ? unselectableCells(shownLabel) : selectionCells(key, key.keyPairMeta, shownLabel);
            return {
                id: rowId(key.keyPairMeta && handleOf(key.keyPairMeta), index),
                columns: [
                    select,
                    key.label ?? '',
                    key.keyAlgorithm ? getEnumLabel(algorithmEnum, key.keyAlgorithm) : '',
                    key.length?.toString() ?? '',
                    statusCell(key, getEnumLabel(statusEnum, key.status)),
                    name,
                ],
            };
        });
    }, [tokenKeys, selections, statusEnum, algorithmEnum, toggle, rename]);

    const selectedCount = Object.keys(selections).length;
    const onboardLabel = selectedCount > 0 ? `Onboard ${selectedCount}` : 'Onboard';
    const anyOnboarded = (results ?? []).some((result) => result.onboarded);
    // A failed listing leaves required custom attributes unasked, so onboarding waits for it.
    const canOnboard = selectedCount > 0 && !isOnboarding && !isListingKeyCustomAttributes && !keyCustomAttributesError;

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
            {results && results.length > 0 && (
                <ul className="space-y-1 text-sm" aria-label="Onboarding results">
                    {results.map((result, index) => {
                        const handle = handleOf(result.keyPairMeta);
                        const label = sentSelections[handle]?.label;
                        const outcome = describeResult(result);
                        return (
                            <li key={`${index}-${handle}`} className={result.onboarded ? 'text-content' : 'text-warning'}>
                                {label ? `${label}: ${outcome}` : outcome}
                            </li>
                        );
                    })}
                </ul>
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
                    {isOnboarding ? 'Onboarding...' : onboardLabel}
                </Button>
            </div>
        </>
    );
}
