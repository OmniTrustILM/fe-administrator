import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as raProfilesActions } from 'ducks/ra-profiles';
import { testInitialState, testReducers } from 'ducks/test-reducers';

import type { RaProfileResponseModel } from 'types/ra-profiles';
import type { SettingsPlatformModel } from 'types/settings';

import RequestValidationDialogBody from './RequestValidationDialogBody';

export type RequestValidationDialogBodyTestWrapperProps = Readonly<{
    raProfile?: RaProfileResponseModel;
    platformSettings?: SettingsPlatformModel;
    isUpdating?: boolean;
    onUpdateRequestAttributes?: (payload: unknown) => void;
    onClose?: () => void;
}>;

export function RequestValidationDialogBodyTestWrapper({
    raProfile,
    platformSettings,
    isUpdating = false,
    onUpdateRequestAttributes,
    onClose = () => {},
}: RequestValidationDialogBodyTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat(
                        (_store: any) => (next: (arg0: any) => any) => (action: any) => {
                            if (action.type === raProfilesActions.updateRaProfileRequestAttributes.type) {
                                onUpdateRequestAttributes?.(action.payload);
                            }
                            return next(action);
                        },
                    ),
                preloadedState: {
                    ...testInitialState,
                    raprofiles: { isUpdating, raProfiles: [] },
                },
            }),
        [isUpdating, onUpdateRequestAttributes],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <RequestValidationDialogBody raProfile={raProfile} platformSettings={platformSettings} onClose={onClose} />
            </MemoryRouter>
        </Provider>
    );
}
