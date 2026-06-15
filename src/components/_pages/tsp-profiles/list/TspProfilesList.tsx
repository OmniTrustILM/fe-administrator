import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import type { ApiClients } from 'src/api';
import CopyUrlCell from 'components/CopyUrlCell';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import PagedList from 'components/PagedList/PagedList';
import StatusBadge from 'components/StatusBadge';

import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions, selectors } from 'ducks/tsp-profiles';
import type { SearchRequestModel } from 'types/certificate';
import { Resource } from 'types/openapi';
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

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableTspProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableTspProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

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
                width: '25%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: false,
                width: '25%',
            },
            {
                id: 'defaultSigningProfile',
                content: 'Default Signing Profile',
                sortable: true,
                width: '20%',
                align: 'center',
            },
            {
                id: 'signingUrl',
                content: 'Signing URL',
                sortable: true,
                width: 'auto',
            },
            {
                id: 'status',
                content: 'Status',
                align: 'center',
                sortable: true,
                width: '10%',
            },
        ],
        [],
    );

    const tableData: TableDataRow[] = useMemo(
        () =>
            tspProfiles.map((config) => ({
                id: config.uuid,
                columns: [
                    <span key="name-link" style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${config.uuid}`}>{config.name}</Link>
                    </span>,
                    <span key="description-value" className="text-sm text-gray-600">
                        {config.description || '—'}
                    </span>,
                    config.defaultSigningProfile ? (
                        <Link
                            key="default-signing-profile"
                            to={`../${Resource.SigningProfiles.toLowerCase()}/detail/${config.defaultSigningProfile.uuid}`}
                        >
                            {config.defaultSigningProfile.name}
                        </Link>
                    ) : (
                        <span key="default-signing-profile">Unassigned</span>
                    ),
                    <CopyUrlCell key="signing-url" label="Signing URL">
                        {config.signingUrl}
                    </CopyUrlCell>,
                    <StatusBadge key="status-badge" enabled={config.enabled} />,
                ],
            })),
        [tspProfiles],
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
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.tspProfiles.listTspProfileSearchableFields(),
                    [],
                )}
                additionalButtons={useMemo(
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
                            onClick: onEnableClick,
                        },
                        {
                            icon: 'times' as const,
                            disabled: checkedRows.length === 0,
                            tooltip: 'Disable',
                            onClick: onDisableClick,
                        },
                    ],
                    [checkedRows, navigate, onEnableClick, onDisableClick],
                )}
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
