import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PagedList from 'components/PagedList/PagedList';
import Dialog from 'components/Dialog';
import { EnumColumnDescription } from 'components/EnumDescription';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import { actions, selectors } from 'ducks/signing-records';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource, type SigningRecordListDto } from 'types/openapi';
import type { SearchRequestModel } from 'types/certificate';
import type { ApiClients } from 'src/api';
import { dateFormatter } from 'utils/dateUtil';
import { buildSigningRecordCellRegistry, SIGNING_RECORD_COLUMNS } from '../signingRecordTableHelpers';

function SigningRecordsList() {
    const dispatch = useDispatch();

    const signingRecords = useSelector(selectors.selectSigningRecordsList);
    const isFetching = useSelector(selectors.selectIsFetchingList);
    const isDeleting = useSelector(selectors.selectIsDeleting);
    const isBulkDeleting = useSelector(selectors.selectIsBulkDeleting);
    const bulkDeleteErrorMessages = useSelector(selectors.selectBulkDeleteErrorMessages);
    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.SIGNING_RECORD));
    const signingProtocolEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SigningProtocol));

    const [showDeleteErrors, setShowDeleteErrors] = useState(false);

    const isBusy = isFetching || isDeleting || isBulkDeleting;

    useEffect(() => {
        if (bulkDeleteErrorMessages.length > 0) {
            setShowDeleteErrors(true);
        }
    }, [bulkDeleteErrorMessages]);

    const onCloseDeleteErrors = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        setShowDeleteErrors(false);
    }, [dispatch]);

    const registry = useMemo(
        () => buildSigningRecordCellRegistry({ signingProtocolEnum, getEnumLabel, dateFormatter }),
        [signingProtocolEnum],
    );

    const headerInfo = useMemo(
        () => ({
            'property:SIGNING_RECORD_PROTOCOL': <EnumColumnDescription platformEnum={PlatformEnum.SigningProtocol} title="Protocol" />,
        }),
        [],
    );

    const configurableColumns = useMemo(
        () => ({
            resource: Resource.SigningRecords,
            standardColumns: SIGNING_RECORD_COLUMNS,
            rows: signingRecords,
            getRowId: (record: SigningRecordListDto) => record.uuid,
            registry,
            headerInfo,
        }),
        [signingRecords, registry, headerInfo],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listSigningRecords(filters)), [dispatch]);

    // A bulk delete re-reads through the host so the replayed request keeps the applied columns and ordering.
    const refreshToken = useSelector(selectors.selectListRefreshToken);

    return (
        <>
            <PagedList
                entity={EntityType.SIGNING_RECORD}
                onListCallback={onList}
                onDeleteCallback={(uuids) => {
                    if (uuids.length === 1) {
                        dispatch(actions.deleteSigningRecord({ uuid: uuids[0] }));
                        return;
                    }

                    if (uuids.length > 1) {
                        dispatch(actions.bulkDeleteSigningRecords({ uuids }));
                    }
                }}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.signingRecords.listSigningRecordSearchableFields(),
                    [],
                )}
                filterTitle="Signing Records Filter"
                configurableColumns={configurableColumns}
                isBusy={isBusy}
                title="Signing Records"
                entityNameSingular="a Signing Record"
                entityNamePlural="Signing Records"
                addHidden
                hasCheckboxes={true}
                pageWidgetLockName={LockWidgetNameEnum.ListOfSigningRecords}
                refreshToken={refreshToken}
            />

            <Dialog
                isOpen={showDeleteErrors}
                caption="Delete Signing Records"
                body={
                    <ForceDeleteErrorTable
                        items={bulkDeleteErrorMessages}
                        entityNameSingular="a Signing Record"
                        entityNamePlural="Signing Records"
                        itemsCount={checkedRows.length}
                    />
                }
                toggle={onCloseDeleteErrors}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: onCloseDeleteErrors, body: 'Close' }]}
            />
        </>
    );
}

export default SigningRecordsList;
