import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/certificateGroups';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import GroupForm from '../form';

import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import EventsTable from 'components/_pages/notifications/events-settings/EventsTable';
import TabLayout from 'components/Layout/TabLayout';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';

export default function GroupDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const group = useSelector(selectors.certificateGroup);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateGroupSucceeded = useSelector(selectors.updateGroupSucceeded);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshGroupDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.getGroupDetail({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshGroupDetails();
    }, [getFreshGroupDetails, id]);

    useRunOnSuccessfulFinish(isUpdating, updateGroupSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshGroupDetails();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!group) return;
        setIsEditModalOpen(true);
    }, [group]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onDeleteConfirmed = useCallback(() => {
        if (!group) return;

        dispatch(actions.deleteGroup({ uuid: group.uuid }));
        setConfirmDelete(false);
    }, [group, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(() => getEditAndDeleteWidgetButtons(onEditClick, setConfirmDelete), [onEditClick]);

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !group
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', group.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', group.name],
                      },
                      {
                          id: 'email',
                          columns: ['Email', group.email || ''],
                      },
                      {
                          id: 'description',
                          columns: ['Description', group.description || ''],
                      },
                  ],
        [group],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="tabs" tabCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Groups)} Inventory`, href: '/groups' },
                    { label: group?.name || 'Group Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.GroupDetails} busy={isFetchingDetail} noBorder>
                <Container>
                    <TabLayout
                        tabs={[
                            {
                                title: 'Details',
                                content: (
                                    <Container>
                                        <Widget
                                            title="Group Details"
                                            widgetButtons={buttons}
                                            titleSize="large"
                                            refreshAction={getFreshGroupDetails}
                                        >
                                            <CustomTable headers={detailHeaders} data={detailData} />
                                        </Widget>

                                        {group && (
                                            <CustomAttributeWidget
                                                resource={Resource.Groups}
                                                resourceUuid={group.uuid}
                                                attributes={group.customAttributes}
                                            />
                                        )}
                                    </Container>
                                ),
                            },
                            {
                                title: 'Events',
                                content: (
                                    <>
                                        {group && (
                                            <EventsTable
                                                mode="association"
                                                resource={Resource.Groups}
                                                resourceUuid={group.uuid}
                                                widgetLocks={[LockWidgetNameEnum.GroupDetails, LockWidgetNameEnum.EventSettings]}
                                            />
                                        )}
                                    </>
                                ),
                            },
                        ]}
                    />
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Group"
                body="You are about to delete a Group. Is this what you want to do?"
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
                caption="Edit Group"
                size="xl"
                body={<GroupForm groupId={group?.uuid} onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
            />
        </div>
    );
}
