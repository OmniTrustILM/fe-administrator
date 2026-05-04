import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/credentials';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import CredentialForm from '../form';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

function CredentialDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const credential = useSelector(selectors.credential);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateCredentialSucceeded = useSelector(selectors.updateCredentialSucceeded);

    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshCredentialDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getCredentialDetail({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshCredentialDetails();
    }, [getFreshCredentialDetails, id]);

    useRunOnSuccessfulFinish(isUpdating, updateCredentialSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshCredentialDetails();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!credential) return;
        setIsEditModalOpen(true);
    }, [credential]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!credential) return;
        dispatch(actions.deleteCredential({ uuid: credential.uuid }));
        setConfirmDelete(false);
    }, [dispatch, credential]);

    const onForceDeleteConfirmed = useCallback(() => {
        if (!credential) return;
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.deleteCredential({ uuid: credential.uuid }));
    }, [dispatch, credential]);

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
        ],
        [onEditClick, setConfirmDelete],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !credential
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', credential.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', credential.name],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', credential.kind],
                      },
                      {
                          id: 'credentialProviderName',
                          columns: [
                              'Credential Provider Name',
                              credential.connectorUuid ? (
                                  <Link to={`../../connectors/detail/${credential.connectorUuid}`}>{credential.connectorName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'credentialProviderUuid',
                          columns: ['Credential Provider UUID', credential.connectorUuid ?? ''],
                      },
                  ],
        [credential],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Credentials)} Inventory`, href: '/credentials' },
                    { label: credential?.name || 'Credential Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.CredentialDetails} busy={isFetching || isDeleting} noBorder>
                <Container>
                    <Widget
                        title="Credential Details"
                        widgetButtons={widgetButtons}
                        titleSize="large"
                        refreshAction={getFreshCredentialDetails}
                    >
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    {credential && credential.attributes && credential.attributes.length > 0 && (
                        <Widget title="Credential Attributes" titleSize="large">
                            <AttributeViewer attributes={credential?.attributes} />
                        </Widget>
                    )}

                    {credential && (
                        <CustomAttributeWidget
                            resource={Resource.Credentials}
                            resourceUuid={credential.uuid}
                            attributes={credential.customAttributes}
                        />
                    )}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Credential"
                body="You are about to delete a Credential. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage !== ''}
                caption="Delete Connector"
                body={
                    <>
                        Failed to delete the Credential as the Credential has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force' },
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Cancel',
                    },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Credential"
                size="xl"
                body={<CredentialForm credentialId={credential?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
            />
        </div>
    );
}

export default CredentialDetail;
