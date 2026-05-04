import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';

import { actions as vaultActions, selectors as vaultSelectors } from 'ducks/vaults';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from 'types/openapi';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import { createWidgetDetailHeaders } from 'utils/widget';
import VaultEditForm from '../edit-form';

function VaultDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const vault = useSelector(vaultSelectors.vault);
    const isFetchingDetail = useSelector(vaultSelectors.isFetchingDetail);
    const isDeleting = useSelector(vaultSelectors.isDeleting);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const getFreshVaultDetails = useCallback(() => {
        if (!id) return;
        dispatch(vaultActions.resetState());
        dispatch(vaultActions.getVaultDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshVaultDetails();
    }, [getFreshVaultDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!vault) return;
        dispatch(vaultActions.deleteVault({ uuid: vault.uuid }));
        setConfirmDelete(false);
    }, [dispatch, vault]);

    const handleCloseEdit = useCallback(() => setIsEditOpen(false), []);

    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: !vault,
                tooltip: 'Edit',
                onClick: () => setIsEditOpen(true),
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [vault],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            vault
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', vault.uuid],
                      },
                      {
                          id: 'description',
                          columns: ['Description', vault.description ?? ''],
                      },
                      {
                          id: 'connector',
                          columns: [
                              'Connector',
                              vault.connector ? (
                                  <Link to={`/${Resource.Connectors.toLowerCase()}/detail/${vault.connector.uuid}`}>
                                      {vault.connector.name}
                                  </Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                  ]
                : [],
        [vault],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={3} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Vaults)} Inventory`, href: `/${Resource.Vaults.toLowerCase()}` },
                    { label: vault?.name || 'Vault Details', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.VaultDetails} busy={isFetchingDetail || isDeleting} noBorder>
                <div className="space-y-4">
                    <Container className="grid gap-6 xl:grid-cols-2 items-start">
                        <Widget
                            title="Vault Details"
                            widgetButtons={widgetButtons}
                            titleSize="large"
                            refreshAction={getFreshVaultDetails}
                            lockSize="large"
                        >
                            <CustomTable headers={detailHeaders} data={detailData} />
                        </Widget>

                        {vault?.attributes && vault.attributes.length > 0 && (
                            <Widget title="Attributes" titleSize="large">
                                <AttributeViewer attributes={vault.attributes} />
                            </Widget>
                        )}
                    </Container>

                    {vault && (
                        <Container>
                            <CustomAttributeWidget
                                resource={Resource.Vaults}
                                resourceUuid={vault.uuid}
                                attributes={vault.customAttributes}
                            />
                        </Container>
                    )}
                </div>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Vault"
                body="You are about to delete a Vault. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
            <Dialog
                isOpen={isEditOpen}
                toggle={handleCloseEdit}
                caption={`Edit "${vault?.name ?? ''}"`}
                size="xl"
                body={<VaultEditForm vault={vault} onCancel={handleCloseEdit} onSuccess={handleCloseEdit} />}
            />
        </div>
    );
}

export default VaultDetail;
