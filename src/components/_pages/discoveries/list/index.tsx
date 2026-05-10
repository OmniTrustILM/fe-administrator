import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/discoveries';
import { EntityType } from 'ducks/filters';
import { dateFormatter, durationFormatter } from 'utils/dateUtil';

import type { ApiClients } from '../../../../api';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import DiscoveryStatus from '../DiscoveryStatus';
import Dialog from 'components/Dialog';
import DiscoveryForm from '../form';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

function DiscoveryList() {
    const dispatch = useDispatch();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const isCreating = useSelector(selectors.isCreating);
    const createDiscoverySucceeded = useSelector(selectors.createDiscoverySucceeded);

    const discoveries = useSelector(selectors.discoveries);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBusy = isDeleting || isBulkDeleting;

    const discoveriesRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'discoveryName',
                width: 'auto',
            },
            {
                content: 'Discovery Provider',
                align: 'center',
                sortable: true,
                id: 'discoveryProvider',
                width: '15%',
            },
            {
                content: 'Kinds',
                align: 'center',
                sortable: true,
                id: 'kinds',
                width: '15%',
            },
            {
                content: 'Start time',
                align: 'center',
                sortable: true,
                id: 'startTime',
                width: '10%',
            },
            {
                content: 'Duration',
                align: 'center',
                sortable: true,
                id: 'duration',
                width: '5%',
            },
            {
                content: 'Status',
                align: 'center',
                sortable: true,
                id: 'status',
                width: '10%',
            },
            {
                content: 'Total Certificates',
                align: 'center',
                sortable: true,
                sortType: 'numeric',
                id: 'totalCertificates',
                width: '10%',
            },
        ],
        [],
    );

    const discoveryList: TableDataRow[] = useMemo(
        () =>
            discoveries.map((discovery) => ({
                id: discovery.uuid,
                columns: [
                    <Link key="name" to={`./detail/${discovery.uuid}`}>
                        {discovery.name}
                    </Link>,
                    discovery.connectorName ? (
                        <Link key="connector" to={`../connectors/detail/${discovery.connectorUuid}`}>
                            {discovery.connectorName ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (discovery.connectorName ?? 'Unassigned')
                    ),
                    <Badge key="kind" color="secondary">
                        {discovery.kind}
                    </Badge>,
                    discovery.startTime ? (
                        <span key="startTime" style={{ whiteSpace: 'nowrap' }}>
                            {dateFormatter(discovery.startTime)}
                        </span>
                    ) : (
                        ''
                    ),
                    <span key={`duration${discovery.uuid}`} style={{ whiteSpace: 'nowrap' }}>
                        {durationFormatter(discovery.startTime, discovery.endTime)}
                    </span>,
                    <DiscoveryStatus key="status" status={discovery.status} />,
                    discovery.totalCertificatesDiscovered?.toString() || '0',
                ],
            })),
        [discoveries],
    );

    const onListCallback = useCallback((filters: SearchRequestModel) => dispatch(actions.listDiscoveries(filters)), [dispatch]);

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    const handleFormSuccess = useCallback(() => {
        handleCloseAddModal();
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    }, [handleCloseAddModal, onListCallback]);

    const handleCreateSuccess = useCallback(() => {
        if (!isAddModalOpen) return;
        handleFormSuccess();
    }, [handleFormSuccess, isAddModalOpen]);

    useRunOnSuccessfulFinish(isCreating, createDiscoverySucceeded, handleCreateSuccess);

    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Add',
                onClick: handleOpenAddModal,
            },
        ],
        [handleOpenAddModal],
    );

    return (
        <>
            <PagedList
                entity={EntityType.DISCOVERY}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteDiscovery({ uuids }))}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.discoveries.getDiscoverySearchableFields(), [])}
                headers={discoveriesRowHeaders}
                data={discoveryList}
                isBusy={isBusy}
                title="Discovery Store"
                entityNameSingular="a Discovery"
                entityNamePlural="Discoveries"
                filterTitle="Discoveries Filter"
                pageWidgetLockName={LockWidgetNameEnum.DiscoveriesStore}
                addHidden
                additionalButtons={additionalButtons}
            />
            <Dialog
                isOpen={isAddModalOpen}
                caption="Create Discovery"
                body={<DiscoveryForm onCancel={handleCloseAddModal} />}
                toggle={handleCloseAddModal}
                size="xl"
                buttons={[]}
            />
        </>
    );
}

export default DiscoveryList;
