import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/certificateGroups';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import GroupForm from '../form';

import { LockWidgetNameEnum } from 'types/user-interface';
import { PlatformEnum, Resource, ResourceAction } from '../../../../types/openapi';
import { useActionAvailability } from 'utils/useActionAvailability';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import EventsTable from 'components/_pages/notifications/events-settings/EventsTable';
import ObjectEventHistoryWidget from 'components/_pages/notifications/events-settings/ObjectEventHistoryWidget';
import TabLayout from 'components/Layout/TabLayout';
import { getEditAndDeleteWidgetButtons, createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';

export default function GroupDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();
    const can = useActionAvailability(Resource.Groups, id);

    const group = useSelector(selectors.certificateGroup);
    const groupUsers = useSelector(selectors.groupUsers);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isFetchingGroupUsers = useSelector(selectors.isFetchingGroupUsers);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateGroupSucceeded = useSelector(selectors.updateGroupSucceeded);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshGroupDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.getGroupDetail({ uuid: id }));
    }, [id, dispatch]);

    const getFreshGroupUsers = useCallback(() => {
        if (!id) return;
        dispatch(actions.getGroupUsers({ uuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshGroupDetails();
    }, [getFreshGroupDetails]);

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

    const buttons: WidgetButtonProps[] = useMemo(
        () => getEditAndDeleteWidgetButtons(onEditClick, setConfirmDelete, can),
        [onEditClick, can],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            group
                ? [
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
                  ]
                : [],
        [group],
    );

    const usersHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'username', content: 'Username', sortable: true, sort: 'asc', width: '30%' },
            { id: 'uuid', content: 'UUID', sortable: true },
        ],
        [],
    );

    const usersData: TableDataRow[] = useMemo(
        () =>
            groupUsers.map((user) => ({
                id: user.uuid,
                columns: [
                    <Link key="username" to={`../users/detail/${user.uuid}`}>
                        {user.name}
                    </Link>,
                    <span key="uuid" className="font-mono text-xs text-content-subtle">
                        {user.uuid}
                    </span>,
                ],
            })),
        [groupUsers],
    );

    if (isFetchingDetail && !group) {
        return <DetailPageSkeleton layout="tabs" tabCount={4} />;
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
                        tabUrlParam="tab"
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
                                                requires={can(ResourceAction.Update)}
                                            />
                                        )}
                                    </Container>
                                ),
                            },
                            {
                                title: 'Users',
                                onClick: getFreshGroupUsers,
                                content: (
                                    <Widget
                                        title="Users"
                                        titleSize="large"
                                        busy={isFetchingGroupUsers}
                                        widgetLockName={LockWidgetNameEnum.GroupUsers}
                                        refreshAction={getFreshGroupUsers}
                                    >
                                        <CustomTable
                                            headers={usersHeaders}
                                            data={usersData}
                                            canSearch={true}
                                            hasPagination={true}
                                            isLoading={isFetchingGroupUsers && groupUsers.length === 0}
                                            emptyStateDescription="No users are assigned to this group"
                                        />
                                    </Widget>
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
                            {
                                title: 'Event History',
                                content: group ? <ObjectEventHistoryWidget resource={Resource.Groups} uuid={group.uuid} /> : null,
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
