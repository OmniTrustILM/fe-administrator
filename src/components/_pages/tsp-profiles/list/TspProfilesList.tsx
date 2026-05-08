import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import type { ApiClients } from 'src/api';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import PagedList from 'components/PagedList/PagedList';
import StatusBadge from 'components/StatusBadge';

import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions, selectors } from 'ducks/tsp-profiles';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';

export const TspProfilesList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.TSP_PROFILE));
    const tspProfiles = useSelector(selectors.tspProfiles);
    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);

    const isBusy = isFetching || isDeleting || isBulkDeleting || isBulkEnabling || isBulkDisabling;

    const [showDeleteErrors, setShowDeleteErrors] = useState<boolean>(false);

    useEffect(() => {
        if (bulkDeleteErrorMessages.length > 0) {
            setShowDeleteErrors(true);
        }
    }, [bulkDeleteErrorMessages]);

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            dispatch(actions.listTspProfiles(filters));
        },
        [dispatch],
    );

    const onCloseDeleteErrors = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        setShowDeleteErrors(false);
    }, [dispatch]);

    const tableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '40%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: false,
                width: '45%',
            },
            {
                id: 'status',
                content: 'Status',
                align: 'center' as const,
                sortable: true,
                width: '15%',
            },
        ],
        [],
    );

    const tableData: TableDataRow[] = useMemo(
        () =>
            tspProfiles.map((profile) => ({
                id: profile.uuid,
                columns: [
                    <span key="name-link" style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${profile.uuid}`}>{profile.name}</Link>
                    </span>,
                    <span key="description-value" className="text-sm text-gray-600">
                        {profile.description || '—'}
                    </span>,
                    <StatusBadge key="status-badge" enabled={profile.enabled} />,
                ],
            })),
        [tspProfiles],
    );

    const getAvailableFiltersApi = useCallback((apiClients: ApiClients) => apiClients.tspProfiles.listTspProfileSearchableFields(), []);

    const additionalButtons = useMemo(
        () => [
            {
                icon: 'plus' as const,
                disabled: false,
                tooltip: 'Create TSP Profile',
                onClick: () => navigate('./add'),
            },
            {
                icon: 'check' as const,
                disabled: checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => dispatch(actions.bulkEnableTspProfiles({ uuids: checkedRows })),
            },
            {
                icon: 'times' as const,
                disabled: checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => dispatch(actions.bulkDisableTspProfiles({ uuids: checkedRows })),
            },
        ],
        [navigate, checkedRows, dispatch],
    );

    return (
        <>
            <PagedList
                entity={EntityType.TSP_PROFILE}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteTspProfiles({ uuids }))}
                headers={tableHeader}
                data={tableData}
                isBusy={isBusy}
                title="List of TSP Profiles"
                entityNameSingular="TSP Profile"
                entityNamePlural="TSP Profiles"
                filterTitle="TSP Profiles Filter"
                pageWidgetLockName={LockWidgetNameEnum.ListOfTspProfiles}
                getAvailableFiltersApi={getAvailableFiltersApi}
                additionalButtons={additionalButtons}
                addHidden
                hasCheckboxes
            />

            <Dialog
                isOpen={showDeleteErrors}
                caption="Delete TSP Profiles"
                body={
                    <ForceDeleteErrorTable
                        items={bulkDeleteErrorMessages}
                        entityNameSingular="a TSP Profile"
                        entityNamePlural="TSP Profiles"
                        itemsCount={checkedRows.length}
                    />
                }
                toggle={onCloseDeleteErrors}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: onCloseDeleteErrors, body: 'Close' }]}
            />
        </>
    );
};
