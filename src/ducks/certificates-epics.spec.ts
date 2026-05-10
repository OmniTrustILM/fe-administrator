import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
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
}));

import { actions as certificatesActions } from './certificates';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';

const REVOKE_EPIC_INDEX = 10;
const MANUALLY_ISSUE_EPIC_INDEX = 13;
const MANUALLY_CONFIRM_REVOKE_EPIC_INDEX = 14;
const CANCEL_PENDING_EPIC_INDEX = 15;

type ClientOpsOverrides = {
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
    const epics = certificatesEpics as ((action$: any, state$: any, deps: any) => any)[];

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

describe('certificates epics', () => {
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
});
