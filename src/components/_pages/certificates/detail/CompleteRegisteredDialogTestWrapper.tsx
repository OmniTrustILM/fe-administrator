import { configureStore } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as certificateActions } from 'ducks/certificates';
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

type CertificatesSlice = ReturnType<typeof testReducers>['certificates'];

// The shared test-reducers stub the certificates slice as a no-op. Overlay just the issue success/failure
// transitions so this harness can drive the real isIssuing flips the dialog reacts to (e.g. a confirmed
// success closing the dialog), while leaving every other action a no-op so preloaded state stays stable
// (the dialog's mount-time clearIssueErrors / getCsrAttributes must not wipe preloaded fixtures).
function rootReducer(state: ReturnType<typeof testReducers> | undefined, action: Parameters<typeof testReducers>[1]) {
    const next = testReducers(state, action);
    if (certificateActions.issueCertificateSuccess.match(action)) {
        return { ...next, certificates: { ...next.certificates, isIssuing: false } as CertificatesSlice };
    }
    if (certificateActions.issueCertificateFailure.match(action)) {
        return {
            ...next,
            certificates: {
                ...next.certificates,
                isIssuing: false,
                issueErrorMessage: action.payload.error,
                issueValidationErrors: action.payload.validationErrors,
            } as CertificatesSlice,
        };
    }
    return next;
}

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — building the store inside the mounted component (as done here) avoids
 * that entirely. See CertificateFormTestWrapper.tsx for the established precedent.
 */
export function CompleteRegisteredDialogTestWrapper({ onCancel = () => {}, preloadedState }: CompleteRegisteredDialogTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: rootReducer,
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
                    <>
                        <CompleteRegisteredDialog certificate={testCertificate} onCancel={handleCancel} />
                        {/* Stand-in for the epic: flips isIssuing true→false with no error so the dialog can
                            observe a confirmed success (the real success redirect can be a same-URL no-op). */}
                        <button
                            type="button"
                            data-testid="simulate-success"
                            onClick={() => store.dispatch(certificateActions.issueCertificateSuccess({ uuid: 'issued-uuid' }))}
                        >
                            simulate success
                        </button>
                    </>
                ) : (
                    <div data-testid="dialog-closed" />
                )}
            </MemoryRouter>
        </Provider>
    );
}

export default CompleteRegisteredDialogTestWrapper;
