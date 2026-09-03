import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider, useSelector } from 'react-redux';

import { type BrandingTestState, testInitialState, testReducers } from 'ducks/test-reducers';

import AppearanceSettings from './AppearanceSettings';

export type AppearanceSettingsTestWrapperProps = Readonly<{
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary, so the store is built inside the mounted component. See
 * CertificateSettingsFormTestWrapper.tsx for the established precedent.
 */
export function AppearanceSettingsTestWrapper({ preloadedState }: AppearanceSettingsTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState],
    );

    return (
        <Provider store={store}>
            <AppearanceSettings />
            <SentBranding />
        </Provider>
    );
}

/** Renders what the save or reset put in the store, so a test can assert the payload without epics. */
function SentBranding() {
    const sent = useSelector((state: { branding: BrandingTestState }) => state.branding.sentBranding);

    return <output data-testid="sent-branding">{sent === undefined ? 'none' : JSON.stringify(sent)}</output>;
}

export default AppearanceSettingsTestWrapper;
