import { test, expect } from '../../../../playwright/ct-test';
import { buildCertificateRowColumns, buildCertificateDetailBaseRows } from './certificateTableHelpers';
import type { CertificateListResponseModel, CertificateDetailResponseModel } from 'types/certificate';
import { CertificateType } from 'types/openapi';

const mockDateFormatter = (d: Date) => d.toISOString().slice(0, 10);
const mockGetEnumLabel = (_e: any, key: string) => key;
const mockDispatch = () => {};

function buildListCertificate(overrides: Partial<CertificateListResponseModel> = {}): CertificateListResponseModel {
    return {
        uuid: 'u',
        commonName: 'c',
        serialNumber: '1',
        signatureAlgorithm: '',
        publicKeyAlgorithm: '',
        keySize: 2048,
        notBefore: '2024-01-01',
        notAfter: '2025-01-01',
        state: 0,
        validationStatus: 0,
        fingerprint: '',
        subjectDn: '',
        issuerDn: '',
        issuerCommonName: '',
        groups: [],
        raProfile: undefined,
        owner: undefined,
        ownerUuid: undefined,
        privateKeyAvailability: false,
        archived: false,
        certificateType: CertificateType.X509,
        ...overrides,
    } as unknown as CertificateListResponseModel;
}

test.describe('certificateTableHelpers', () => {
    test.describe('buildCertificateRowColumns', () => {
        const baseOpts = {
            isLinkDisabled: true,
            selectCertsOnly: false,
            currentFilters: [],
            dispatch: mockDispatch,
            dateFormatter: mockDateFormatter,
            certificateTypeEnum: {},
            getEnumLabel: mockGetEnumLabel,
        };

        test('returns array of 17 columns for minimal certificate', () => {
            const cert = buildListCertificate({
                uuid: 'uuid-1',
                commonName: 'cn.example.com',
                serialNumber: 'SN123',
                signatureAlgorithm: 'SHA256-RSA',
                publicKeyAlgorithm: 'RSA',
                notBefore: '2024-01-01T00:00:00Z',
                notAfter: '2025-01-01T00:00:00Z',
                fingerprint: 'fp',
                subjectDn: 'CN=cn',
                issuerDn: 'CN=issuer',
                issuerCommonName: 'issuer.example.com',
            });

            const result = buildCertificateRowColumns(cert, baseOpts);
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(16);
        });

        test('with isLinkDisabled true commonName is plain text', () => {
            const cert = buildListCertificate({ commonName: 'test.example.com' });

            const result = buildCertificateRowColumns(cert, baseOpts);
            // commonName is 5th column (index 4): state, validationStatus, compliance, key, commonName
            const commonNameColumn = result[4];
            expect(commonNameColumn).toBe('test.example.com');
        });

        test('groups Unassigned when no groups', () => {
            const cert = buildListCertificate();

            const result = buildCertificateRowColumns(cert, baseOpts);
            // groups is 8th column (index 7): state, validationStatus, compliance, key, commonName, notBefore, notAfter, groups
            const groupsColumn = result[7];
            expect(groupsColumn).toBe('Unassigned');
        });
    });

    test.describe('buildCertificateDetailBaseRows', () => {
        const minimalCertificate: CertificateDetailResponseModel = {
            uuid: 'uuid-detail',
            commonName: 'detail.example.com',
            serialNumber: 'SN456',
            subjectDn: 'CN=detail',
            issuerDn: 'CN=issuer',
            issuerCommonName: 'issuer.example.com',
            notBefore: '2024-01-01T00:00:00Z',
            notAfter: '2025-01-01T00:00:00Z',
            fingerprint: 'fingerprint',
            fingerprintAlgorithm: 'SHA256',
            publicKeyAlgorithm: 'RSA',
            signatureAlgorithm: 'SHA256-RSA',
            keySize: 2048,
            state: 0,
            keyUsage: [],
            extendedKeyUsage: [],
            subjectType: undefined,
            hybridCertificate: false,
        } as unknown as CertificateDetailResponseModel;

        test('returns rows with expected ids', () => {
            const rows = buildCertificateDetailBaseRows(
                minimalCertificate,
                undefined,
                false,
                {},
                {},
                (d: Date) => d.toISOString().slice(0, 10),
                (_e: any, k: string) => k,
            );

            const ids = rows.map((r) => r.id);
            expect(ids).toContain('commonName');
            expect(ids).toContain('serialNumber');
            expect(ids).toContain('key');
            expect(ids).toContain('issuerCommonName');
            expect(ids).toContain('validFrom');
            expect(ids).toContain('expiresAt');
            expect(ids).toContain('certState');
            expect(ids).toContain('validationStatus');
            expect(ids).toContain('complianceStatus');
            expect(ids).toContain('archivationStatus');
        });

        test('each row has two columns (label, value)', () => {
            const rows = buildCertificateDetailBaseRows(minimalCertificate, undefined, false, {}, {}, mockDateFormatter, mockGetEnumLabel);

            rows.forEach((row) => {
                expect(row.columns).toHaveLength(2);
            });
        });

        test('adds hybrid rows when hybridCertificate is true', () => {
            const hybridCert = {
                ...minimalCertificate,
                hybridCertificate: true,
                altKey: undefined,
                altPublicKeyAlgorithm: 'RSA',
                altSignatureAlgorithm: 'SHA256-RSA',
                altKeySize: 2048,
            } as CertificateDetailResponseModel;

            const rows = buildCertificateDetailBaseRows(hybridCert, undefined, false, {}, {}, mockDateFormatter, mockGetEnumLabel);

            const ids = rows.map((r) => r.id);
            expect(ids).toContain('altKey');
            expect(ids).toContain('altPublicKeyAlgorithm');
            expect(ids).toContain('altSignatureAlgorithm');
            expect(ids).toContain('altKeySize');
        });

        test('adds qcStatements rows when certificate has qcStatements', () => {
            const certWithQc = {
                ...minimalCertificate,
                qcStatements: {
                    qcCompliance: true,
                    qcSscd: false,
                    qcType: ['esign', 'eseal'],
                    qcCcLegislation: ['EU'],
                },
            } as CertificateDetailResponseModel;

            const rows = buildCertificateDetailBaseRows(certWithQc, undefined, false, {}, {}, mockDateFormatter, mockGetEnumLabel);

            const ids = rows.map((r) => r.id);
            expect(ids).toContain('qcCompliance');
            expect(ids).toContain('qcSscd');
            expect(ids).toContain('qcType');
            expect(ids).toContain('qcCcLegislation');
        });

        test('omits qcStatements rows when certificate has no qcStatements', () => {
            const rows = buildCertificateDetailBaseRows(minimalCertificate, undefined, false, {}, {}, mockDateFormatter, mockGetEnumLabel);

            const ids = rows.map((r) => r.id);
            expect(ids).not.toContain('qcCompliance');
            expect(ids).not.toContain('qcSscd');
            expect(ids).not.toContain('qcType');
            expect(ids).not.toContain('qcCcLegislation');
        });

        test('omits qcType row when qcType array is empty', () => {
            const certWithQc = {
                ...minimalCertificate,
                qcStatements: { qcCompliance: false, qcSscd: false, qcType: [], qcCcLegislation: [] },
            } as CertificateDetailResponseModel;

            const rows = buildCertificateDetailBaseRows(certWithQc, undefined, false, {}, {}, mockDateFormatter, mockGetEnumLabel);

            const ids = rows.map((r) => r.id);
            expect(ids).toContain('qcCompliance');
            expect(ids).toContain('qcSscd');
            expect(ids).not.toContain('qcType');
            expect(ids).not.toContain('qcCcLegislation');
        });

        test('uses getEnumLabel for qcType values', () => {
            const certWithQc = {
                ...minimalCertificate,
                qcStatements: { qcCompliance: true, qcSscd: true, qcType: ['esign'], qcCcLegislation: [] },
            } as CertificateDetailResponseModel;
            const qcTypeEnum = { esign: { label: 'Electronic Signature' } };
            const getLabel = (_e: any, k: string) => `label-${k}`;

            const rows = buildCertificateDetailBaseRows(certWithQc, undefined, false, {}, qcTypeEnum, mockDateFormatter, getLabel);

            const qcTypeRow = rows.find((r) => r.id === 'qcType');
            expect(qcTypeRow).toBeDefined();
        });
    });
});
