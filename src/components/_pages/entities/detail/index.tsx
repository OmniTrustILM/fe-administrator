import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/entities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import EntityForm from '../form';

import Label from 'components/Label';
import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function EntityDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const entity = useSelector(selectors.entity);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateEntitySucceeded = useSelector(selectors.updateEntitySucceeded);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetching || isDeleting, [isFetching, isDeleting]);

    const getFreshEntityDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getEntityDetail({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshEntityDetails();
    }, [getFreshEntityDetails, id]);

    useRunOnSuccessfulFinish(isUpdating, updateEntitySucceeded, () => {
        setIsEditModalOpen(false);
        getFreshEntityDetails();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!entity) return;
        setIsEditModalOpen(true);
    }, [entity]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!entity) return;

        dispatch(actions.deleteEntity({ uuid: entity.uuid, redirect: '../../entities' }));
        setConfirmDelete(false);
    }, [entity, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(() => getEditAndDeleteWidgetButtons(onEditClick, setConfirmDelete), [onEditClick]);

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !entity
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', entity.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', entity.name],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', entity.kind],
                      },
                      {
                          id: 'entityProviderUUID',
                          columns: ['Entity Provider UUID', entity.connectorUuid ?? ''],
                      },
                      {
                          id: 'entityProviderName',
                          columns: [
                              'Entity Provider Name',
                              entity.connectorUuid ? (
                                  <Link to={`../../connectors/detail/${entity.connectorUuid}`}>{entity.connectorName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                  ],
        [entity],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="simple" buttonsCount={3} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Entities)} Inventory`, href: '/entities' },
                    { label: entity?.name || 'Entity Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.EntityDetails} busy={isBusy} noBorder>
                <Container>
                    <Widget title="Entity Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshEntityDetails}>
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    <Widget title="Attributes" titleSize="large">
                        <br />
                        <Label>Entity Attributes</Label>
                        <AttributeViewer attributes={entity?.attributes} />
                    </Widget>

                    {entity && (
                        <CustomAttributeWidget
                            resource={Resource.Entities}
                            resourceUuid={entity.uuid}
                            attributes={entity.customAttributes}
                        />
                    )}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Entity"
                body="You are about to delete Entity. Is this what you want to do?"
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
                caption="Edit Entity"
                size="xl"
                body={<EntityForm entityId={entity?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
            />
        </div>
    );
}
