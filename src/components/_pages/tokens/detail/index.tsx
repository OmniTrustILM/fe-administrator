import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import TokenStatusBadge from 'components/_pages/tokens/TokenStatusBadge';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions as keyActions, selectors as keySelectors } from 'ducks/cryptographic-keys';
import { actions, selectors } from 'ducks/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import TokenForm from '../form';
import { PlatformEnum, Resource, TokenInstanceStatus } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import TokenActivationDialogBody from '../TokenActivationDialogBody';
import RandomDataGeneration from './RandomDataGeneration';
import { createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';

export default function TokenDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const token = useSelector(selectors.token);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isActivating = useSelector(selectors.isActivating);
    const isDeactivating = useSelector(selectors.isDeactivating);
    const isReloading = useSelector(selectors.isReloading);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateTokenSucceeded = useSelector(selectors.updateTokenSucceeded);

    const isSyncing = useSelector(keySelectors.isSyncing);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmDeactivation, setConfirmDeactivation] = useState<boolean>(false);
    const [activateToken, setActivateToken] = useState<boolean>(false);
    const [randomDataGeneration, setRandomDataGeneration] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(
        () => isFetching || isDeleting || isActivating || isDeactivating || isReloading || isSyncing,
        [isFetching, isDeleting, isActivating, isDeactivating, isReloading, isSyncing],
    );

    const getFreshTokenDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getTokenDetail({ uuid: id }));
    }, [dispatch, id]);

    const getFreshAttributes = useCallback(() => {
        if (!id) return;
        dispatch(actions.listActivationAttributeDescriptors({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshTokenDetails();
        getFreshAttributes();
    }, [getFreshTokenDetails, getFreshAttributes, id]);

    useRunOnSuccessfulFinish(isUpdating, updateTokenSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshTokenDetails();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!token) return;
        setIsEditModalOpen(true);
    }, [token]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!token) return;

        dispatch(actions.deleteToken({ uuid: token.uuid }));
        setConfirmDelete(false);
    }, [token, dispatch]);

    const onDeactivationConfirmed = useCallback(() => {
        if (!token) return;

        dispatch(actions.deactivateToken({ uuid: token.uuid }));
        setConfirmDeactivation(false);
    }, [token, dispatch]);

    const onReload = useCallback(() => {
        if (!token) return;

        dispatch(actions.reloadToken({ uuid: token.uuid }));
    }, [token, dispatch]);

    const onSync = useCallback(() => {
        if (!token) return;

        dispatch(keyActions.syncKeys({ tokenInstanceUuid: token.uuid }));
    }, [token, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
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
                icon: 'reload',
                disabled: false,
                tooltip: 'Reload Status',
                onClick: () => {
                    onReload();
                },
            },
            {
                icon: 'refresh',
                disabled: token?.status.status !== TokenInstanceStatus.Activated,
                tooltip: 'Sync Keys',
                onClick: () => {
                    onSync();
                },
            },
            {
                icon: 'check',
                disabled: token?.status.status !== TokenInstanceStatus.Deactivated,
                tooltip: 'Activate',
                onClick: () => {
                    setActivateToken(true);
                },
            },
            {
                icon: 'times',
                disabled: token?.status.status !== TokenInstanceStatus.Activated,
                tooltip: 'Deactivate',
                onClick: () => {
                    setConfirmDeactivation(true);
                },
            },
            {
                icon: 'random',
                disabled: token?.status.status !== TokenInstanceStatus.Activated,
                tooltip: 'Generate Random',
                onClick: () => {
                    setRandomDataGeneration(true);
                },
            },
        ],
        [onEditClick, onReload, token?.status.status, onSync, setRandomDataGeneration],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !token
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', token.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', token.name],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <TokenStatusBadge status={token.status.status} />],
                      },
                      {
                          id: 'cryptographyProviderUUID',
                          columns: ['Cryptography Provider UUID', token.connectorUuid || ''],
                      },
                      {
                          id: 'cryptographyProviderName',
                          columns: [
                              'Cryptography Provider Name',
                              token.connectorUuid ? (
                                  <Link to={`../../connectors/detail/${token.connectorUuid}`}>{token.connectorName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', token.kind || ''],
                      },
                      {
                          id: 'tokenProfiles',
                          columns: ['Number of Token Profiles', token.tokenProfiles.toString()],
                      },
                  ],
        [token],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="simple" buttonsCount={5} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Tokens)} Inventory`, href: '/tokens' },
                    { label: token?.name || 'Token Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.TokenDetails} busy={isBusy} noBorder>
                <Container>
                    <Widget title="Token Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshTokenDetails}>
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    <Widget title="Token Attributes" titleSize="large" refreshAction={getFreshAttributes}>
                        <AttributeViewer attributes={token?.attributes} />
                    </Widget>

                    {token && (
                        <CustomAttributeWidget resource={Resource.Tokens} resourceUuid={token.uuid} attributes={token.customAttributes} />
                    )}

                    <Widget title="Metadata" titleSize="large">
                        <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={token?.metadata} />
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Token"
                body="You are about to delete Token. If you continue, objects
                  related to the token will fail. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmDeactivation}
                caption="Deactivate Token"
                body="You are about to deactivate Token. If you continue, objects
                  related to the token not work. Is this what you want to do?"
                toggle={() => setConfirmDeactivation(false)}
                buttons={[
                    { color: 'danger', onClick: onDeactivationConfirmed, body: 'Deactivate' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivation(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={activateToken}
                caption="Activate Token"
                body={TokenActivationDialogBody({
                    visible: activateToken,
                    onClose: () => setActivateToken(false),
                    tokenUuid: token?.uuid,
                })}
                toggle={() => setActivateToken(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={randomDataGeneration}
                caption="Random Data Generation"
                body={RandomDataGeneration({
                    visible: randomDataGeneration,
                    onClose: () => setRandomDataGeneration(false),
                    tokenUuid: token?.uuid,
                })}
                toggle={() => setRandomDataGeneration(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Token"
                size="xl"
                body={<TokenForm tokenId={token?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
            />
        </div>
    );
}
