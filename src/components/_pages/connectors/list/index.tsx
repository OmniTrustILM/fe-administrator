import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import Badge from 'components/Badge';
import { actions, selectors } from 'ducks/connectors';

import type { TableDataRow, TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import ConnectorForm from '../form';
import ConnectorCapabilityBadges from './ConnectorCapabilityBadges';
import ConnectorCapabilitiesMatrix from './ConnectorCapabilitiesMatrix';
import PagedList from 'components/PagedList/PagedList';

import { EntityType } from 'ducks/filters';
import { selectors as enumSelectors } from 'ducks/enums';
import { selectors as pagingSelectors } from 'ducks/paging';
import type { SearchRequestModel } from 'types/certificate';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { getConnectorCapabilities, inventoryStatus } from 'utils/connector';
import { featureFlags } from 'utils/feature-flags';

import type { ApiClients } from '../../../../api';

export default function ConnectorList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.CONNECTOR));
    const connectors = useSelector(selectors.connectors);

    const connectorInterfaceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConnectorInterface));
    const featureFlagEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FeatureFlag));
    const functionGroupCodeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FunctionGroupCode));

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const isBulkReconnecting = useSelector(selectors.isBulkReconnecting);
    const isBulkAuthorizing = useSelector(selectors.isBulkAuthorizing);
    const isCreating = useSelector(selectors.isCreating);
    const createConnectorSucceeded = useSelector(selectors.createConnectorSucceeded);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateConnectorSucceeded = useSelector(selectors.updateConnectorSucceeded);

    const isBusy = isDeleting || isBulkDeleting || isForceDeleting || isBulkReconnecting || isBulkAuthorizing;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmAuthorize, setConfirmAuthorize] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingConnectorId, setEditingConnectorId] = useState<string | undefined>(undefined);
    const [capabilitiesModal, setCapabilitiesModal] = useState<{ caption: string; content: ReactNode } | null>(null);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createConnectorSucceeded, () => {
        setIsAddModalOpen(false);
    });
    useRunOnSuccessfulFinish(isUpdating, updateConnectorSucceeded, () => {
        setEditingConnectorId(undefined);
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingConnectorId(undefined);
    }, []);

    const onReconnectClick = useCallback(() => {
        dispatch(actions.bulkReconnectConnectors({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkDeleteConnectors({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const onForceDeleteConfirmed = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteConnectors({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const onAuthorizeConfirmed = useCallback(() => {
        setConfirmAuthorize(false);
        dispatch(actions.bulkAuthorizeConnectors({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            dispatch(actions.clearDeleteErrorMessages());
            dispatch(actions.listConnectors(filters));
        },
        [dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'unplug',
                disabled: checkedRows.length === 0,
                tooltip: 'Reconnect',
                onClick: () => {
                    onReconnectClick();
                },
            },
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Approve',
                onClick: () => {
                    setConfirmAuthorize(true);
                },
            },
        ],
        [checkedRows, handleOpenAddModal, onReconnectClick],
    );

    const forceDeleteBody = (
        <ForceDeleteErrorTable
            items={bulkDeleteErrorMessages}
            entityNameSingular="a Connector"
            entityNamePlural="Connectors"
            itemsCount={checkedRows.length}
        />
    );

    const connectorsRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'connectorName',
                width: '25%',
            },
            {
                content: 'Ver',
                sortable: true,
                id: 'connectorVersion',
                align: 'center',
                width: '5%',
            },
            {
                content: 'Interfaces / Function Groups',
                id: 'connectorInterfaces',
                width: '15%',
            },
            {
                content: 'Features / Kinds',
                id: 'connectorFeatures',
                width: '15%',
                minWidth: '180px',
            },
            ...(featureFlags.isProxiesEnabled
                ? [
                      {
                          content: 'Proxy',
                          sortable: true,
                          id: 'connectorProxy',
                          width: '15%',
                      } as TableHeader,
                  ]
                : []),
            {
                content: 'URL',
                sortable: true,
                id: 'connectorUrl',
            },
            {
                content: 'Status',
                sortable: true,
                id: 'connectorStatus',
                width: '5%',
            },
        ],
        [],
    );

    const connectorList: TableDataRow[] = useMemo(
        () =>
            connectors.map((connector) => {
                const connectorStatus = inventoryStatus(connector.status);

                const { isV2, caption, capabilityLabels, featureLabels } = getConnectorCapabilities(connector, {
                    interfaceEnum: connectorInterfaceEnum,
                    featureEnum: featureFlagEnum,
                    functionGroupEnum: functionGroupCodeEnum,
                });

                const openCapabilitiesModal = () =>
                    setCapabilitiesModal({ caption, content: <ConnectorCapabilitiesMatrix connector={connector} /> });

                return {
                    id: connector.uuid,
                    columns: [
                        <span key="name" style={{ whiteSpace: 'nowrap' }}>
                            <Link to={`./detail/${connector.uuid}`}>{connector.name}</Link>
                        </span>,
                        <span key="version" style={{ whiteSpace: 'nowrap' }}>
                            {connector.version || '-'}
                        </span>,
                        <ConnectorCapabilityBadges
                            key="interfaces"
                            labels={capabilityLabels}
                            color="primary"
                            testIdPrefix={`interfaces-${connector.uuid}`}
                            overflowTitle={isV2 ? 'Show all interfaces' : 'Show all function groups'}
                            onOverflowClick={openCapabilitiesModal}
                        />,
                        <ConnectorCapabilityBadges
                            key="features"
                            labels={featureLabels}
                            color="secondary"
                            testIdPrefix={`features-${connector.uuid}`}
                            overflowTitle={isV2 ? 'Show all features' : 'Show all kinds'}
                            onOverflowClick={openCapabilitiesModal}
                        />,
                        ...(featureFlags.isProxiesEnabled
                            ? [
                                  <span key="proxy" style={{ whiteSpace: 'nowrap' }}>
                                      {connector.proxy ? (
                                          <Link to={`../proxies/detail/${connector.proxy.uuid}`}>{connector.proxy.name}</Link>
                                      ) : (
                                          '-'
                                      )}
                                  </span>,
                              ]
                            : []),
                        <span key="url" style={{ whiteSpace: 'nowrap' }}>
                            {connector.url}
                        </span>,
                        <Badge key="badge" style={{ backgroundColor: connectorStatus[1] }}>
                            {connectorStatus[0]}
                        </Badge>,
                    ],
                };
            }),
        [connectors, connectorInterfaceEnum, featureFlagEnum, functionGroupCodeEnum],
    );

    return (
        <div className="space-y-4">
            <PagedList
                entity={EntityType.CONNECTOR}
                headers={connectorsRowHeaders}
                data={connectorList}
                isBusy={isBusy}
                onListCallback={onListCallback}
                getAvailableFiltersApi={useCallback((apiClients: ApiClients) => apiClients.connectorsV2.getConnectorSearchableFields(), [])}
                title="Connector Store"
                filterTitle="Connector Filter"
                addHidden
                additionalButtons={buttons}
                pageWidgetLockName={LockWidgetNameEnum.ConnectorStore}
            />

            <Dialog
                isOpen={!!capabilitiesModal}
                caption={capabilitiesModal?.caption}
                body={capabilitiesModal?.content}
                toggle={() => setCapabilitiesModal(null)}
                size="lg"
                noBorder
                buttons={[{ color: 'secondary', variant: 'outline', onClick: () => setCapabilitiesModal(null), body: 'Close' }]}
            />

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Connectors' : 'a Connector'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Connectors' : 'a Connector'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={confirmAuthorize}
                caption={`Approve ${checkedRows.length > 1 ? 'Connectors' : 'a Connector'}`}
                body={
                    <span className="text-center">
                        {`You are about to approve ${checkedRows.length > 1 ? 'Connectors' : 'a Connector'}. Is this what you want to do?`}
                    </span>
                }
                toggle={() => setConfirmAuthorize(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmAuthorize(false), body: 'Cancel' },
                    { color: 'primary', onClick: onAuthorizeConfirmed, body: 'Approve' },
                ]}
                noBorder
                icon="check"
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'Connectors' : 'a Connector'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingConnectorId}
                toggle={handleCloseAddModal}
                caption="Create Connector"
                size="xl"
                body={<ConnectorForm connectorId={editingConnectorId} onCancel={handleCloseAddModal} />}
            />
        </div>
    );
}
