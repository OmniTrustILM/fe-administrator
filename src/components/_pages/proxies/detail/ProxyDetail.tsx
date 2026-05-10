import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { Check, X } from 'lucide-react';

import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import EditIcon from 'components/icons/EditIcon';
import { InstallationInstructions } from 'components/InstallationInstructions/InstallationInstructions';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as proxiesActions, selectors as proxiesSelectors } from 'ducks/proxies';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { PlatformEnum, ProxyStatus, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import ConnectorStatusBadge from '../../connectors/ConnectorStatus';
import { ProxyStatusBadge } from '../ProxyStatusBadge';

export const ProxyDetail = () => {
    const { id } = useParams();
    const dispatch = useDispatch();

    const proxyDetails = useSelector(proxiesSelectors.proxy);
    const proxyInstructions = useSelector(proxiesSelectors.proxyInstructions);
    const isFetchingProxy = useSelector(proxiesSelectors.isFetchingDetail);
    const isFetchingInstructions = useSelector(proxiesSelectors.isFetchingInstructions);
    const isUpdatingProxy = useSelector(proxiesSelectors.isUpdating);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescriptionEditEnable] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');
    const [showInstallationInstructions, setShowInstallationInstructions] = useState(false);

    const isBusy = useMemo(() => isFetchingProxy || isUpdatingProxy, [isFetchingProxy, isUpdatingProxy]);

    const installationInstructions = useMemo(() => {
        if (isFetchingInstructions) {
            return 'Loading installation instructions...';
        }
        if (proxyInstructions && proxyInstructions.trim().length > 0) {
            return proxyInstructions;
        }
        return 'No installation instructions available.';
    }, [isFetchingInstructions, proxyInstructions]);

    useEffect(() => {
        if (!proxyDetails || proxyDetails.uuid !== id) return;
        setUpdatedDescription(proxyDetails.description || '');
    }, [proxyDetails, id]);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(proxiesActions.getProxyDetail({ uuid: id }));
        setShowInstallationInstructions(false);
    }, [id, dispatch]);

    const fetchInstallationInstructions = useCallback(() => {
        if (!id) return;
        dispatch(proxiesActions.getProxyInstructions({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    useEffect(() => {
        if (showInstallationInstructions) {
            fetchInstallationInstructions();
        }
    }, [showInstallationInstructions, fetchInstallationInstructions]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(proxiesActions.deleteProxy({ uuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !updateDescriptionEditEnable) return;
        if (updatedDescription !== proxyDetails?.description) {
            dispatch(
                proxiesActions.updateProxy({
                    uuid: id,
                    proxyUpdateRequest: {
                        description: updatedDescription,
                    },
                }),
            );
        }
        setUpdateDescriptionEditEnable(false);
    }, [dispatch, id, proxyDetails, updatedDescription, updateDescriptionEditEnable]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                key: 'installation-instructions',
                icon: 'key',
                disabled: false,
                tooltip: 'Installation Instructions',
                onClick: () => setShowInstallationInstructions(!showInstallationInstructions),
            },
            {
                key: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete Proxy',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [showInstallationInstructions],
    );

    const tableHeader: TableHeader[] = useMemo(
        () => [
            { id: 'property', content: 'Property' },
            { id: 'value', content: 'Value' },
            { id: 'actions', content: 'Actions', align: 'center' },
        ],
        [],
    );

    const proxyDetailData: TableDataRow[] = useMemo(() => {
        if (!proxyDetails || isFetchingProxy) {
            return [];
        }
        return [
            {
                id: 'name',
                columns: ['Name', proxyDetails.name, ''],
            },
            {
                id: 'status',
                columns: ['Status', <ProxyStatusBadge key="status" status={proxyDetails.status} />, ''],
            },
            {
                id: 'description',
                columns: [
                    'Description',
                    updateDescriptionEditEnable ? (
                        <TextInput
                            key="desc-input"
                            onChange={(value) => setUpdatedDescription(value)}
                            value={updatedDescription}
                            placeholder="Enter Description"
                        />
                    ) : (
                        proxyDetails.description || ''
                    ),
                    <div key="desc-actions">
                        {updateDescriptionEditEnable ? (
                            <div className="flex gap-2">
                                <Button
                                    variant="transparent"
                                    color="secondary"
                                    title="Update Description"
                                    onClick={onUpdateDescriptionConfirmed}
                                    disabled={isUpdatingProxy || updatedDescription === proxyDetails.description}
                                >
                                    <Check size={16} />
                                </Button>
                                <Button
                                    variant="transparent"
                                    color="danger"
                                    title="Cancel"
                                    onClick={() => {
                                        setUpdateDescriptionEditEnable(false);
                                        setUpdatedDescription(proxyDetails?.description || '');
                                    }}
                                    disabled={isUpdatingProxy}
                                >
                                    <X size={16} />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="transparent"
                                color="secondary"
                                title="Update Description"
                                onClick={() => {
                                    setUpdateDescriptionEditEnable(true);
                                }}
                                disabled={isUpdatingProxy}
                            >
                                <EditIcon size={16} />
                            </Button>
                        )}
                    </div>,
                ],
            },
            {
                id: 'lastActivity',
                columns: ['Last Activity', proxyDetails.lastActivity ? dateFormatter(new Date(proxyDetails.lastActivity)) : '-', ''],
            },
            {
                id: 'code',
                columns: ['Code', proxyDetails.code, ''],
            },
        ];
    }, [
        proxyDetails,
        setUpdateDescriptionEditEnable,
        updateDescriptionEditEnable,
        onUpdateDescriptionConfirmed,
        isUpdatingProxy,
        updatedDescription,
        isFetchingProxy,
    ]);

    const showManagedConnectors = useMemo(() => {
        return proxyDetails?.status === ProxyStatus.Connected || proxyDetails?.status === ProxyStatus.Disconnected;
    }, [proxyDetails?.status]);

    const managedConnectorsTableHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'name', key: 'name', content: 'Name', sortable: true, sort: 'asc' },
            { id: 'proxy', key: 'proxy', content: 'Proxy', sortable: true },
            { id: 'url', key: 'url', content: 'URL', sortable: true },
            { id: 'status', key: 'status', content: 'Status', sortable: true },
        ],
        [],
    );

    const managedConnectorsData: TableDataRow[] = useMemo(() => {
        if (!proxyDetails?.connectors || !showManagedConnectors) {
            return [];
        }
        return proxyDetails.connectors.map((connector) => ({
            id: connector.uuid,
            columns: [
                <Link to={`../connectors/detail/${connector.uuid}`} key="connector">
                    {connector.name}
                </Link>,
                <Link to={`../proxies/detail/${proxyDetails.uuid}`} key="proxy">
                    {proxyDetails.name}
                </Link>,
                connector.url,
                <ConnectorStatusBadge status={connector.status} key="status" />,
            ],
        }));
    }, [proxyDetails, showManagedConnectors]);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Proxies)} Inventory`, href: '/proxies' },
                    { label: proxyDetails?.name || 'Proxy Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.ProxyDetails} busy={isBusy} noBorder>
                <Container>
                    <Widget refreshAction={getFreshDetails} title="Details" titleSize="large" widgetButtons={buttons}>
                        <CustomTable data={proxyDetailData} headers={tableHeader} />
                        {showManagedConnectors && (
                            <Widget title="Managed Connectors" titleSize="large" noBorder={true} className="mt-6">
                                <CustomTable headers={managedConnectorsTableHeaders} data={managedConnectorsData} />
                            </Widget>
                        )}
                        {showInstallationInstructions && (
                            <Widget
                                title="Install proxy in your environment"
                                titleSize="large"
                                noBorder={true}
                                className="mt-6"
                                refreshAction={fetchInstallationInstructions}
                            >
                                <div className={'text-gray-500 mb-3'}>Run the Helm command below in the customer Kubernetes cluster.</div>
                                <InstallationInstructions title={'Installation instructions'} instructions={installationInstructions} />
                            </Widget>
                        )}
                    </Widget>
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption={`Delete a Proxy`}
                body={`You are about to delete a Proxy. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
};
