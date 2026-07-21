import { configureStore } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';

import CompleteRegisteredDialog from './CompleteRegisteredDialog';

export type CompleteRegisteredDialogTestWrapperProps = Readonly<{
    onCancel?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

const testCertificate: CertificateDetailResponseModel = {
    uuid: 'certificate-uuid',
    commonName: 'test-registered-certificate',
    state: CertificateState.Registered,
    raProfile: {
        uuid: 'ra-profile-uuid',
        name: 'Test RA Profile',
        authorityInstanceUuid: 'authority-uuid',
    },
} as CertificateDetailResponseModel;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — building the store inside the mounted component (as done here) avoids
 * that entirely. See CertificateFormTestWrapper.tsx for the established precedent.
 */
export function CompleteRegisteredDialogTestWrapper({ onCancel = () => {}, preloadedState }: CompleteRegisteredDialogTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState],
    );

    // Mirror the real parent (CertificateDetailsContent): onCancel closes the dialog and unmounts its body.
    const [open, setOpen] = useState(true);
    const handleCancel = () => {
        setOpen(false);
        onCancel();
    };

    return (
        <Provider store={store}>
            <MemoryRouter>
                {open ? (
                    <CompleteRegisteredDialog certificate={testCertificate} onCancel={handleCancel} />
                ) : (
                    <div data-testid="dialog-closed" />
                )}
            </MemoryRouter>
        </Provider>
    );
}

export default CompleteRegisteredDialogTestWrapper;
