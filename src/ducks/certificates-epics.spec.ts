import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, Subject, throwError, type Observable } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

// Break the certificates-epics → ../App → ../store → ducks/index → certificates-epics cycle
// by stubbing the App module. Epic logic doesn't need the real store in unit tests.
vi.mock('../App', () => ({ store: { dispatch: () => {} } }));

// Stub the heavy transform module (it pulls in React components that drag the
// full ducks/index.ts → store.ts chain back through this file). Tests only need
// the identity passthrough.
vi.mock('./transform/certificates', () => ({
    transformCertificateDetailResponseDtoToModel: (cert: unknown) => cert,
    transformCertificateRevokeRequestModelToDto: (req: unknown) => req,
    transformSearchRequestModelToDto: (req: unknown) => req,
    transformCertificateBulkDeleteRequestModelToDto: (req: unknown) => req,
    transformCertificateBulkObjectModelToDto: (req: unknown) => req,
    transformCertificateRenewRequestModelToDto: (req: unknown) => req,
    transformCertificateRekeyRequestModelToDto: (req: unknown) => req,
    transformCertificateSignRequestModelToDto: (req: unknown) => req,
    transformCertificateComplianceCheckDtoToModel: (req: unknown) => req,
    transformCertificateContentResponseDtoToModel: (req: unknown) => req,
    transformCertificateRelationsDtoToModel: (req: unknown) => req,
    transformValidationCertificateResultDtoToModel: (req: unknown) => req,
    transformCertificateChainResponseDtoToModel: (req: unknown) => req,
    transformCertificateHistoryDtoToModel: (req: unknown) => req,
    transformCertificateHistoryResponseDtoToModel: (req: unknown) => req,
    transformDownloadCertificateChainResponseDtoToModel: (req: unknown) => req,
    transformDownloadCertificateResponseDtoToModel: (req: unknown) => req,
    transformCertificateResponseDtoToModel: (req: unknown) => req,
    transformCertificateListResponseDtoToModel: (req: unknown) => req,
    transformCertificateUploadModelToDto: (req: unknown) => req,
    transformCertificateRegistrationRequestModelToDto: (req: unknown) => req,
}));

import { actions as certificatesActions } from './certificates';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';

const ASSOCIATE_EPIC_INDEX = 3;
const DEASSOCIATE_EPIC_INDEX = 4;
const ISSUE_EPIC_INDEX = 8;
const REGISTER_EPIC_INDEX = 10;
const COMPLETE_REGISTERED_EPIC_INDEX = 11;
const REVOKE_EPIC_INDEX = 12;
const MANUALLY_ISSUE_EPIC_INDEX = 15;
const MANUALLY_CONFIRM_REVOKE_EPIC_INDEX = 16;
const CANCEL_PENDING_EPIC_INDEX = 17;
const BULK_UPDATE_RA_PROFILE_EPIC_INDEX = 32;
const UPLOAD_EPIC_INDEX = 35;

type ClientOpsOverrides = {
    issueCertificate?: (args: any) => any;
    revokeCertificate?: (args: any) => any;
    manuallyIssueCertificate?: (args: any) => any;
    manuallyConfirmRevoke?: (args: any) => any;
    cancelPendingCertificateOperation?: (args: any) => any;
};

import certificatesEpics from './certificates-epics';

async function runEpic(
    epicIndex: number,
    action: UnknownAction,
    overrides: ClientOpsOverrides = {},
    takeCount = 4,
): Promise<UnknownAction[]> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];

    const minimalCert = {
        uuid: 'cert-1',
        commonName: 'cn',
        subjectDn: 'CN=cn',
        publicKeyAlgorithm: 'RSA',
        signatureAlgorithm: 'SHA256withRSA',
        keySize: 2048,
        state: 'issued',
        validationStatus: 'valid',
        privateKeyAvailability: false,
    };

    const defaults = {
        revokeCertificate: () => of(undefined),
        manuallyIssueCertificate: () => of(minimalCert),
        manuallyConfirmRevoke: () => of(undefined),
        cancelPendingCertificateOperation: () => of(minimalCert),
    };

    const deps = {
        apiClients: {
            clientOperations: { ...defaults, ...overrides },
        },
    };

    const output$ = epics[epicIndex](of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

async function runUploadEpic(
    action: UnknownAction,
    certificatesOverrides: { uploadAsync?: (args: any) => any } = {},
    takeCount = 2,
): Promise<UnknownAction[]> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const deps = {
        apiClients: {
            certificates: {
                uploadAsync: () => of({ fingerprint: 'fp-1' }),
                ...certificatesOverrides,
            },
        },
    };
    const state$ = { value: { certificates: { isIncludeArchived: false } } };
    const output$ = epics[UPLOAD_EPIC_INDEX](of(action), state$ as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

async function runAssociateEpic(
    action: UnknownAction,
    associateCertificates: (args: any) => any = () => of(undefined),
    takeCount = 1,
): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const calls: any[] = [];
    const deps = {
        apiClients: {
            certificates: {
                associateCertificates: (args: any) => {
                    calls.push(args);
                    return associateCertificates(args);
                },
            },
        },
    };
    const output$ = epics[ASSOCIATE_EPIC_INDEX](of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
    return { emitted, calls };
}

async function runDeassociateEpic(
    action: UnknownAction,
    removeCertificateAssociation: (args: any) => any = () => of(undefined),
    takeCount = 1,
): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const calls: any[] = [];
    const deps = {
        apiClients: {
            certificates: {
                removeCertificateAssociation: (args: any) => {
                    calls.push(args);
                    return removeCertificateAssociation(args);
                },
            },
        },
    };
    const output$ = epics[DEASSOCIATE_EPIC_INDEX](of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
    return { emitted, calls };
}

async function runRegisterEpic(
    action: UnknownAction,
    registerCertificate: (args: any) => any = () => of({ uuid: 'cert-1' }),
    takeCount = 3,
): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const calls: any[] = [];
    const deps = {
        apiClients: {
            clientOperations: {
                registerCertificate: (args: any) => {
                    calls.push(args);
                    return registerCertificate(args);
                },
            },
        },
    };
    const output$ = epics[REGISTER_EPIC_INDEX](of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
    return { emitted, calls };
}

async function runCompleteRegisteredEpic(
    action: UnknownAction,
    issueExistingCertificate: (args: any) => any = () => of({ uuid: 'cert-1' }),
    takeCount = 3,
): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const calls: any[] = [];
    const deps = {
        apiClients: {
            clientOperations: {
                issueExistingCertificate: (args: any) => {
                    calls.push(args);
                    return issueExistingCertificate(args);
                },
            },
        },
    };
    const output$ = epics[COMPLETE_REGISTERED_EPIC_INDEX](of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
    return { emitted, calls };
}

describe('certificates epics', () => {
    const issueAction = certificatesActions.issueCertificate({
        authorityUuid: 'auth-1',
        raProfileUuid: 'ra-1',
        signRequest: {} as any,
    });

    test('issueCertificate emits Success and redirect on success', async () => {
        const emitted = await runEpic(ISSUE_EPIC_INDEX, issueAction, {
            issueCertificate: () => of({ uuid: 'cert-1', certificateData: 'data' }),
        });

        expect(emitted).toHaveLength(2);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateSuccess.type);
        expect(emitted[1].type).toBe(appRedirectActions.redirect.type);
    });

    test('issueCertificate 422 failure carries the validation-error list and suppresses the generic fetch error', async () => {
        const emitted = await runEpic(ISSUE_EPIC_INDEX, issueAction, {
            issueCertificate: () => throwError(() => ({ status: 422, response: ['e1', 'e2'] })),
        });

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toEqual(['e1', 'e2']);
    });

    test('issueCertificate wrapped 400 policy failure carries the violation lines', async () => {
        const message =
            "Failed to submit certificate request: Uploaded certificate request does not satisfy the request-attribute policy of RA profile 'p' \nSubject RDN 'O' is not allowed by the request-attribute set";
        const emitted = await runEpic(ISSUE_EPIC_INDEX, issueAction, {
            issueCertificate: () => throwError(() => ({ status: 400, response: { message } })),
        });

        expect(emitted).toHaveLength(1);
        expect((emitted[0] as any).payload.validationErrors).toEqual(["Subject RDN 'O' is not allowed by the request-attribute set"]);
    });

    test('issueCertificate generic failure emits Failure without validation errors and a fetch error', async () => {
        const emitted = await runEpic(ISSUE_EPIC_INDEX, issueAction, {
            issueCertificate: () => throwError(() => ({ status: 500, response: { message: 'boom' } })),
        });

        expect(emitted).toHaveLength(2);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toBeUndefined();
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    const registerAction = certificatesActions.registerCertificate({
        authorityUuid: 'auth-1',
        raProfileUuid: 'ra-1',
        registerRequest: { authorizationSecret: 'secret', attributes: [] },
    });

    test('registerCertificate success emits Success, redirect, and a success alert', async () => {
        const { emitted, calls } = await runRegisterEpic(registerAction, () => of({ uuid: 'cert-1' }));

        expect(calls[0]).toMatchObject({ authorityUuid: 'auth-1', raProfileUuid: 'ra-1' });
        expect(emitted).toHaveLength(3);
        expect(emitted[0].type).toBe(certificatesActions.registerCertificateSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('cert-1');
        expect(emitted[1].type).toBe(appRedirectActions.redirect.type);
        expect(emitted[2].type).toBe(alertActions.success.type);
    });

    test('registerCertificate 422 failure carries the validation-error list and suppresses the generic fetch error', async () => {
        const { emitted } = await runRegisterEpic(registerAction, () => throwError(() => ({ status: 422, response: ['e1', 'e2'] })), 1);

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(certificatesActions.registerCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toEqual(['e1', 'e2']);
    });

    test('registerCertificate generic failure emits Failure without validation errors and a fetch error', async () => {
        const { emitted } = await runRegisterEpic(
            registerAction,
            () => throwError(() => ({ status: 500, response: { message: 'boom' } })),
            2,
        );

        expect(emitted).toHaveLength(2);
        expect(emitted[0].type).toBe(certificatesActions.registerCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toBeUndefined();
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    const completeRegisteredFailureAction = certificatesActions.completeRegisteredCertificate({
        authorityUuid: 'auth-1',
        raProfileUuid: 'ra-1',
        certificateUuid: 'cert-1',
        request: 'BASE64CSR',
        format: 'PKCS10' as any,
        authorizationSecret: 'secret',
        attributes: [],
    });

    test('completeRegisteredCertificate 422 failure carries the validation-error list for the inline panel', async () => {
        const { emitted } = await runCompleteRegisteredEpic(
            completeRegisteredFailureAction,
            () => throwError(() => ({ status: 422, response: { message: 'challenge rejected' } })),
            1,
        );

        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toEqual(['challenge rejected']);
    });

    test('completeRegisteredCertificate failure emits only the inline Failure — no toast, no detail refetch', async () => {
        const { emitted } = await runCompleteRegisteredEpic(
            completeRegisteredFailureAction,
            () => throwError(() => ({ status: 500, response: { message: 'boom' } })),
            1,
        );

        // The dialog renders the error inline and stays open, so it is the single source of truth: no
        // global fetchError toast, and no getCertificateDetail refetch (which would unmount the dialog).
        expect(emitted).toHaveLength(1);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateFailure.type);
        expect((emitted[0] as any).payload.validationErrors).toBeUndefined();
        expect(emitted.some((a) => a.type === appRedirectActions.fetchError.type)).toBe(false);
        expect(emitted.some((a) => a.type === certificatesActions.getCertificateDetail.type)).toBe(false);
    });

    test('completeRegisteredCertificate CSR-upload mode forwards request/format without key fields', async () => {
        const { calls } = await runCompleteRegisteredEpic(
            certificatesActions.completeRegisteredCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                certificateUuid: 'cert-1',
                request: 'BASE64CSR',
                format: 'PKCS10' as any,
                authorizationSecret: 'secret',
                attributes: [],
            }),
        );

        expect(calls[0].clientCertificateIssueRequestDto).toEqual({
            request: 'BASE64CSR',
            format: 'PKCS10',
            authorizationSecret: 'secret',
            attributes: [],
            tokenProfileUuid: undefined,
            keyUuid: undefined,
            signatureAttributes: undefined,
            csrAttributes: undefined,
        });
    });

    test('completeRegisteredCertificate existing-key mode forwards key + csrAttributes so the backend can generate the CSR from an empty request', async () => {
        const { emitted, calls } = await runCompleteRegisteredEpic(
            certificatesActions.completeRegisteredCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                certificateUuid: 'cert-1',
                request: '',
                authorizationSecret: 'secret',
                attributes: [],
                tokenProfileUuid: 'token-profile-uuid',
                keyUuid: 'key-uuid',
                signatureAttributes: [{ name: 'sig-attr', content: [{ data: 'v' }] } as any],
                csrAttributes: [{ name: 'commonName', content: [{ data: 'example.com' }] } as any],
            }),
            () => of({ uuid: 'cert-1' }),
        );

        expect(calls[0].clientCertificateIssueRequestDto).toMatchObject({
            request: '',
            tokenProfileUuid: 'token-profile-uuid',
            keyUuid: 'key-uuid',
        });
        expect(calls[0].clientCertificateIssueRequestDto.signatureAttributes).toEqual([{ name: 'sig-attr', content: [{ data: 'v' }] }]);
        // The backend builds the CSR from these identity attributes, so they must reach the request.
        expect(calls[0].clientCertificateIssueRequestDto.csrAttributes).toEqual([
            { name: 'commonName', content: [{ data: 'example.com' }] },
        ]);
        expect(emitted[0].type).toBe(certificatesActions.issueCertificateSuccess.type);
    });

    test('associateCertificate successor relation sends selected cert as successor and emits Success keyed on current cert', async () => {
        const { emitted, calls } = await runAssociateEpic(
            certificatesActions.associateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'successor' }),
        );
        // selected cert is the successor, current cert is the predecessor → swap so {uuid}=successor, {certificateUuid}=predecessor
        expect(calls[0]).toEqual({ uuid: 'related-cert', certificateUuid: 'current-cert' });
        expect(emitted[0].type).toBe(certificatesActions.associateCertificateSuccess.type);
        // refresh must target the certificate open in the UI
        expect((emitted[0] as any).payload.uuid).toBe('current-cert');
    });

    test('associateCertificate predecessor relation sends selected cert as predecessor without swapping', async () => {
        const { emitted, calls } = await runAssociateEpic(
            certificatesActions.associateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'predecessor' }),
        );
        // selected cert is the predecessor, current cert is the successor → no swap
        expect(calls[0]).toEqual({ uuid: 'current-cert', certificateUuid: 'related-cert' });
        expect(emitted[0].type).toBe(certificatesActions.associateCertificateSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('current-cert');
    });

    test('associateCertificate failure emits Failure with extracted error and fetchError', async () => {
        const { emitted } = await runAssociateEpic(
            certificatesActions.associateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'successor' }),
            () => throwError(() => new Error('boom')),
            2,
        );
        expect(emitted[0].type).toBe(certificatesActions.associateCertificateFailure.type);
        expect((emitted[0] as any).payload.error).toContain('boom');
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('deassociateCertificate predecessor relation calls API without swapping uuids and emits Success', async () => {
        const { emitted, calls } = await runDeassociateEpic(
            certificatesActions.deassociateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'predecessor' }),
        );
        // current cert is the successor, related cert is the predecessor → no swap
        expect(calls[0]).toEqual({ uuid: 'current-cert', certificateUuid: 'related-cert' });
        expect(emitted[0].type).toBe(certificatesActions.deassociateCertificateSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('current-cert');
    });

    test('deassociateCertificate successor relation swaps uuids so the API can find the relation row', async () => {
        const { emitted, calls } = await runDeassociateEpic(
            certificatesActions.deassociateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'successor' }),
        );
        // current cert is the predecessor, related cert is the successor → swap so {uuid}=successor, {certificateUuid}=predecessor
        expect(calls[0]).toEqual({ uuid: 'related-cert', certificateUuid: 'current-cert' });
        expect(emitted[0].type).toBe(certificatesActions.deassociateCertificateSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('current-cert');
    });

    test('deassociateCertificate failure emits Failure with extracted error and fetchError', async () => {
        const { emitted } = await runDeassociateEpic(
            certificatesActions.deassociateCertificate({ uuid: 'current-cert', certificateUuid: 'related-cert', relation: 'successor' }),
            () => throwError(() => new Error('boom')),
            2,
        );
        expect(emitted[0].type).toBe(certificatesActions.deassociateCertificateFailure.type);
        expect((emitted[0] as any).payload.error).toContain('boom');
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('revokeCertificate success emits Success, alert, getCertificateDetail, getCertificateHistory', async () => {
        const emitted = await runEpic(
            REVOKE_EPIC_INDEX,
            certificatesActions.revokeCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                revokeRequest: { reason: 'unspecified', attributes: [] } as any,
            }),
            {},
            4,
        );
        expect(emitted[0].type).toBe(certificatesActions.revokeCertificateSuccess.type);
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[3].type).toBe(certificatesActions.getCertificateHistory.type);
    });

    test('revokeCertificate failure emits Failure, getCertificateDetail, fetchError', async () => {
        const emitted = await runEpic(
            REVOKE_EPIC_INDEX,
            certificatesActions.revokeCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                revokeRequest: { reason: 'unspecified', attributes: [] } as any,
            }),
            { revokeCertificate: () => throwError(() => new Error('boom')) },
            3,
        );
        expect(emitted[0].type).toBe(certificatesActions.revokeCertificateFailure.type);
        expect(emitted[1].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
    });

    test('manuallyIssueCertificate success emits Success, alert, getCertificateDetail, getCertificateHistory', async () => {
        const emitted = await runEpic(
            MANUALLY_ISSUE_EPIC_INDEX,
            certificatesActions.manuallyIssueCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                uploadRequest: { certificate: 'BASE64', customAttributes: [] } as any,
            }),
            {},
            4,
        );
        expect(emitted[0].type).toBe(certificatesActions.manuallyIssueCertificateSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('cert-1');
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2].type).toBe(certificatesActions.getCertificateDetail.type);
        expect((emitted[2] as any).payload.uuid).toBe('cert-1');
        expect(emitted[3].type).toBe(certificatesActions.getCertificateHistory.type);
    });

    test('manuallyIssueCertificate failure emits Failure with extracted error, getCertificateDetail, fetchError', async () => {
        const emitted = await runEpic(
            MANUALLY_ISSUE_EPIC_INDEX,
            certificatesActions.manuallyIssueCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                uploadRequest: { certificate: 'BASE64', customAttributes: [] } as any,
            }),
            { manuallyIssueCertificate: () => throwError(() => new Error('boom')) },
            3,
        );
        expect(emitted[0].type).toBe(certificatesActions.manuallyIssueCertificateFailure.type);
        expect((emitted[0] as any).payload.uuid).toBe('cert-1');
        expect(emitted[1].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
    });

    test('manuallyConfirmRevoke success emits Success, alert, getCertificateDetail, getCertificateHistory', async () => {
        const emitted = await runEpic(
            MANUALLY_CONFIRM_REVOKE_EPIC_INDEX,
            certificatesActions.manuallyConfirmRevoke({ authorityUuid: 'auth-1', raProfileUuid: 'ra-1', uuid: 'cert-1' }),
            {},
            4,
        );
        expect(emitted[0].type).toBe(certificatesActions.manuallyConfirmRevokeSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('cert-1');
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[3].type).toBe(certificatesActions.getCertificateHistory.type);
    });

    test('manuallyConfirmRevoke failure emits Failure, getCertificateDetail, fetchError', async () => {
        const emitted = await runEpic(
            MANUALLY_CONFIRM_REVOKE_EPIC_INDEX,
            certificatesActions.manuallyConfirmRevoke({ authorityUuid: 'auth-1', raProfileUuid: 'ra-1', uuid: 'cert-1' }),
            { manuallyConfirmRevoke: () => throwError(() => new Error('boom')) },
            3,
        );
        expect(emitted[0].type).toBe(certificatesActions.manuallyConfirmRevokeFailure.type);
        expect(emitted[1].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
    });

    test('cancelPendingCertificateOperation success emits Success, alert, getCertificateDetail, getCertificateHistory', async () => {
        const emitted = await runEpic(
            CANCEL_PENDING_EPIC_INDEX,
            certificatesActions.cancelPendingCertificateOperation({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                reason: 'no-longer-needed',
            }),
            {},
            4,
        );
        expect(emitted[0].type).toBe(certificatesActions.cancelPendingCertificateOperationSuccess.type);
        expect((emitted[0] as any).payload.uuid).toBe('cert-1');
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[3].type).toBe(certificatesActions.getCertificateHistory.type);
    });

    test('cancelPendingCertificateOperation failure emits Failure, getCertificateDetail, fetchError', async () => {
        const emitted = await runEpic(
            CANCEL_PENDING_EPIC_INDEX,
            certificatesActions.cancelPendingCertificateOperation({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                reason: undefined,
            }),
            { cancelPendingCertificateOperation: () => throwError(() => new Error('boom')) },
            3,
        );
        expect(emitted[0].type).toBe(certificatesActions.cancelPendingCertificateOperationFailure.type);
        expect(emitted[1].type).toBe(certificatesActions.getCertificateDetail.type);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
    });

    test('uploadCertificate success emits Success, alert, and listCertificates', async () => {
        const emitted = await runUploadEpic(
            certificatesActions.uploadCertificate({ certificate: 'BASE64', customAttributes: [] } as any),
            {},
            3,
        );
        expect(emitted[0].type).toBe(certificatesActions.uploadCertificateSuccess.type);
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2].type).toBe(certificatesActions.listCertificates.type);
        expect((emitted[2] as any).payload.includeArchived).toBe(false);
    });

    test('uploadCertificate failure emits Failure with extracted error and fetchError', async () => {
        const emitted = await runUploadEpic(
            certificatesActions.uploadCertificate({ certificate: 'BASE64', customAttributes: [] } as any),
            { uploadAsync: () => throwError(() => new Error('boom')) },
            2,
        );
        expect(emitted[0].type).toBe(certificatesActions.uploadCertificateFailure.type);
        expect((emitted[0] as any).payload.error).toContain('boom');
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    describe('bulkUpdateRaProfile verification after refetch', () => {
        type BulkUpdateRunOptions = {
            certificateUuids: string[];
            requestedRaProfileUuid: string;
            refetchedCertificates: Array<{ uuid: string; raProfile?: { uuid: string } }>;
            patchResponse?: () => any;
        };

        async function runBulkUpdateRaProfileEpic({
            certificateUuids,
            requestedRaProfileUuid,
            refetchedCertificates,
            patchResponse = () => of(undefined),
        }: BulkUpdateRunOptions): Promise<UnknownAction[]> {
            const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
            const action$ = new Subject<UnknownAction>();
            const deps = {
                apiClients: {
                    certificates: { bulkUpdateCertificateObjects: patchResponse },
                },
            };
            const output$ = epics[BULK_UPDATE_RA_PROFILE_EPIC_INDEX](action$, of({}) as any, deps as any);
            const collected = firstValueFrom(output$.pipe(take(3), toArray()));

            action$.next(
                certificatesActions.bulkUpdateRaProfile({
                    authorityUuid: 'auth-1',
                    raProfileRequest: { certificateUuids, raProfileUuid: requestedRaProfileUuid, filters: [] } as any,
                }),
            );
            // Allow the epic's PATCH to resolve and emit Success + listCertificates before we feed listCertificatesSuccess.
            await new Promise((resolve) => setTimeout(resolve, 0));
            action$.next(certificatesActions.listCertificatesSuccess(refetchedCertificates as any));
            return collected;
        }

        test('emits success alert when all requested certificates received the requested RA profile', async () => {
            const emitted = await runBulkUpdateRaProfileEpic({
                certificateUuids: ['c1', 'c2'],
                requestedRaProfileUuid: 'ra-new',
                refetchedCertificates: [
                    { uuid: 'c1', raProfile: { uuid: 'ra-new' } },
                    { uuid: 'c2', raProfile: { uuid: 'ra-new' } },
                ],
            });

            expect(emitted[0].type).toBe(certificatesActions.bulkUpdateRaProfileSuccess.type);
            expect(emitted[1].type).toBe(certificatesActions.listCertificates.type);
            expect(emitted[2].type).toBe(alertActions.success.type);
            expect((emitted[2] as any).payload).toContain('completed');
        });

        test('emits error alert when none of the certificates received the requested RA profile', async () => {
            const emitted = await runBulkUpdateRaProfileEpic({
                certificateUuids: ['c1', 'c2'],
                requestedRaProfileUuid: 'ra-new',
                refetchedCertificates: [
                    { uuid: 'c1', raProfile: { uuid: 'ra-old' } },
                    { uuid: 'c2', raProfile: undefined },
                ],
            });

            expect(emitted[2].type).toBe(alertActions.error.type);
            expect((emitted[2] as any).payload).toContain('No certificates were updated');
        });

        test('emits info alert when only some certificates received the requested RA profile', async () => {
            const emitted = await runBulkUpdateRaProfileEpic({
                certificateUuids: ['c1', 'c2', 'c3'],
                requestedRaProfileUuid: 'ra-new',
                refetchedCertificates: [
                    { uuid: 'c1', raProfile: { uuid: 'ra-new' } },
                    { uuid: 'c2', raProfile: { uuid: 'ra-old' } },
                    { uuid: 'c3', raProfile: { uuid: 'ra-new' } },
                ],
            });

            expect(emitted[2].type).toBe(alertActions.info.type);
            expect((emitted[2] as any).payload).toContain('2 of 3');
        });

        test('emits info alert when some selected certificates are not on the current page', async () => {
            const emitted = await runBulkUpdateRaProfileEpic({
                certificateUuids: ['c1', 'c2', 'c3'],
                requestedRaProfileUuid: 'ra-new',
                refetchedCertificates: [{ uuid: 'c1', raProfile: { uuid: 'ra-new' } }],
            });

            expect(emitted[2].type).toBe(alertActions.info.type);
            expect((emitted[2] as any).payload).toContain('1 of 1');
            expect((emitted[2] as any).payload).toContain('2 not on the current page');
        });

        test('emits info alert when none of the selected certificates are on the current page', async () => {
            const emitted = await runBulkUpdateRaProfileEpic({
                certificateUuids: ['c1', 'c2'],
                requestedRaProfileUuid: 'ra-new',
                refetchedCertificates: [{ uuid: 'c-other', raProfile: { uuid: 'ra-new' } }],
            });

            expect(emitted[2].type).toBe(alertActions.info.type);
            expect((emitted[2] as any).payload).toContain('could not be verified');
        });

        test('emits failure action when PATCH itself fails', async () => {
            const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
            const action$ = new Subject<UnknownAction>();
            const deps = {
                apiClients: {
                    certificates: { bulkUpdateCertificateObjects: () => throwError(() => new Error('boom')) },
                },
            };
            const output$ = epics[BULK_UPDATE_RA_PROFILE_EPIC_INDEX](action$, of({}) as any, deps as any);
            const collected = firstValueFrom(output$.pipe(take(2), toArray()));

            action$.next(
                certificatesActions.bulkUpdateRaProfile({
                    authorityUuid: 'auth-1',
                    raProfileRequest: { certificateUuids: ['c1'], raProfileUuid: 'ra-new', filters: [] } as any,
                }),
            );

            const emitted = await collected;
            expect(emitted[0].type).toBe(certificatesActions.bulkUpdateRaProfileFailure.type);
            expect((emitted[0] as any).payload.error).toContain('boom');
            expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        });
    });

    describe('getCsrAttributes', () => {
        const GET_CSR_ATTRIBUTES_EPIC_INDEX = 39;

        async function runGetCsrAttributesEpic(
            action: UnknownAction,
            getCsrGenerationAttributes: (args: any) => Observable<any> = () => of([]),
            takeCount = 1,
        ): Promise<{ emitted: UnknownAction[]; calls: any[] }> {
            const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
            const calls: any[] = [];
            const deps = {
                apiClients: {
                    certificates: {
                        getCsrGenerationAttributes: (args: any) => {
                            calls.push(args);
                            return getCsrGenerationAttributes(args);
                        },
                    },
                },
            };
            const output$ = epics[GET_CSR_ATTRIBUTES_EPIC_INDEX](of(action), of({}) as any, deps as any);
            const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
            return { emitted, calls };
        }

        test('forwards raProfileUuid to the client and maps descriptors on success', async () => {
            const { emitted, calls } = await runGetCsrAttributesEpic(certificatesActions.getCsrAttributes({ raProfileUuid: 'ra-1' }), () =>
                of([{ uuid: 'csr-attr-1' }]),
            );

            expect(calls).toEqual([{ raProfileUuid: 'ra-1' }]);
            expect(emitted[0].type).toBe(certificatesActions.getCsrAttributesSuccess.type);
            expect((emitted[0] as any).payload.csrAttributes).toEqual([{ uuid: 'csr-attr-1' }]);
        });

        test('emits failure action and fetchError redirect when the client fails', async () => {
            const { emitted } = await runGetCsrAttributesEpic(
                certificatesActions.getCsrAttributes({ raProfileUuid: 'ra-1' }),
                () => throwError(() => new Error('boom')),
                2,
            );

            expect(emitted[0].type).toBe(certificatesActions.getCsrAttributesFailure.type);
            expect((emitted[0] as any).payload.error).toContain('boom');
            expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        });

        test('cancels the in-flight fetch when the RA Profile is cleared before the response resolves', async () => {
            const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
            const action$ = new Subject<UnknownAction>();
            const response$ = new Subject<any>();
            const deps = {
                apiClients: {
                    certificates: { getCsrGenerationAttributes: () => response$ },
                },
            };

            const output$ = epics[GET_CSR_ATTRIBUTES_EPIC_INDEX](action$, of({}) as any, deps as any);
            const emitted: UnknownAction[] = [];
            const subscription = output$.subscribe((action) => emitted.push(action));

            action$.next(certificatesActions.getCsrAttributes({ raProfileUuid: 'ra-1' }));
            action$.next(certificatesActions.clearCsrAttributes());
            // A late response must be ignored now that the fetch has been unsubscribed.
            response$.next([{ uuid: 'csr-attr-1' }]);
            response$.complete();

            await Promise.resolve();

            expect(emitted).toEqual([]);
            subscription.unsubscribe();
        });
    });
});
