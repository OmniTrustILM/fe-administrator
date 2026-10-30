import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';

import type { WidgetButtonProps } from 'components/WidgetButtons';

import type { ApiClients } from '../../../../api';
import PagedList from 'components/PagedList/PagedList';
import { selectors as certificateSelectors } from 'ducks/certificates';
import { actions, selectors } from 'ducks/cryptographic-keys';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as pagingActions, selectors as pagingSelectors } from 'ducks/paging';
import { selectors as tokenKeysSelectors } from 'ducks/token-keys';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import type { SearchRequestModel } from 'types/certificate';
import type { CryptographicKeyResponseModel } from 'types/cryptographic-keys';
import { KeyCompromiseReason, type KeyUsage, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { dateFormatter } from 'utils/dateUtil';
import KeyUsageSelect from '../KeyUsageSelect';
import { buildKeyCellRegistry, KEY_COLUMNS } from '../keyTableHelpers';
import { EnumColumnDescription } from 'components/EnumDescription';
import CryptographicKeyForm from '../form';
import { REMOVE_KEY_FROM_INVENTORY_NOTE, REMOVE_KEYS_FROM_INVENTORY_NOTE } from '../constants';

const removalReportHeaders: TableHeader[] = [
    { id: 'name', content: 'Name' },
    { id: 'reason', content: 'Reason' },
];

function keyCount(count: number) {
    return count === 1 ? '1 key' : `${count} keys`;
}

/** Removal from the inventory acts on the key each checked item belongs to. Core gives every item its key's flag. */
function removabilityOfCheckedKeys(items: CryptographicKeyResponseModel[], checkedItemUuids: string[]) {
    const removability = new Map<string, boolean>();
    for (const item of items) {
        if (checkedItemUuids.includes(item.uuid)) removability.set(item.keyWrapperUuid, item.removableFromInventory);
    }
    return removability;
}

function CryptographicKeyList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.KEY));
    const cryptographicKeys = useSelector(selectors.cryptographicKeys);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkUpdatingKeyUsage = useSelector(selectors.isBulkUpdatingKeyUsage);
    const isBulkCompromising = useSelector(selectors.isBulkCompromising);
    const isBulkDestroying = useSelector(selectors.isBulkDestroying);
    const isBulkRemovingFromInventory = useSelector(selectors.isBulkRemovingFromInventory);
    const bulkRemoveFromInventoryRequestSize = useSelector(selectors.bulkRemoveFromInventoryRequestSize);
    const failedRemovals = useSelector(selectors.bulkRemoveFromInventoryFailures);
    const isImporting = useSelector(certificateSelectors.isImporting);
    const importResults = useSelector(certificateSelectors.importResults);
    const isOnboarding = useSelector(tokenKeysSelectors.isOnboardingTokenKeys);
    const onboardingResults = useSelector(tokenKeysSelectors.tokenKeyOnboardingResults);

    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));
    const keyTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyType));
    const keyCompromiseReasonEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyCompromiseReason));
    const isBusy =
        isBulkDeleting ||
        isBulkEnabling ||
        isBulkDisabling ||
        isBulkUpdatingKeyUsage ||
        isBulkCompromising ||
        isBulkDestroying ||
        isBulkRemovingFromInventory;

    const [confirmCompromise, setConfirmCompromise] = useState<boolean>(false);

    const [confirmDestroy, setConfirmDestroy] = useState<boolean>(false);

    const [keyUsageUpdate, setKeyUsageUpdate] = useState<boolean>(false);

    const [keyUsages, setKeyUsages] = useState<KeyUsage[]>([]);

    const [compromiseReason, setCompromiseReason] = useState<KeyCompromiseReason>();

    const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

    const [isAddDialogWide, setIsAddDialogWide] = useState<boolean>(false);

    const [confirmRemoveFromInventory, setConfirmRemoveFromInventory] = useState<boolean>(false);

    const [isRemovalReportOpen, setIsRemovalReportOpen] = useState<boolean>(false);

    const checkedKeyRemovability = useMemo(
        () => removabilityOfCheckedKeys(cryptographicKeys, checkedRows),
        [cryptographicKeys, checkedRows],
    );
    const removableKeyUuids = useMemo(
        () => [...checkedKeyRemovability].filter(([, removable]) => removable).map(([keyUuid]) => keyUuid),
        [checkedKeyRemovability],
    );
    const keptKeyCount = checkedKeyRemovability.size - removableKeyUuids.length;

    useEffect(() => {
        dispatch(actions.clearDeleteErrorMessages());
    }, [dispatch]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableCryptographicKeyItems({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableCryptographicKeyItems({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onUpdateKeyUsageConfirmed = useCallback(() => {
        dispatch(actions.bulkUpdateKeyItemUsage({ usage: { usage: keyUsages, uuids: checkedRows } }));
        setKeyUsageUpdate(false);
    }, [checkedRows, dispatch, keyUsages]);

    const onCompromise = useCallback(() => {
        if (!compromiseReason) return;
        dispatch(actions.bulkCompromiseCryptographicKeyItems({ request: { reason: compromiseReason, uuids: checkedRows } }));
        setConfirmCompromise(false);
    }, [checkedRows, dispatch, compromiseReason]);

    const onDestroy = useCallback(() => {
        dispatch(actions.bulkDestroyCryptographicKeyItems({ uuids: checkedRows }));
        setConfirmDestroy(false);
    }, [checkedRows, dispatch]);

    const onRemoveFromInventoryConfirmed = useCallback(() => {
        dispatch(actions.bulkRemoveKeysFromInventory({ uuids: removableKeyUuids }));
        setConfirmRemoveFromInventory(false);
    }, [removableKeyUuids, dispatch]);

    const buttons: WidgetButtonProps[] = [
        {
            icon: 'plus',
            tooltip: 'Create Key',
            disabled: false,
            onClick: () => {
                setIsAddDialogWide(false);
                setIsAddOpen(true);
            },
        },
        {
            icon: 'check',
            disabled: checkedRows.length === 0,
            tooltip: 'Enable',
            onClick: () => {
                onEnableClick();
            },
        },
        {
            icon: 'times',
            disabled: checkedRows.length === 0,
            tooltip: 'Disable',
            onClick: () => {
                onDisableClick();
            },
        },
        {
            icon: 'key',
            disabled: checkedRows.length === 0,
            tooltip: 'Update Key Usage',
            onClick: () => {
                setKeyUsageUpdate(true);
            },
        },
        {
            icon: 'compromise',
            disabled: checkedRows.length === 0,
            tooltip: 'Compromise',
            onClick: () => {
                setConfirmCompromise(true);
            },
        },
        {
            icon: 'destroy',
            disabled: checkedRows.length === 0,
            tooltip: 'Destroy',
            onClick: () => {
                setConfirmDestroy(true);
            },
        },
        {
            icon: 'package-minus',
            disabled: isBusy || removableKeyUuids.length === 0,
            tooltip: 'Remove from inventory',
            disabledTooltip: removableKeyUuids.length === 0 ? 'Select at least one key that can be removed from the inventory' : undefined,
            'aria-label': 'Remove from inventory',
            onClick: () => {
                setConfirmRemoveFromInventory(true);
            },
        },
    ];

    const registry = useMemo(
        () => buildKeyCellRegistry({ keyTypeEnum, keyUsageEnum, getEnumLabel, dateFormatter }),
        [keyTypeEnum, keyUsageEnum],
    );

    // Beside the headings rather than inside them: a sortable heading is itself a button.
    const headerInfo = useMemo(
        () => ({
            'property:CKI_TYPE': <EnumColumnDescription platformEnum={PlatformEnum.KeyType} title="Type" />,
            'property:CKI_CRYPTOGRAPHIC_ALGORITHM': <EnumColumnDescription platformEnum={PlatformEnum.KeyAlgorithm} title="Algorithm" />,
            'property:CKI_FORMAT': <EnumColumnDescription platformEnum={PlatformEnum.KeyFormat} title="Format" />,
        }),
        [],
    );

    // Memoised because the host refetches when the config's parts change.
    const configurableColumns = useMemo(
        () => ({
            resource: Resource.Keys,
            standardColumns: KEY_COLUMNS,
            rows: cryptographicKeys,
            getRowId: (item: CryptographicKeyResponseModel) => item.uuid,
            registry,
            headerInfo,
        }),
        [cryptographicKeys, registry, headerInfo],
    );

    const optionForCompromise = useMemo(() => {
        const options = [];
        if (keyCompromiseReasonEnum) {
            for (const reason in KeyCompromiseReason) {
                const myReason: KeyCompromiseReason = KeyCompromiseReason[reason as keyof typeof KeyCompromiseReason];
                options.push({ value: myReason, label: getEnumLabel(keyCompromiseReasonEnum, myReason) });
            }
        }
        return options;
    }, [keyCompromiseReasonEnum]);

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(actions.listCryptographicKeys(filters)), [dispatch]);

    // Back to an unfiltered first page, so the key just created is on it. The token is what guarantees
    // the refetch: from an already unfiltered first page the resets below change nothing.
    const [refreshToken, setRefreshToken] = useState(0);
    const refreshList = useCallback(() => setRefreshToken((token) => token + 1), []);

    const handleFormSuccess = useCallback(() => {
        setIsAddOpen(false);
        dispatch(filterActions.setCurrentFilters({ entity: EntityType.KEY, currentFilters: [] }));
        dispatch(pagingActions.resetPaging({ entity: EntityType.KEY }));
        refreshList();
    }, [dispatch, refreshList]);

    // An import or an onboarding from the Create Key dialog is listed as soon as it succeeds, however the dialog is closed after it.
    useRunOnSuccessfulFinish(isImporting, !!importResults, refreshList);
    useRunOnSuccessfulFinish(isOnboarding, !!onboardingResults?.some((result) => result.onboarded), refreshList);

    const failedRemovalRows: TableDataRow[] = useMemo(
        () => (failedRemovals ?? []).map((failure) => ({ id: failure.uuid, columns: [failure.name, failure.message] })),
        [failedRemovals],
    );

    const onRemovedFromInventory = useCallback(() => {
        refreshList();
        setIsRemovalReportOpen(failedRemovalRows.length > 0);
    }, [failedRemovalRows, refreshList]);

    useRunOnSuccessfulFinish(isBulkRemovingFromInventory, failedRemovals !== undefined, onRemovedFromInventory);

    return (
        <>
            <PagedList
                entity={EntityType.KEY}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteCryptographicKeyItems({ uuids }))}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.cryptographicKeys.getCryptographicKeySearchableFields(),
                    [],
                )}
                additionalButtons={buttons}
                configurableColumns={configurableColumns}
                isBusy={isBusy}
                title="List of Keys"
                pageWidgetLockName={LockWidgetNameEnum.ListOfKeys}
                entityNameSingular="a Key"
                entityNamePlural="Keys"
                filterTitle="Key Inventory Filter"
                addHidden
                refreshToken={refreshToken}
            />
            <Dialog
                isOpen={isAddOpen}
                caption="Create Key"
                body={
                    <CryptographicKeyForm
                        onSuccess={handleFormSuccess}
                        onCancel={() => setIsAddOpen(false)}
                        onWideTabShown={setIsAddDialogWide}
                    />
                }
                toggle={() => {
                    // An import or an onboarding in flight is seen through to its results, so the dialog is not closed under it.
                    if (!isImporting && !isOnboarding) setIsAddOpen(false);
                }}
                size={isAddDialogWide ? 'xxl' : 'xl'}
                buttons={[]}
            />
            <Dialog
                isOpen={confirmCompromise}
                caption={`Compromise ${checkedRows.length > 1 ? 'Keys' : 'Key'}`}
                body={
                    <div>
                        <p className="text-center">You are about to mark the Key as compromised. Is this what you want to do?</p>
                        <p className="mt-2 mb-4 text-center">
                            <b>Warning:</b> This action cannot be undone.
                        </p>
                        <Select
                            id="compromiseReason"
                            options={optionForCompromise}
                            value={compromiseReason || ''}
                            onChange={(value) => setCompromiseReason(value as KeyCompromiseReason)}
                        />
                    </div>
                }
                toggle={() => setConfirmCompromise(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmCompromise(false), body: 'Cancel' },
                    { color: 'danger', onClick: onCompromise, body: 'Yes' },
                ]}
            />
            <Dialog
                isOpen={confirmDestroy}
                caption={`Destroy ${checkedRows.length > 1 ? 'Keys' : 'Key'}`}
                body={`You are about to destroy ${checkedRows.length > 1 ? 'a Key' : 'Keys'}. Is this what you want to do?`}
                toggle={() => setConfirmDestroy(false)}
                icon="destroy"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDestroy(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDestroy, body: 'Destroy' },
                ]}
            />
            <Dialog
                isOpen={confirmRemoveFromInventory}
                caption={removableKeyUuids.length > 1 ? 'Remove Keys from Inventory' : 'Remove Key from Inventory'}
                size="lg"
                body={
                    <div>
                        <p>{removableKeyUuids.length > 1 ? REMOVE_KEYS_FROM_INVENTORY_NOTE : REMOVE_KEY_FROM_INVENTORY_NOTE}</p>
                        <p className="mt-2">{keyCount(removableKeyUuids.length)} will be removed.</p>
                        {keptKeyCount > 0 && (
                            <p className="mt-2">
                                {keptKeyCount === 1
                                    ? '1 selected key cannot be removed from the inventory and is skipped.'
                                    : `${keptKeyCount} selected keys cannot be removed from the inventory and are skipped.`}
                            </p>
                        )}
                    </div>
                }
                toggle={() => setConfirmRemoveFromInventory(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmRemoveFromInventory(false), body: 'Cancel' },
                    { color: 'danger', onClick: onRemoveFromInventoryConfirmed, body: 'Remove' },
                ]}
            />
            <Dialog
                isOpen={isRemovalReportOpen}
                caption={`Removed ${bulkRemoveFromInventoryRequestSize - failedRemovalRows.length} of ${keyCount(bulkRemoveFromInventoryRequestSize)}`}
                size="lg"
                body={<CustomTable headers={removalReportHeaders} data={failedRemovalRows} />}
                toggle={() => setIsRemovalReportOpen(false)}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: () => setIsRemovalReportOpen(false), body: 'Close' }]}
            />
            <Dialog
                isOpen={keyUsageUpdate}
                caption="Update Key Usage"
                body={<KeyUsageSelect value={keyUsages} onChange={setKeyUsages} keyUsageEnum={keyUsageEnum} />}
                toggle={() => setKeyUsageUpdate(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setKeyUsageUpdate(false), body: 'Cancel' },
                    { color: 'primary', onClick: onUpdateKeyUsageConfirmed, body: 'Update' },
                ]}
            />
        </>
    );
}

export default CryptographicKeyList;
