import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import { actions } from 'ducks/settings';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { SettingsPlatformUpdateModel } from 'types/settings';

import UtilsSettingsForm from './UtilsSettingsForm';

export type UtilsSettingsFormTestWrapperProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
    /** Receives the body of every platform-settings update the form dispatches (the test store runs no epics). */
    onUpdate?: (request: SettingsPlatformUpdateModel) => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

/**
 * Builds the Redux store inside the mounted tree, as CertificateSettingsFormTestWrapper does: a store created in the
 * test file does not survive the Playwright CT Node/browser boundary.
 */
export function UtilsSettingsFormTestWrapper({ onCancel, onSuccess, onUpdate, preloadedState }: UtilsSettingsFormTestWrapperProps) {
    const store = useMemo(() => {
        const reportUpdates: Middleware = () => (next) => (action) => {
            if (actions.updatePlatformSettings.match(action)) {
                onUpdate?.(action.payload);
            }
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(reportUpdates),
            preloadedState: { ...testInitialState, ...preloadedState },
        });
    }, [onUpdate, preloadedState]);

    return (
        <Provider store={store}>
            <UtilsSettingsForm onCancel={onCancel} onSuccess={onSuccess} />
        </Provider>
    );
}

export default UtilsSettingsFormTestWrapper;
