import BooleanBadge from 'components/BooleanBadge/BooleanBadge';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions, selectors } from 'ducks/notification-profiles';
import { actions as notificationActions, selectors as notificationSelectors } from 'ducks/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import NotificationProfileForm from '../form';

import Badge from 'components/Badge';
import { PlatformEnum, RecipientType } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { getInputStringFromIso8601String } from 'utils/duration';
import Dialog from 'components/Dialog';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function NotificationProfileDetail() {
    const { id, version } = useParams();

    const dispatch = useDispatch();

    const notificationProfile = useSelector(selectors.notificationProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateNotificationProfileSucceeded = useSelector(selectors.updateNotificationProfileSucceeded);

    const notificationInstance = useSelector(notificationSelectors.notificationInstanceDetail);
    const isFetchingNotificationInstanceDetail = useSelector(notificationSelectors.isFetchingNotificationInstanceDetail);

    const recipientTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.RecipientType));

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshData = useCallback(() => {
        if (!id || !version) return;
        dispatch(actions.getNotificationProfileDetail({ uuid: id, version: Number(version) }));
    }, [dispatch, id, version]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        dispatch(notificationActions.clearNotificationInstanceDetail());
        if (!notificationProfile?.notificationInstance?.uuid) return;
        dispatch(notificationActions.getNotificationInstance({ uuid: notificationProfile.notificationInstance.uuid }));
    }, [dispatch, notificationProfile]);

    useRunOnSuccessfulFinish(isUpdating, updateNotificationProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshData();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditNotificationProfile = useCallback(() => {
        if (!id || !version) return;
        setIsEditModalOpen(true);
    }, [id, version]);

    const onDeleteNotificationProfile = useCallback(() => {
        setConfirmDelete(true);
    }, []);

    const onDeleteConfirmed = useCallback(() => {
        if (!id || !version) return;
        dispatch(actions.deleteNotificationProfile({ uuid: id, redirect: '../notificationprofiles' }));
        setConfirmDelete(false);
    }, [dispatch, id, version]);

    const notificationProfileWidgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditNotificationProfile();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    onDeleteNotificationProfile();
                },
            },
        ],
        [onEditNotificationProfile, onDeleteNotificationProfile],
    );

    const headers: TableHeader[] = useMemo(
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
    const recipientHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'uuid',
                content: 'Recipient UUID',
            },
            {
                id: 'name',
                content: 'Recipient Name',
            },
        ],
        [],
    );
    const profileData: TableDataRow[] = useMemo(
        () =>
            !notificationProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', notificationProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', notificationProfile.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', notificationProfile.description ?? ''],
                      },
                      {
                          id: 'version',
                          columns: ['Profile Version', notificationProfile.version.toString()],
                      },
                      {
                          id: 'recipientType',
                          columns: [
                              'Recipient Type',
                              <Badge key="recipientType" color="secondary">
                                  {getEnumLabel(recipientTypeEnum, notificationProfile.recipientType)}
                              </Badge>,
                          ],
                      },
                      {
                          id: 'internalNotification',
                          columns: [
                              'Internal Notification',
                              <BooleanBadge key="internalNotification" value={notificationProfile.internalNotification} />,
                          ],
                      },
                      {
                          id: 'frequency',
                          columns: [
                              'Frequency',
                              notificationProfile.frequency ? getInputStringFromIso8601String(notificationProfile.frequency) : '',
                          ],
                      },
                      {
                          id: 'repetitions',
                          columns: ['Max Repetitions', notificationProfile.repetitions?.toString() ?? ''],
                      },
                  ],
        [notificationProfile, recipientTypeEnum],
    );
    const recipientsData: TableDataRow[] = useMemo(
        () =>
            !notificationProfile?.recipients
                ? []
                : notificationProfile.recipients?.map((recipient) => ({
                      id: recipient.uuid,
                      columns: [
                          recipient.uuid ?? '',
                          <Link
                              key="name"
                              to={(() => {
                                  switch (notificationProfile.recipientType) {
                                      case RecipientType.User:
                                          return `../../../users/detail/${recipient.uuid}`;
                                      case RecipientType.Group:
                                          return `../../../groups/detail/${recipient.uuid}`;
                                      case RecipientType.Role:
                                          return `../../../roles/detail/${recipient.uuid}`;
                                      case RecipientType.None:
                                      case RecipientType.Owner:
                                      default:
                                          return '';
                                  }
                              })()}
                          >
                              {recipient.name}
                          </Link>,
                      ],
                  })),
        [notificationProfile],
    );
    const notificationInstanceData: TableDataRow[] = useMemo(
        () =>
            !notificationInstance
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', notificationInstance.uuid],
                      },
                      {
                          id: 'name',
                          columns: [
                              'Name',
                              <Link key="name" to={`../../../notificationinstances/detail/${notificationInstance.uuid}`}>
                                  {notificationInstance.name}
                              </Link>,
                          ],
                      },
                      {
                          id: 'description',
                          columns: ['Description', notificationInstance.description ?? ''],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', notificationInstance.kind ?? ''],
                      },
                      {
                          id: 'notificationProviderUuid',
                          columns: ['Notification Provider Uuid', notificationInstance.connectorUuid],
                      },
                      {
                          id: 'notificationProviderName',
                          columns: [
                              'Notification Provider Name',
                              <Link key="notificationProviderName" to={`../../../connectors/detail/${notificationInstance.connectorUuid}`}>
                                  {notificationInstance.connectorName}
                              </Link>,
                          ],
                      },
                  ],
        [notificationInstance],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Notification Profiles', href: '/notificationprofiles' },
                    { label: notificationProfile?.name || 'Notification Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.NotificationProfileDetails} busy={isFetchingDetail} noBorder>
                <Container className="md:grid grid-cols-2">
                    <Widget
                        title="Notification Profile Details"
                        widgetButtons={notificationProfileWidgetButtons}
                        titleSize="large"
                        refreshAction={getFreshData}
                    >
                        <CustomTable headers={headers} data={profileData} />
                    </Widget>
                    <Widget
                        title="Notification Instance Details"
                        busy={isFetchingDetail || isFetchingNotificationInstanceDetail}
                        titleSize="large"
                    >
                        <CustomTable headers={headers} data={notificationInstanceData} />
                    </Widget>
                </Container>
                {!!notificationProfile?.recipients?.length && (
                    <Widget title="Recipients" busy={isFetchingDetail || isFetchingNotificationInstanceDetail} titleSize="large">
                        <CustomTable headers={recipientHeaders} data={recipientsData} />
                    </Widget>
                )}
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Notification Profile"
                body="You are about to delete a Notification Profile. Is this what you want to do?"
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
                caption="Edit Notification Profile"
                size="xl"
                body={<NotificationProfileForm notificationProfileId={id} version={version} onCancel={handleCloseEditModal} />}
            />
        </div>
    );
}
