import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import type { ApiClients } from 'src/api';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import PagedList from 'components/PagedList/PagedList';

import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions, selectors } from 'ducks/time-quality-configurations';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';

export const TimeQualityConfigurationsList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.TIME_QUALITY_CONFIGURATION));
    const timeQualityConfigurations = useSelector(selectors.timeQualityConfigurations);
    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);

    const isBusy = isFetching || isDeleting || isBulkDeleting;

    const [showDeleteErrors, setShowDeleteErrors] = useState<boolean>(false);

    useEffect(() => {
        if (bulkDeleteErrorMessages.length > 0) {
            setShowDeleteErrors(true);
        }
    }, [bulkDeleteErrorMessages]);

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            dispatch(actions.listTimeQualityConfigurations(filters));
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
                width: '35%',
            },
            {
                id: 'ntpServers',
                content: 'NTP Servers',
                sortable: false,
                width: '50%',
            },
        ],
        [],
    );

    const tableData: TableDataRow[] = useMemo(
        () =>
            timeQualityConfigurations.map((config) => ({
                id: config.uuid,
                columns: [
                    <span key="name-link" style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${config.uuid}`}>{config.name}</Link>
                    </span>,

                    <span key="ntpServers-value" className="text-sm text-content-muted">
                        {config.ntpServers?.join(', ') || '—'}
                    </span>,
                ],
            })),
        [timeQualityConfigurations],
    );

    return (
        <>
            <PagedList
                entity={EntityType.TIME_QUALITY_CONFIGURATION}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteTimeQualityConfigurations({ uuids }))}
                headers={tableHeader}
                data={tableData}
                isBusy={isBusy}
                title="List of Time Quality Configurations"
                entityNameSingular="Time Quality Configuration"
                entityNamePlural="Time Quality Configurations"
                filterTitle="Time Quality Configurations Filter"
                pageWidgetLockName={LockWidgetNameEnum.ListOfTimeQualityConfigurations}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.timeQualityConfigurations.listTimeQualityConfigurationSearchableFields(),
                    [],
                )}
                additionalButtons={useMemo(
                    () => [
                        {
                            icon: 'plus' as const,
                            disabled: false,
                            tooltip: 'Create Time Quality Configuration',
                            onClick: () => navigate('./add'),
                        },
                    ],
                    [navigate],
                )}
                addHidden
                hasCheckboxes
            />

            <Dialog
                isOpen={showDeleteErrors}
                caption="Delete Time Quality Configurations"
                body={
                    <ForceDeleteErrorTable
                        items={bulkDeleteErrorMessages}
                        entityNameSingular="a Time Quality Configuration"
                        entityNamePlural="Time Quality Configurations"
                        itemsCount={checkedRows.length}
                    />
                }
                toggle={onCloseDeleteErrors}
                buttons={[{ color: 'secondary', variant: 'outline', onClick: onCloseDeleteErrors, body: 'Close' }]}
            />
        </>
    );
};
