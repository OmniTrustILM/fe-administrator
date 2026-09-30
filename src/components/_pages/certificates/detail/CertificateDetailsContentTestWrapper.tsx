import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import certificatesReducer, { actions as certificateActions } from 'ducks/certificates';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { type CertificateRegistrationState, CertificateState } from 'types/openapi';

import CertificateDetailsContent from './CertificateDetailsContent';

export type CertificateDetailsContentTestWrapperProps = Readonly<{
    /** State of the certificate's registration authorization; omitted means the certificate has none. */
    registrationState?: CertificateRegistrationState;
}>;

const testCertificate = (registrationState: CertificateRegistrationState | undefined): CertificateDetailResponseModel =>
    ({
        uuid: 'source-uuid',
        commonName: 'app.example',
        subjectDn: 'CN=app.example',
        state: CertificateState.Issued,
        privateKeyAvailability: true,
        raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
        registration: registrationState ? { state: registrationState, failedAttempts: 0 } : undefined,
    }) as unknown as CertificateDetailResponseModel;

type CertificatesSlice = ReturnType<typeof testReducers>['certificates'];

// The operation transitions the dialogs react to run through the real certificates reducer; everything else
// stays a no-op on the stubbed slice.
const dialogActions = [
    certificateActions.renewCertificate,
    certificateActions.renewCertificateSuccess,
    certificateActions.renewCertificateFailure,
    certificateActions.clearRenewErrors,
    certificateActions.rekeyCertificate,
    certificateActions.rekeyCertificateFailure,
    certificateActions.clearRekeyErrors,
    certificateActions.registerCertificate,
    certificateActions.registerCertificateFailure,
    certificateActions.clearRegisterErrors,
];

function rootReducer(state: ReturnType<typeof testReducers> | undefined, action: UnknownAction) {
    const next = testReducers(state, action);
    if (!dialogActions.some((creator) => creator.match(action))) return next;
    const certificates = certificatesReducer(next.certificates as never, action) as unknown as CertificatesSlice;
    return { ...next, certificates };
}

export function CertificateDetailsContentTestWrapper({ registrationState }: CertificateDetailsContentTestWrapperProps) {
    const certificate = useMemo(() => testCertificate(registrationState), [registrationState]);
    const [dispatched, setDispatched] = useState<UnknownAction[]>([]);
    const [refetches, setRefetches] = useState(0);

    const store = useMemo(() => {
        const recorder: Middleware = () => (next) => (action) => {
            const recorded = action as UnknownAction;
            if (recorded.type.startsWith('certificates/')) setDispatched((actions) => [...actions, recorded]);
            return next(action);
        };
        return configureStore({
            reducer: rootReducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(recorder),
            preloadedState: testInitialState,
        });
    }, []);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateDetailsContent
                    certificate={certificate}
                    validationResult={undefined}
                    isBusy={false}
                    getFreshCertificateDetail={() => setRefetches((count) => count + 1)}
                />
                {/* Stand-ins for the epics' outcomes. */}
                <button
                    type="button"
                    data-testid="simulate-renew-failure"
                    onClick={() => store.dispatch(certificateActions.renewCertificateFailure({ error: 'challenge is invalid' }))}
                >
                    renew failure
                </button>
                <button
                    type="button"
                    data-testid="simulate-renew-success"
                    onClick={() => store.dispatch(certificateActions.renewCertificateSuccess({ uuid: 'successor-uuid' }))}
                >
                    renew success
                </button>
                <button
                    type="button"
                    data-testid="simulate-rekey-failure"
                    onClick={() => store.dispatch(certificateActions.rekeyCertificateFailure({ error: 'challenge is invalid' }))}
                >
                    rekey failure
                </button>
                <div data-testid="refetches">{refetches}</div>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateDetailsContentTestWrapper;
