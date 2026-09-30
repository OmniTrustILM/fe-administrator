import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import certificatesReducer, { actions as certificateActions } from 'ducks/certificates';
import type { testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { type CertificateRegistrationState, CertificateState } from 'types/openapi';
import { overlaySliceReducer, useRecordingStore } from 'utils/test-helpers';

import CertificateRekeyDialog from './index';

export type CertificateRekeyDialogTestWrapperProps = Readonly<{
    /** Replaces the generated certificate entirely (registrationState is then ignored). */
    certificate?: CertificateDetailResponseModel;
    /** State of the certificate's registration authorization; omitted means the certificate has none. */
    registrationState?: CertificateRegistrationState;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    onCancel?: () => void;
}>;

const testCertificate = (registrationState: CertificateRegistrationState | undefined): CertificateDetailResponseModel =>
    ({
        uuid: 'certificate-uuid',
        commonName: 'test-certificate',
        state: CertificateState.Issued,
        privateKeyAvailability: false,
        raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
        registration: registrationState ? { state: registrationState, failedAttempts: 0 } : undefined,
    }) as unknown as CertificateDetailResponseModel;

// The rekey transitions the dialog reacts to run through the real certificates reducer; everything else stays
// a no-op on the stubbed slice.
const dialogActions = [
    certificateActions.rekeyCertificate,
    certificateActions.rekeyCertificateSuccess,
    certificateActions.rekeyCertificateFailure,
    certificateActions.clearRekeyErrors,
];

const rootReducer = overlaySliceReducer('certificates', certificatesReducer, dialogActions);

/** Mirrors the real parent (CertificateDetailsContent): onCancel or onDone closes the dialog and unmounts its body. */
export function CertificateRekeyDialogTestWrapper({
    certificate: certificateOverride,
    registrationState,
    preloadedState,
    onCancel,
}: CertificateRekeyDialogTestWrapperProps) {
    const certificate = useMemo(() => certificateOverride ?? testCertificate(registrationState), [certificateOverride, registrationState]);

    const { store, dispatched } = useRecordingStore(preloadedState, 'certificates/', rootReducer);

    const [open, setOpen] = useState(true);

    return (
        <Provider store={store}>
            <MemoryRouter>
                {open ? (
                    <CertificateRekeyDialog
                        certificate={certificate}
                        onCancel={() => {
                            setOpen(false);
                            onCancel?.();
                        }}
                        onDone={() => setOpen(false)}
                    />
                ) : (
                    <div data-testid="dialog-closed" />
                )}
                {/* Stand-ins for the epic's outcomes. */}
                <button
                    type="button"
                    data-testid="simulate-rekey-failure"
                    onClick={() =>
                        store.dispatch(
                            certificateActions.rekeyCertificateFailure({
                                error: 'Failed to rekey certificate (422): The certificate registration authorization is locked after too many failed attempts.',
                            }),
                        )
                    }
                >
                    rekey failure
                </button>
                <button
                    type="button"
                    data-testid="simulate-rekey-success"
                    onClick={() => store.dispatch(certificateActions.rekeyCertificateSuccess({ uuid: 'successor-uuid' }))}
                >
                    rekey success
                </button>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRekeyDialogTestWrapper;
