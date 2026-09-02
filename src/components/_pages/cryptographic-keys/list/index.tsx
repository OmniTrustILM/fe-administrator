import Dialog from 'components/Dialog';

import type { WidgetButtonProps } from 'components/WidgetButtons';

import type { ApiClients } from '../../../../api';
import PagedList from 'components/PagedList/PagedList';
import { actions, selectors } from 'ducks/cryptographic-keys';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import type { SearchRequestModel } from 'types/certificate';
import type { CryptographicKeyResponseModel } from 'types/cryptographic-keys';
import { KeyCompromiseReason, type KeyUsage, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import KeyUsageSelect from '../KeyUsageSelect';
import { buildKeyCellRegistry, KEY_COLUMNS } from '../keyTableHelpers';
import { EnumColumnDescription } from 'components/EnumDescription';
import CryptographicKeyForm from '../form';

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

    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));
    const keyTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyType));
    const keyCompromiseReasonEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyCompromiseReason));
    const isBusy = isBulkDeleting || isBulkEnabling || isBulkDisabling || isBulkUpdatingKeyUsage || isBulkCompromising || isBulkDestroying;

    const [confirmCompromise, setConfirmCompromise] = useState<boolean>(false);

    const [confirmDestroy, setConfirmDestroy] = useState<boolean>(false);

    const [keyUsageUpdate, setKeyUsageUpdate] = useState<boolean>(false);

    const [keyUsages, setKeyUsages] = useState<KeyUsage[]>([]);

    const [compromiseReason, setCompromiseReason] = useState<KeyCompromiseReason>();

    const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

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

    const buttons: WidgetButtonProps[] = [
        {
            icon: 'plus',
            tooltip: 'Create Key',
            disabled: false,
            onClick: () => {
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
    ];

    const registry = useMemo(
        () => buildKeyCellRegistry({ keyTypeEnum, keyUsageEnum, getEnumLabel, dateFormatter }),
        [keyTypeEnum, keyUsageEnum],
    );

    // The enum legends ride beside their headings rather than inside them: a sortable heading is
    // itself a button, and a toggletip nested in one would be a control inside a control.
    const headerInfo = useMemo(
        () => ({
            'property:CKI_TYPE': <EnumColumnDescription platformEnum={PlatformEnum.KeyType} title="Type" />,
            'property:CKI_CRYPTOGRAPHIC_ALGORITHM': <EnumColumnDescription platformEnum={PlatformEnum.KeyAlgorithm} title="Algorithm" />,
            'property:CKI_FORMAT': <EnumColumnDescription platformEnum={PlatformEnum.KeyFormat} title="Format" />,
        }),
        [],
    );

    // Memoised because the host takes the config apart and refetches when its parts change.
    const configurableColumns = useMemo(
        () => ({
            resource: Resource.Keys,
            standardColumns: KEY_COLUMNS,
            rows: cryptographicKeys,
            getRowId: (item: CryptographicKeyResponseModel) => item.uuid,
            registry,
            headerInfo,
            resourceLabel: 'Keys',
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

    const handleFormSuccess = useCallback(() => {
        setIsAddOpen(false);
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    }, [onListCallback]);

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
            />
            <Dialog
                isOpen={isAddOpen}
                caption="Create Key"
                body={<CryptographicKeyForm onSuccess={handleFormSuccess} onCancel={() => setIsAddOpen(false)} />}
                toggle={() => {
                    setIsAddOpen(false);
                }}
                size="xl"
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
