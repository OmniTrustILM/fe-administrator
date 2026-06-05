import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { NotificationProfileDetailModel } from 'types/notification-profiles';
import { PlatformEnum, RecipientType } from 'types/openapi';
import NotificationProfileDetail from './index';

const identity =
    <S,>(initial: S) =>
    (state: S | undefined) =>
        state ?? initial;

const defaultPlatformEnums = {
    [PlatformEnum.RecipientType]: {
        [RecipientType.None]: { label: 'None' },
        [RecipientType.Default]: { label: 'Default' },
        [RecipientType.User]: { label: 'User' },
        [RecipientType.Group]: { label: 'Group' },
        [RecipientType.Role]: { label: 'Role' },
        [RecipientType.Owner]: { label: 'Owner' },
        [RecipientType.Mapped]: { label: 'Mapped' },
    },
};

const defaultNotificationProfile: NotificationProfileDetailModel = {
    uuid: 'np-1',
    name: 'Test Profile',
    description: 'A test notification profile',
    version: 1,
    recipientType: RecipientType.User,
    internalNotification: false,
};

export type NotificationProfileDetailTestWrapperProps = {
    notificationProfile?: NotificationProfileDetailModel;
    platformEnumsOverride?: Record<string, Record<string, { label: string; description?: string }>>;
};

export function NotificationProfileDetailTestWrapper({
    notificationProfile = defaultNotificationProfile,
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
