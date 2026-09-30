import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import certificatesReducer, { actions as certificateActions } from 'ducks/certificates';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';
import { AttributeContentType, AttributeType, AttributeVersion, type CertificateRegistrationState, CertificateState } from 'types/openapi';

import CertificateRenewDialog from './index';

type RenewData = { fileContent?: string; authorizationSecret?: string; attributes?: unknown[] };

export type CertificateRenewDialogTestWrapperProps = Readonly<{
    /** Replaces the generated certificate entirely (registrationState and identity are then ignored). */
    certificate?: CertificateDetailResponseModel;
    /** State of the source's registration authorization; omitted means the certificate has none. */
    registrationState?: CertificateRegistrationState;
    /** Where the source's identity lives: CSR attributes, or only the flat subject DN and SANs. */
    identity?: 'csrAttributes' | 'flat';
    allowWithoutFile?: boolean;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    onRenew?: (data: RenewData) => void;
    onRegister?: (request: CertificateRegistrationRequestModel) => void;
    onCancel?: () => void;
}>;

const testCertificate = (
    registrationState: CertificateRegistrationState | undefined,
    identity: 'csrAttributes' | 'flat',
): CertificateDetailResponseModel =>
    ({
        uuid: 'source-uuid',
        commonName: 'app.example',
        subjectDn: 'CN=app.example,O=Example',
        subjectAlternativeNames: { dNSName: ['app.example'] },
        state: CertificateState.Issued,
        privateKeyAvailability: true,
        raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
        registration: registrationState ? { state: registrationState, failedAttempts: 0 } : undefined,
        customAttributes: [
            {
                uuid: 'custom-uuid',
                name: 'department',
                label: 'Department',
                type: AttributeType.Custom,
                contentType: AttributeContentType.String,
                version: AttributeVersion.V2,
                content: [{ data: 'operations' }],
            },
        ],
        certificateRequest:
            identity === 'csrAttributes'
                ? {
                      attributes: [
                          {
                              uuid: 'cn-uuid',
                              name: 'commonName',
                              label: 'Common Name',
                              type: AttributeType.Data,
                              contentType: AttributeContentType.String,
                              version: AttributeVersion.V3,
                              content: [{ data: 'app.example', contentType: AttributeContentType.String }],
                          },
                      ],
                  }
                : undefined,
    }) as unknown as CertificateDetailResponseModel;

type CertificatesSlice = ReturnType<typeof testReducers>['certificates'];

// The renew/register transitions the dialog reacts to (in-flight flags, inline errors) run through the real
// certificates reducer; every other action stays a no-op on the stubbed slice so preloaded fixtures hold.
const dialogActions = [
    certificateActions.renewCertificate,
    certificateActions.renewCertificateSuccess,
    certificateActions.renewCertificateFailure,
    certificateActions.clearRenewErrors,
    certificateActions.registerCertificate,
    certificateActions.registerCertificateSuccess,
    certificateActions.registerCertificateFailure,
    certificateActions.clearRegisterErrors,
];

function rootReducer(state: ReturnType<typeof testReducers> | undefined, action: UnknownAction) {
    const next = testReducers(state, action);
    if (!dialogActions.some((creator) => creator.match(action))) return next;
    const certificates = certificatesReducer(next.certificates as never, action) as unknown as CertificatesSlice;
    return { ...next, certificates };
}

/** Mirrors the real parent (CertificateDetailsContent): renew/register dispatch, and onCancel or onDone unmounts the dialog. */
export function CertificateRenewDialogTestWrapper({
    certificate: certificateOverride,
    registrationState,
    identity = 'csrAttributes',
    allowWithoutFile = true,
    preloadedState,
    onRenew,
    onRegister,
    onCancel,
}: CertificateRenewDialogTestWrapperProps) {
    const certificate = useMemo(
        () => certificateOverride ?? testCertificate(registrationState, identity),
        [certificateOverride, registrationState, identity],
    );
    const [dispatched, setDispatched] = useState<UnknownAction[]>([]);
    const [renewPayload, setRenewPayload] = useState<RenewData>();

    const store = useMemo(() => {
        const recorder: Middleware = () => (next) => (action) => {
            const recorded = action as UnknownAction;
            if (recorded.type.startsWith('certificates/')) setDispatched((actions) => [...actions, recorded]);
            return next(action);
        };
        return configureStore({
            reducer: rootReducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(recorder),
            preloadedState: { ...testInitialState, ...preloadedState },
        });
    }, [preloadedState]);

    const [open, setOpen] = useState(true);

    return (
        <Provider store={store}>
            <MemoryRouter>
                {open ? (
                    <CertificateRenewDialog
                        certificate={certificate}
                        allowWithoutFile={allowWithoutFile}
                        onRenew={(data) => {
                            onRenew?.(data);
                            setRenewPayload(data);
                            store.dispatch(
                                certificateActions.renewCertificate({
                                    uuid: certificate.uuid,
                                    authorityUuid: 'authority-uuid',
                                    raProfileUuid: 'ra-profile-uuid',
                                    renewRequest: { authorizationSecret: data.authorizationSecret },
                                }),
                            );
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
                        onCancel={() => {
                            setOpen(false);
                            onCancel?.();
                        }}
                        onDone={() => setOpen(false)}
                    />
                ) : (
                    <div data-testid="dialog-closed" />
                )}
                {/* Stand-ins for the epics' outcomes. */}
                <button
                    type="button"
                    data-testid="simulate-renew-failure"
                    onClick={() =>
                        store.dispatch(
                            certificateActions.renewCertificateFailure({
                                error: 'Failed to renew certificate (422): The certificate registration challenge is invalid.',
                            }),
                        )
                    }
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
                <div data-testid="renew-payload">{renewPayload ? JSON.stringify(renewPayload) : ''}</div>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateRenewDialogTestWrapper;
