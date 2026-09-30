import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import certificatesReducer, { actions as certificateActions } from 'ducks/certificates';

import type { CertificateDetailResponseModel } from 'types/certificate';
import { type CertificateRegistrationState, CertificateState } from 'types/openapi';
import { overlaySliceReducer, useRecordingStore } from 'utils/test-helpers';

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

const rootReducer = overlaySliceReducer('certificates', certificatesReducer, dialogActions);

export function CertificateDetailsContentTestWrapper({ registrationState }: CertificateDetailsContentTestWrapperProps) {
    const certificate = useMemo(() => testCertificate(registrationState), [registrationState]);
    const [refetches, setRefetches] = useState(0);

    const { store, dispatched } = useRecordingStore(undefined, 'certificates/', rootReducer);

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
