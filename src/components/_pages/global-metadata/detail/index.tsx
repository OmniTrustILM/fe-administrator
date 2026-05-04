import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';

import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/globalMetadata';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Badge from 'components/Badge';
import { PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders } from 'utils/widget';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import GlobalMetadataForm from '../form';

export default function GlobalMetadataDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const globalMetadata = useSelector(selectors.globalMetadata);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshGlobalMetadata = useCallback(() => {
        if (!id) return;
        dispatch(actions.getGlobalMetadata(id));
    }, [id, dispatch]);

    useEffect(() => {
        if (!id) return;
        if (!globalMetadata || id !== globalMetadata.uuid) {
            dispatch(actions.getGlobalMetadata(id));
        }
    }, [dispatch, globalMetadata, id]);

    const handleOpenEditModal = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        getFreshGlobalMetadata();
    }, [getFreshGlobalMetadata]);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!globalMetadata) return;
        dispatch(actions.deleteGlobalMetadata(globalMetadata.uuid));
        setConfirmDelete(false);
    }, [globalMetadata, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(() => getEditAndDeleteWidgetButtons(onEditClick, setConfirmDelete), [onEditClick]);

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !globalMetadata
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', globalMetadata.uuid],
                      },
                      {
                          id: 'version',
                          columns: ['Version', globalMetadata.version || ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', globalMetadata.name],
                      },
                      {
                          id: 'label',
                          columns: ['Label', globalMetadata.label],
                      },
                      {
                          id: 'description',
                          columns: ['Description', globalMetadata.description],
                      },
                      {
                          id: 'contentType',
                          columns: ['Content Type', getEnumLabel(attributeContentTypeEnum, globalMetadata.contentType)],
                      },
                      {
                          id: 'group',
                          columns: ['Group', globalMetadata.group ?? ''],
                      },
                      {
                          id: 'visible',
                          columns: [
                              'Visible',
                              globalMetadata.visible ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,
                          ],
                      },
                  ],
        [globalMetadata, attributeContentTypeEnum],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.GlobalMetadata)} Inventory`, href: '/globalmetadata' },
                    { label: globalMetadata?.name || 'Global Metadata Details', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.GlobalMetadataDetails} busy={isFetchingDetail} noBorder>
                <Container>
                    <Widget
                        title="Global Metadata Details"
                        widgetButtons={buttons}
                        titleSize="large"
                        refreshAction={getFreshGlobalMetadata}
                    >
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Global Metadata"
                body="You are about to delete a Global Metadata. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Global Metadata"
                size="xl"
                body={
                    <GlobalMetadataForm
                        globalMetadataId={globalMetadata?.uuid}
                        onCancel={handleCloseEditModal}
                        onSuccess={handleCloseEditModal}
                    />
                }
            />
        </div>
    );
}
