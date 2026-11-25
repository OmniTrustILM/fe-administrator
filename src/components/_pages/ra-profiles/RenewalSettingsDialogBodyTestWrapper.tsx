import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as raProfilesActions } from 'ducks/ra-profiles';
import { testInitialState, testReducers } from 'ducks/test-reducers';

import type { RaProfileResponseModel } from 'types/ra-profiles';

import RenewalSettingsDialogBody from './RenewalSettingsDialogBody';

export type RenewalSettingsDialogBodyTestWrapperProps = Readonly<{
    raProfile?: RaProfileResponseModel;
    isUpdating?: boolean;
    onUpdateRenewalSettings?: (payload: unknown) => void;
    onClose?: () => void;
}>;

export function RenewalSettingsDialogBodyTestWrapper({
    raProfile,
    isUpdating = false,
    onUpdateRenewalSettings,
    onClose = () => {},
}: RenewalSettingsDialogBodyTestWrapperProps) {
    const store = useMemo(() => {
        const captureMiddleware: Middleware = () => (next) => (action) => {
            const typed = action as UnknownAction;
            if (typed.type === raProfilesActions.updateRaProfileRenewalSettings.type) {
                onUpdateRenewalSettings?.(typed.payload);
            }
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
            preloadedState: {
                ...testInitialState,
                raprofiles: {
                    isUpdating: false,
                    isUpdatingRenewalSettings: isUpdating,
                    isCreating: false,
                    createRaProfileSucceeded: false,
                    createdRaProfileUuid: null,
                    raProfiles: [],
                },
            },
        });
    }, [isUpdating, onUpdateRenewalSettings]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <RenewalSettingsDialogBody raProfile={raProfile} onClose={onClose} />
            </MemoryRouter>
        </Provider>
    );
}
