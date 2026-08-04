import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { useMemo } from 'react';
import type { NotificationProfileDetailModel } from 'types/notification-profiles';
import { defaultPlatformEnums, identity } from '../notificationProfileTestFixtures';
import NotificationProfileForm from './index';

export type NotificationProfileFormTestWrapperProps = {
    notificationInstances?: { uuid: string; name: string }[];
    platformEnumsOverride?: Record<string, Record<string, { label: string; description?: string }>>;
    /** Mounts the edit form for this profile; specs can replace it via window.__setTestProfile to simulate a refetch. */
    notificationProfile?: NotificationProfileDetailModel;
};

type ProfileSliceState = {
    notificationProfile?: NotificationProfileDetailModel;
    isFetchingDetail: boolean;
    isUpdating: boolean;
    isCreating: boolean;
};

// Minimal reducer: holds the profile and accepts a test-only replace action so specs can
// simulate a detail refetch landing after mount.
const profileSliceReducer =
    (initial: ProfileSliceState) =>
    (state: ProfileSliceState | undefined, action: { type: string; payload?: NotificationProfileDetailModel }): ProfileSliceState => {
        const current = state ?? initial;
        if (action.type === '__test/setNotificationProfile') {
            return { ...current, notificationProfile: action.payload };
        }
        return current;
    };

export function NotificationProfileFormTestWrapper({
    notificationInstances = [{ uuid: 'ni-1', name: 'Email Instance' }],
    platformEnumsOverride,
    notificationProfile,
}: Readonly<NotificationProfileFormTestWrapperProps>) {
    const store = useMemo(() => {
        const platformEnums = { ...defaultPlatformEnums, ...platformEnumsOverride };
        return configureStore({
            reducer: {
                enums: identity({ platformEnums }),
                notificationProfiles: profileSliceReducer({
                    notificationProfile,
                    isFetchingDetail: false,
                    isUpdating: false,
                    isCreating: false,
                }),
                notifications: identity({
                    notificationInstances,
                    isFetchingNotificationInstances: false,
                }),
                users: identity({ users: [{ uuid: 'u-1', username: 'alice' }] }),
                roles: identity({ roles: [{ uuid: 'r-1', name: 'Admin' }] }),
                certificateGroups: identity({ certificateGroups: [{ uuid: 'g-1', name: 'Group A' }] }),
                userInterface: identity({ widgetLocks: [] }),
            },
            middleware: (getDefault) =>
                getDefault({ serializableCheck: false }).concat(() => (next) => (action) => {
                    // Expose every dispatched action so specs can assert submitted payloads.
                    const capture = window as unknown as { __dispatchedActions?: unknown[] };
                    capture.__dispatchedActions = capture.__dispatchedActions ?? [];
                    capture.__dispatchedActions.push(action);
                    return next(action);
                }),
        });
    }, [notificationInstances, platformEnumsOverride, notificationProfile]);

    (window as unknown as { __setTestProfile?: (profile: NotificationProfileDetailModel) => void }).__setTestProfile = (profile) =>
        store.dispatch({ type: '__test/setNotificationProfile', payload: profile });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/notificationprofiles/create']}>
                {notificationProfile ? (
                    <NotificationProfileForm
                        notificationProfileId={notificationProfile.uuid}
                        version={String(notificationProfile.version)}
                    />
                ) : (
                    <NotificationProfileForm />
                )}
            </MemoryRouter>
        </Provider>
    );
}
