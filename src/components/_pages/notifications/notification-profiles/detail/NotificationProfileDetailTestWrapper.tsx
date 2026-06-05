import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { NotificationProfileDetailModel } from 'types/notification-profiles';
import { defaultNotificationProfileDetail, defaultPlatformEnums, identity } from '../notificationProfileTestFixtures';
import NotificationProfileDetail from './index';

export type NotificationProfileDetailTestWrapperProps = {
    notificationProfile?: NotificationProfileDetailModel;
    platformEnumsOverride?: Record<string, Record<string, { label: string; description?: string }>>;
};

export function NotificationProfileDetailTestWrapper({
    notificationProfile = defaultNotificationProfileDetail,
    platformEnumsOverride,
}: Readonly<NotificationProfileDetailTestWrapperProps>) {
    const store = useMemo(() => {
        const platformEnums = { ...defaultPlatformEnums, ...platformEnumsOverride };
        return configureStore({
            reducer: {
                enums: identity({ platformEnums }),
                notificationProfiles: identity({
                    notificationProfile,
                    isFetchingDetail: false,
                    isUpdating: false,
                    updateNotificationProfileSucceeded: false,
                }),
                notifications: identity({
                    notificationInstanceDetail: undefined,
                    isFetchingNotificationInstanceDetail: false,
                }),
                userInterface: identity({ widgetLocks: [] }),
            },
            middleware: (getDefault) => getDefault({ serializableCheck: false }),
        });
    }, [notificationProfile, platformEnumsOverride]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/notificationprofiles/detail']}>
                <NotificationProfileDetail />
            </MemoryRouter>
        </Provider>
    );
}
