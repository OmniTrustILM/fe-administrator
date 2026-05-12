import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions, selectors } from 'ducks/notifications';

import { ArrowRight, Bell, BellDot, Check } from 'lucide-react';
import Dropdown from 'components/Dropdown';
import { useNavigate, Link } from 'react-router';
import Button from 'components/Button';
import { LockWidgetNameEnum } from 'types/user-interface';
import { formatTimeAgo } from 'utils/dateUtil';
import Widget from 'components/Widget';

function NotificationsOverview() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const overviewNotifications = useSelector(selectors.overviewNotifications);

    const isFetchingOverview = useSelector(selectors.isFetchingOverview);

    const notificationsList: React.ReactNode = useMemo(
        () =>
            overviewNotifications.length === 0
                ? 'No unread notifications'
                : overviewNotifications.map((notification, index) => (
                      <React.Fragment key={notification.uuid}>
                          <div className="flex items-start gap-1 mb-2">
                              <Button
                                  variant="transparent"
                                  title="Mark as read"
                                  onClick={() => dispatch(actions.markAsReadNotification({ uuid: notification.uuid }))}
                              >
                                  <Check size={16} />
                              </Button>
                              <div>
                                  <div className="text-sm leading-[16px] font-medium text-gray-800">{notification.message}</div>
                                  <span className="text-xs leading-[16px] text-gray-500 mr-2 whitespace-nowrap">
                                      {formatTimeAgo(notification.sentAt)}
                                  </span>
                                  <Button
                                      color="secondary"
                                      className="!rounded-full !p-0.5 relative top-[1px]"
                                      onClick={() => {
                                          navigate(
                                              `/${notification.targetObjectType}/detail/${notification.targetObjectIdentification?.reduce(
                                                  (prev, curr) => prev + '/' + curr,
                                              )}`,
                                          );
                                          setOpen(false);
                                      }}
                                  >
                                      <ArrowRight size={10} strokeWidth={3} />
                                  </Button>
                              </div>
                          </div>
                          {index < overviewNotifications.length - 1 && <hr className="border-gray-200 mb-2" />}
                      </React.Fragment>
                  )),
        [overviewNotifications, dispatch, navigate],
    );

    const hasNewMessages = overviewNotifications.length > 0;

    return (
        <Dropdown
            title={
                <div className="flex items-center gap-2 text-white">
                    {hasNewMessages ? (
                        <BellDot size={24} strokeWidth={1.5} className="[&_circle]:fill-yellow-500 [&_circle]:stroke-yellow-500" />
                    ) : (
                        <Bell size={24} strokeWidth={1.5} />
                    )}
                    <span className="sr-only">Notifications</span>
                </div>
            }
            btnStyle="transparent"
            menuClassName="max-w-[360px]"
            menu={
                <Widget
                    busy={isFetchingOverview}
                    widgetLockName={LockWidgetNameEnum.NotificationsOverview}
                    className="!p-0"
                    noBorder
                    hideWidgetButtons={true}
                >
                    <div className="max-h-[360px] overflow-y-auto pt-2">{notificationsList}</div>
                    <div className="sticky bottom-0 bg-white pt-2 border-t border-gray-200">
                        <Link to="/notifications" className="w-full" onClick={() => setOpen(false)}>
                            <Button color="secondary" className="w-full justify-center">
                                View all notifications
                            </Button>
                        </Link>
                    </div>
                </Widget>
            }
            hideArrow
            open={open}
            onOpenChange={setOpen}
        />
    );
}

export default NotificationsOverview;
