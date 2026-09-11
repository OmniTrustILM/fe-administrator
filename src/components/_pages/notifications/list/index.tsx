import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { EntityType } from 'ducks/filters';
import { actions, selectors } from 'ducks/notifications';
import { selectors as pagingSelectors } from 'ducks/paging';

import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { useNavigate } from 'react-router';
import Button from 'components/Button';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { notificationTargetPath } from 'utils/comment-anchor';
import { dateFormatter } from 'utils/dateUtil';
import { ArrowRight } from 'lucide-react';

function NotificationsList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const notifications = useSelector(selectors.notifications);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isMarking = useSelector(selectors.isMarking);
    const isBulkMarking = useSelector(selectors.isBulkMarking);
    const isBusy = isDeleting || isMarking || isBulkDeleting || isBulkMarking;

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.NOTIFICATIONS));

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Mark as read',
                onClick: () =>
                    checkedRows.length > 1
                        ? dispatch(actions.bulkMarkNotificationAsRead({ uuids: checkedRows }))
                        : dispatch(actions.markAsReadNotification({ uuid: checkedRows[0] })),
            },
        ],
        [checkedRows, dispatch],
    );

    const notificationsRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Sent At',
                id: 'sent',
                width: '10%',
            },
            {
                content: 'Message',
                id: 'message',
                width: '50%',
            },
        ],
        [],
    );

    const notificationsList: TableDataRow[] = useMemo(
        () =>
            notifications.map((notification) => {
                const targetPath = notificationTargetPath(notification);
                return {
                    id: notification.uuid,
                    columns: [
                        dateFormatter(notification.sentAt),
                        <div key={notification.uuid} className={`flex items-center ${notification.readAt ? '' : 'font-semibold'}`}>
                            <button
                                type="button"
                                className="text-left bg-transparent border-0 p-0 font-inherit"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (!notification.readAt) {
                                        dispatch(actions.markAsReadNotification({ uuid: notification.uuid }));
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.stopPropagation();
                                        if (!notification.readAt) {
                                            dispatch(actions.markAsReadNotification({ uuid: notification.uuid }));
                                        }
                                    }
                                }}
                            >
                                {notification.message}
                            </button>
                            {targetPath && (
                                <Button color="secondary" className="ml-2 !rounded-full !p-0.5" onClick={() => navigate(targetPath)}>
                                    <ArrowRight size={10} strokeWidth={3} />
                                </Button>
                            )}
                        </div>,
                    ],
                    detailColumns: notification.detail ? [notification.detail] : undefined,
                };
            }),
        [notifications, dispatch, navigate],
    );
    const onListCallback = useCallback(
        (pagination: SearchRequestModel) => dispatch(actions.listNotifications({ unread: false, pagination })),
        [dispatch],
    );

    return (
        <PagedList
            entity={EntityType.NOTIFICATIONS}
            onListCallback={onListCallback}
            onDeleteCallback={(uuids) =>
                uuids.length > 1
                    ? dispatch(actions.bulkDeleteNotification({ uuids }))
                    : dispatch(actions.deleteNotification({ uuid: uuids[0] }))
            }
            headers={notificationsRowHeaders}
            data={notificationsList}
            isBusy={isBusy}
            addHidden
            title="List of notifications"
            entityNameSingular="a Notification"
            entityNamePlural="Notifications"
            pageWidgetLockName={LockWidgetNameEnum.ListOfNotifications}
            additionalButtons={buttons}
            hasDetails
            columnForDetail="message"
        />
    );
}

export default NotificationsList;
