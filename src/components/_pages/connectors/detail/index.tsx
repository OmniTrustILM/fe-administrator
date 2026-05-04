import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { CircleCheck, CircleAlert, CircleHelp } from 'lucide-react';

import Badge from 'components/Badge';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/connectors';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as userInterfaceActions } from 'ducks/user-interface';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { FunctionGroupModel } from 'types/connectors';
import { ConnectorStatus, ConnectorVersion, HealthStatus, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { inventoryStatus } from 'utils/connector';
import { featureFlags } from 'utils/feature-flags';

import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import ConnectorForm from '../form';
import FunctionGroupDetailsV1 from './FunctionGroupDetailsV1';
import SupportedInterfacesV2 from './SupportedInterfacesV2';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

function getHealthStatusIcon(status: string): { Icon: typeof CircleCheck; className: string } {
    if (status === HealthStatus.Up) {
        return { Icon: CircleCheck, className: 'text-[var(--status-success-color)]' };
    }
    if (status === HealthStatus.Down || status === HealthStatus.OutOfService) {
        return { Icon: CircleAlert, className: 'text-[var(--status-danger-color)]' };
    }
    if (status === HealthStatus.Degraded) {
        return { Icon: CircleAlert, className: 'text-[var(--status-warning-color)]' };
    }
    return { Icon: CircleHelp, className: 'text-[var(--status-light-gray-color)]' };
}

export default function ConnectorDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const authTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AuthType));

    const connector = useSelector(selectors.connector);
    const health = useSelector(selectors.connectorHealth);
    const attributes = useSelector(selectors.connectorAttributes);
    const connectorInfoV2 = useSelector(selectors.connectorInfoV2);

    const isFetchingAllAttributes = useSelector(selectors.isFetchingAllAttributes);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingHealth = useSelector(selectors.isFetchingHealth);
    const isReconnecting = useSelector(selectors.isReconnecting);
    const isBulkReconnecting = useSelector(selectors.isBulkReconnecting);
    const isAuthorizing = useSelector(selectors.isAuthorizing);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);

    const isBusy = isFetchingDetail || isBulkReconnecting || isReconnecting || isAuthorizing;

    const [currentFunctionGroup, setFunctionGroup] = useState<FunctionGroupModel | undefined>();
    const [currentFunctionGroupKind, setCurrentFunctionGroupKind] = useState<string>();
    const [currentFunctionGroupKindAttributes, setCurrentFunctionGroupKindAttributes] = useState<AttributeDescriptorModel[] | undefined>();

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmAuthorize, setConfirmAuthorize] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateConnectorSucceeded = useSelector(selectors.updateConnectorSucceeded);

    const getFreshConnectorDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getConnectorDetail({ uuid: id }));
    }, [id, dispatch]);

    const getFreshConnectorHealth = useCallback(() => {
        if (!id) return;
        dispatch(actions.getConnectorHealth({ uuid: id }));
    }, [id, dispatch]);

    const getFreshConnectorAttributesDesc = useCallback(() => {
        if (!id) return;
        dispatch(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ConnectorAttributes));
        dispatch(actions.getConnectorAllAttributesDescriptors({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        setFunctionGroup(undefined);
        getFreshConnectorDetails();
        getFreshConnectorHealth();
        getFreshConnectorAttributesDesc();
        if (id) {
            dispatch(actions.getConnectorInfoV2({ uuid: id }));
        }
    }, [id, getFreshConnectorDetails, getFreshConnectorHealth, getFreshConnectorAttributesDesc, dispatch]);

    useEffect(() => {
        if (!connector || connector.functionGroups.length === 0) {
            setFunctionGroup(undefined);
            setCurrentFunctionGroupKind(undefined);
            return;
        }

        setFunctionGroup(connector.functionGroups[0]);

        if (connector.functionGroups[0].kinds.length > 0) {
            setCurrentFunctionGroupKind(connector.functionGroups[0].kinds[0]);
        } else {
            setCurrentFunctionGroupKind(undefined);
        }
    }, [connector]);

    useEffect(() => {
        let attrs: AttributeDescriptorModel[] | undefined;

        if (attributes && connector && currentFunctionGroup && currentFunctionGroupKind) {
            const fgAttrs = attributes[currentFunctionGroup.functionGroupCode];
            if (fgAttrs) attrs = fgAttrs[currentFunctionGroupKind];
        }

        setCurrentFunctionGroupKindAttributes(attrs);
    }, [attributes, connector, currentFunctionGroup, currentFunctionGroupKind]);

    useRunOnSuccessfulFinish(isUpdating, updateConnectorSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshConnectorDetails();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        if (!connector) return;
        setIsEditModalOpen(true);
    }, [connector]);

    const onReconnectClick = useCallback(() => {
        if (!connector) return;
        dispatch(actions.reconnectConnector({ uuid: connector.uuid }));
    }, [connector, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!connector) return;
        dispatch(actions.deleteConnector({ uuid: connector.uuid }));
        setConfirmDelete(false);
    }, [connector, dispatch]);

    const onAuthorizeConfirmed = useCallback(() => {
        if (!connector) return;
        setConfirmAuthorize(false);
        dispatch(actions.authorizeConnector({ uuid: connector.uuid }));
    }, [dispatch, connector]);

    const onForceDeleteConnector = useCallback(() => {
        if (!connector) return;
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteConnectors({ uuids: [connector.uuid], successRedirect: `../../connectors` }));
    }, [connector, dispatch]);

    const onFunctionGroupChange = useCallback(
        (groupCode: string) => {
            const group = (connector?.functionGroups || []).find((group) => group.functionGroupCode === groupCode);
            if (group) setFunctionGroup(group);
        },
        [connector],
    );

    const onFunctionGroupKindChange = useCallback((kind: string) => setCurrentFunctionGroupKind(kind), []);

    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'unplug',
                disabled: false,
                tooltip: 'Reconnect',
                onClick: () => {
                    onReconnectClick();
                },
            },
            {
                icon: 'check',
                disabled: connector ? connector.status === ConnectorStatus.Connected : false,
                tooltip: 'Approve',
                onClick: () => {
                    setConfirmAuthorize(true);
                },
            },
        ],
        [onEditClick, onReconnectClick, setConfirmDelete, setConfirmAuthorize, connector],
    );

    const attributesHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: 'Property',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const attributesData: TableDataRow[] = useMemo(() => {
        if (!connector) return [];

        const connectorStatus = inventoryStatus(connector.status);

        return [
            {
                id: 'uuid',
                columns: ['UUID', connector.uuid],
            },
            {
                id: 'url',
                columns: ['URL', connector.url],
            },
            ...(featureFlags.isProxiesEnabled
                ? [
                      {
                          id: 'proxy',
                          columns: [
                              'Proxy',
                              connector.proxy ? <Link to={`../proxies/detail/${connector.proxy.uuid}`}>{connector.proxy.name}</Link> : '-',
                          ],
                      },
                  ]
                : []),
            {
                id: 'version',
                columns: ['Version', connector.version],
            },
            {
                id: 'authType',
                columns: ['Auth Type', getEnumLabel(authTypeEnum, connector.authType)],
            },
            {
                id: 'status',
                columns: [
                    'Status',
                    <Badge key="status" style={{ backgroundColor: connectorStatus[1] }}>
                        {connectorStatus[0]}
                    </Badge>,
                ],
            },
        ];
    }, [connector, authTypeEnum]);

    const connectorInfoData: TableDataRow[] = useMemo(() => {
        if (connector?.version !== ConnectorVersion.V2 || !connectorInfoV2) return [];

        const description = connectorInfoV2.description ?? '';
        const metadata = connectorInfoV2.metadata as Record<string, unknown> | undefined;
        const metadataString = metadata
            ? Object.entries(metadata)
                  .map(([key, value]) => `${key}:${String(value)}`)
                  .join(' ')
            : '';

        const rows: TableDataRow[] = [
            {
                id: 'name',
                columns: ['Name', connectorInfoV2.name],
            },
            {
                id: 'id',
                columns: ['ID', connectorInfoV2.id],
            },
            {
                id: 'versionInfo',
                columns: ['Version', connectorInfoV2.version ?? ''],
            },
        ];

        if (description) {
            rows.push({
                id: 'description',
                columns: ['Description', description],
            });
        }

        if (metadataString) {
            rows.push({
                id: 'metadata',
                columns: ['Metadata', metadataString],
            });
        }

        return rows;
    }, [connector, connectorInfoV2]);

    const renderStatusBadge = useCallback((status?: HealthStatus) => {
        if (!status) return <Badge color="transparent">Unknown</Badge>;
        switch (status) {
            case HealthStatus.Up:
                return <Badge color="success">{status}</Badge>;
            case HealthStatus.Down:
            case HealthStatus.OutOfService:
                return <Badge color="danger">{status}</Badge>;
            case HealthStatus.Degraded:
                return <Badge color="warning">{status}</Badge>;
            case HealthStatus.Unknown:
            default:
                return <Badge color="transparent">{status}</Badge>;
        }
    }, []);

    const healthHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'part',
                content: 'Part',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'description',
                content: 'Description',
            },
        ],
        [],
    );

    const healthData: TableDataRow[] = useMemo(() => {
        const data: TableDataRow[] = [
            {
                id: 'overallHealth',
                columns: ['Overall Health', renderStatusBadge(health?.status), health?.description || ''],
            },
        ];

        if (health?.parts) {
            Object.entries(health.parts).forEach(([key, value]) => {
                data.push({
                    id: key,
                    columns: [
                        key,
                        ['ok', 'failed', 'down', 'nok', 'unknown'].includes(value.status) ? (
                            renderStatusBadge(value.status)
                        ) : (
                            <Badge color="success">{value.status || 'OK'}</Badge>
                        ),
                        value?.description || '',
                    ],
                });
            });
        }

        return data;
    }, [health, renderStatusBadge]);

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={4} />;
    }

    const healthStatus = health?.status?.toUpperCase?.() ?? HealthStatus.Unknown;
    const { Icon: HealthIcon, className: healthIconClassName } = getHealthStatusIcon(healthStatus);
    const healthButtonsNode = (
        <div>
            <HealthIcon size={24} strokeWidth={3} className={healthIconClassName} />
        </div>
    );

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Connectors)} Inventory`, href: '/connectors' },
                    { label: connector?.name || 'Connector Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.ConnectorDetails} busy={isBusy} noBorder>
                <div className="space-y-4">
                    <Container className="grid xl:grid-cols-2 items-start">
                        <Widget
                            title="Connector Details"
                            widgetButtons={widgetButtons}
                            titleSize="large"
                            refreshAction={getFreshConnectorDetails}
                            lockSize="large"
                        >
                            <CustomTable headers={attributesHeaders} data={attributesData} />
                        </Widget>

                        {connector && (
                            <CustomAttributeWidget
                                resource={Resource.Connectors}
                                resourceUuid={connector.uuid}
                                attributes={connector.customAttributes}
                            />
                        )}
                    </Container>

                    <Container className={connector?.version === ConnectorVersion.V2 ? 'grid gap-6 xl:grid-cols-2' : 'grid gap-6'}>
                        {connector?.version === ConnectorVersion.V2 && connectorInfoData.length > 0 && (
                            <Widget title="Connector Info" busy={isFetchingDetail} titleSize="large">
                                <CustomTable headers={attributesHeaders} data={connectorInfoData} />
                            </Widget>
                        )}
                        <Widget
                            title="Connector Health"
                            busy={isFetchingHealth}
                            widgetExtraTopNode={healthButtonsNode}
                            titleSize="large"
                            refreshAction={getFreshConnectorHealth}
                        >
                            <CustomTable headers={healthHeaders} data={healthData} />
                        </Widget>
                    </Container>

                    {connector?.version === ConnectorVersion.V1 && (
                        <FunctionGroupDetailsV1
                            functionGroups={connector.functionGroups}
                            currentFunctionGroup={currentFunctionGroup}
                            currentFunctionGroupKind={currentFunctionGroupKind}
                            currentFunctionGroupKindAttributes={currentFunctionGroupKindAttributes}
                            isFetchingDetail={isFetchingDetail}
                            isReconnecting={isReconnecting}
                            isFetchingAllAttributes={isFetchingAllAttributes}
                            onFunctionGroupChange={onFunctionGroupChange}
                            onFunctionGroupKindChange={onFunctionGroupKindChange}
                            getFreshConnectorAttributesDesc={getFreshConnectorAttributesDesc}
                        />
                    )}

                    {connector?.version === ConnectorVersion.V2 && (
                        <SupportedInterfacesV2 interfaces={(connector as any)?.interfaces} isBusy={isFetchingDetail || isReconnecting} />
                    )}
                </div>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Connector"
                body="You are about to delete a Connector. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmAuthorize}
                caption="Approve Connector"
                body="You are about to approve this connector. Is this what you want to do?"
                toggle={() => setConfirmAuthorize(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmAuthorize(false), body: 'Cancel' },
                    { color: 'primary', onClick: onAuthorizeConfirmed, body: 'Yes, approve' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage !== ''}
                caption="Delete Connector"
                body={
                    <>
                        Failed to delete the connector as the connector has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                    { color: 'danger', onClick: onForceDeleteConnector, body: 'Force' },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Connector"
                size="xl"
                body={<ConnectorForm connectorId={connector?.uuid} onCancel={handleCloseEditModal} />}
            />
        </div>
    );
}
