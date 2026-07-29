import { configureStore } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as certificateActions } from 'ducks/certificates';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { actions as tokenProfileActions } from 'ducks/token-profiles';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRegistrationState, CertificateState } from 'types/openapi';

import CompleteRegisteredDialog from './CompleteRegisteredDialog';

export type CompleteRegisteredDialogTestWrapperProps = Readonly<{
    onCancel?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    tokenProfilesOnFetch?: Array<{ uuid: string; name: string }>;
    /**
     * Whether the certificate was pre-registered *with* a challenge, i.e. whether Core created an
     * authorization row (`registration`). Selected by a plain prop rather than an exported fixture:
     * a CT spec cannot import a component and a plain value from the same module.
     */
    challenged?: boolean;
}>;

const testCertificate = (challenged: boolean): CertificateDetailResponseModel =>
    ({
        uuid: 'certificate-uuid',
        commonName: 'test-registered-certificate',
        state: CertificateState.Registered,
        raProfile: {
            uuid: 'ra-profile-uuid',
            name: 'Test RA Profile',
            authorityInstanceUuid: 'authority-uuid',
        },
        // Pre-registering without a challenge skips the authorization row entirely, so there is no
        // challenge to enter at issue time.
        registration: challenged ? { state: CertificateRegistrationState.Active } : undefined,
    }) as CertificateDetailResponseModel;

type CertificatesSlice = ReturnType<typeof testReducers>['certificates'];
type TokenProfilesSlice = ReturnType<typeof testReducers>['tokenprofiles'];

// The shared test-reducers stub the certificates slice as a no-op. Overlay just the issue success/failure
// transitions so this harness can drive the real isIssuing flips the dialog reacts to (e.g. a confirmed
// success closing the dialog), while leaving every other action a no-op so preloaded state stays stable
// (the dialog's mount-time clearIssueErrors / getCsrAttributes must not wipe preloaded fixtures).
function createRootReducer(tokenProfilesOnFetch?: CompleteRegisteredDialogTestWrapperProps['tokenProfilesOnFetch']) {
    return function rootReducer(state: ReturnType<typeof testReducers> | undefined, action: Parameters<typeof testReducers>[1]) {
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
        if (tokenProfilesOnFetch && tokenProfileActions.listTokenProfiles.match(action) && action.payload.enabled) {
            return { ...next, tokenprofiles: { ...next.tokenprofiles, tokenProfiles: tokenProfilesOnFetch } as TokenProfilesSlice };
        }
        return next;
    };
}

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — building the store inside the mounted component (as done here) avoids
 * that entirely. See CertificateFormTestWrapper.tsx for the established precedent.
 */
export function CompleteRegisteredDialogTestWrapper({
    onCancel = () => {},
    preloadedState,
    tokenProfilesOnFetch,
    challenged = true,
}: CompleteRegisteredDialogTestWrapperProps) {
    const certificate = useMemo(() => testCertificate(challenged), [challenged]);

    const store = useMemo(
        () =>
            configureStore({
                reducer: createRootReducer(tokenProfilesOnFetch),
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState, tokenProfilesOnFetch],
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
                        <CompleteRegisteredDialog certificate={certificate} onCancel={handleCancel} />
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
