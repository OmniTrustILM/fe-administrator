import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import certificatesReducer, { actions as certificateActions } from 'ducks/certificates';
import { actions as connectorActions } from 'ducks/connectors';
import { testInitialState, type testReducers } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';
import { AttributeContentType, AttributeType, type CertificateRegistrationState, CertificateState } from 'types/openapi';
import { overlaySliceReducer, useRecordingStore } from 'utils/test-helpers';

import CertificateRekeyDialog from './index';

export type CertificateRekeyDialogTestWrapperProps = Readonly<{
    /** Replaces the generated certificate entirely (registrationState is then ignored). */
    certificate?: CertificateDetailResponseModel;
    /** State of the certificate's registration authorization; omitted means the certificate has none. */
    registrationState?: CertificateRegistrationState;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    onRegister?: (request: CertificateRegistrationRequestModel) => void;
    onCancel?: () => void;
}>;

const testCertificate = (registrationState: CertificateRegistrationState | undefined): CertificateDetailResponseModel =>
    ({
        uuid: 'certificate-uuid',
        commonName: 'test-certificate',
        subjectDn: 'CN=test-certificate',
        subjectAlternativeNames: { dNSName: ['test.example'] },
        state: CertificateState.Issued,
        privateKeyAvailability: false,
        raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
        registration: registrationState ? { state: registrationState, failedAttempts: 0 } : undefined,
    }) as unknown as CertificateDetailResponseModel;

// The rekey/register transitions the dialog reacts to run through the real certificates reducer; everything else
// stays a no-op on the stubbed slice.
const dialogActions = [
    certificateActions.rekeyCertificate,
    certificateActions.rekeyCertificateSuccess,
    certificateActions.rekeyCertificateFailure,
    certificateActions.clearRekeyErrors,
    certificateActions.registerCertificate,
    certificateActions.registerCertificateSuccess,
    certificateActions.registerCertificateFailure,
    certificateActions.clearRegisterErrors,
];

// Register waits for the RA profile's register schema; stand in a loaded, empty one unless a test brings its own.
const loadedRegisterSchema = { certificates: { ...testInitialState.certificates, registerAttributes: { 'ra-profile-uuid': [] } } };

const callbackAddedDescriptor = {
    type: AttributeType.Data,
    name: 'callbackField',
    uuid: 'callback-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Callback Field', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const rootReducer = overlaySliceReducer('certificates', certificatesReducer, dialogActions);

/** Mirrors the real parent (CertificateDetailsContent): onCancel or onDone closes the dialog and unmounts its body. */
export function CertificateRekeyDialogTestWrapper({
    certificate: certificateOverride,
    registrationState,
    preloadedState,
    onRegister,
    onCancel,
}: CertificateRekeyDialogTestWrapperProps) {
    const certificate = useMemo(() => certificateOverride ?? testCertificate(registrationState), [certificateOverride, registrationState]);

    const { store, dispatched } = useRecordingStore(preloadedState ?? loadedRegisterSchema, '', rootReducer);

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
                        onRegister={(request) => {
                            onRegister?.(request);
                            store.dispatch(
                                certificateActions.registerCertificate({
                                    authorityUuid: 'authority-uuid',
                                    raProfileUuid: 'ra-profile-uuid',
                                    registerRequest: request,
                                    inlineErrors: true,
                                }),
                            );
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
                <button
                    type="button"
                    data-testid="simulate-register-failure"
                    onClick={() =>
                        store.dispatch(
                            certificateActions.registerCertificateFailure({
                                error: 'Failed to register certificate (422): Cannot register a successor of an archived certificate.',
                            }),
                        )
                    }
                >
                    register failure
                </button>
                <button
                    type="button"
                    data-testid="simulate-register-success"
                    onClick={() => store.dispatch(certificateActions.registerCertificateSuccess({ uuid: 'placeholder-uuid' }))}
                >
                    register success
                </button>
                <button
                    type="button"
                    data-testid="simulate-signature-callback"
                    onClick={() =>
                        store.dispatch(
                            connectorActions.callbackSuccess({
                                callbackId: '__attributes__signatureAttributes__.signatureField',
                                data: [callbackAddedDescriptor],
                            }),
                        )
                    }
                >
                    signature callback
                </button>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRekeyDialogTestWrapper;
