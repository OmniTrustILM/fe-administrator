import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import PagedList from 'components/PagedList/PagedList';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import { actions, selectors } from 'ducks/signing-records';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { LockWidgetNameEnum } from 'types/user-interface';
import { Resource } from 'types/openapi';
import type { SearchRequestModel } from 'types/certificate';
import type { ApiClients } from 'src/api';
import { dateFormatter } from 'utils/dateUtil';

function SigningRecordsList() {
    const dispatch = useDispatch();

    const signingRecords = useSelector(selectors.selectSigningRecordsList);
    const isFetching = useSelector(selectors.selectIsFetchingList);
    const isDeleting = useSelector(selectors.selectIsDeleting);
    const isBulkDeleting = useSelector(selectors.selectIsBulkDeleting);
    const bulkDeleteErrorMessages = useSelector(selectors.selectBulkDeleteErrorMessages);
    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.SIGNING_RECORD));

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

    const headers: TableHeader[] = useMemo(
        () => [
            { content: 'Name', sortable: true, id: 'name' },
            { content: 'Signing Profile', sortable: true, id: 'signingProfile' },
            { content: 'Signing Time', sortable: true, id: 'signingTime' },
            { content: 'Created At', sortable: true, id: 'createdAt' },
        ],
        [],
    );

    const rows: TableDataRow[] = useMemo(
        () =>
            signingRecords.map((record) => ({
                id: record.uuid,
                columns: [
                    <Link key="name" to={`./detail/${record.uuid}`}>
                        {record.name}
                    </Link>,
                    record.signingProfile ? (
                        <Link key="profile" to={`/${Resource.SigningProfiles.toLowerCase()}/detail/${record.signingProfile.uuid}`}>
                            {record.signingProfile.name} (v{record.signingProfile.version})
                        </Link>
                    ) : (
                        '-'
                    ),
                    record.signingTime ? dateFormatter(record.signingTime) : '-',
                    record.createdAt ? dateFormatter(record.createdAt) : '-',
                ],
            })),
        [signingRecords],
    );

    const onList = useCallback((filters: SearchRequestModel) => dispatch(actions.listSigningRecords(filters)), [dispatch]);

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
                headers={headers}
                data={rows}
                isBusy={isBusy}
                title="Signing Records"
                entityNameSingular="a Signing Record"
                entityNamePlural="Signing Records"
                addHidden
                hasCheckboxes={true}
                pageWidgetLockName={LockWidgetNameEnum.ListOfSigningRecords}
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
