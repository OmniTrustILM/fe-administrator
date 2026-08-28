import { test, expect } from '../../../../playwright/ct-test';
import {
    buildCertificateRowColumns,
    buildCertificateDetailBaseRows,
    buildCertificateProtocolRows,
    CERTIFICATE_COLUMNS,
} from './certificateTableHelpers';
import type { CertificateListResponseModel, CertificateDetailResponseModel } from 'types/certificate';
import { AttributeContentType, CertificateProtocol, type CertificateProtocolDto, CertificateType, FilterFieldSource } from 'types/openapi';

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

function valueCellOf(protocolInfo: CertificateProtocolDto, rowId: string) {
    const rows = buildCertificateProtocolRows(protocolInfo, {}, mockGetEnumLabel);
    return rows.find((r) => r.id === rowId)?.columns[1];
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

        test('returns one column per entry in CERTIFICATE_COLUMNS for a minimal certificate', () => {
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
            expect(result).toHaveLength(CERTIFICATE_COLUMNS.length);
        });

        test('with isLinkDisabled true commonName is plain text', () => {
            const cert = buildListCertificate({ commonName: 'test.example.com' });

            const result = buildCertificateRowColumns(cert, baseOpts);
            // commonName is 5th column (index 4): state, validationStatus, compliance, key, commonName
            const commonNameColumn = result[4];
            expect(commonNameColumn).toBe('test.example.com');
        });

        test('renders the shared empty state for a certificate with no groups', async ({ mount, page }) => {
            const cert = buildListCertificate();
            const columns = buildCertificateRowColumns(cert, baseOpts);

            // Groups is the eighth entry in CERTIFICATE_COLUMNS.
            await mount(<div>{columns[7]}</div>);

            await expect(page.getByTestId('empty-cell')).toBeVisible();
            await expect(page.getByText('Unassigned')).toHaveCount(0);
        });

        test('renders one group as a plain value and the rest behind a count', async ({ mount, page }) => {
            const cert = buildListCertificate({
                groups: [
                    { uuid: 'g-1', name: 'Production' },
                    { uuid: 'g-2', name: 'PCI' },
                    { uuid: 'g-3', name: 'EU' },
                ],
            } as Partial<CertificateListResponseModel>);

            await mount(<div>{buildCertificateRowColumns(cert, baseOpts)[7]}</div>);

            await expect(page.getByText('Production')).toBeVisible();
            await expect(page.getByText('+2')).toBeVisible();
            // Joining every group would let the cell grow without bound.
            await expect(page.getByText('Production, PCI, EU')).toHaveCount(0);
        });

        test('renders a row for a column set given in a different order', () => {
            const cert = buildListCertificate({ commonName: 'cn.example.com', serialNumber: 'SN123' });
            const reordered = [CERTIFICATE_COLUMNS[10], CERTIFICATE_COLUMNS[4]];

            const result = buildCertificateRowColumns(cert, baseOpts, reordered);

            expect(result).toHaveLength(2);
            expect(result[0]).toBe('SN123');
            expect(result[1]).toBe('cn.example.com');
        });

        test('renders an attribute-sourced column the registry knows nothing about', async ({ mount, page }) => {
            const cert = buildListCertificate({
                attributeValues: { custom: { costCentre: [{ data: 4820 }] } },
            } as Partial<CertificateListResponseModel>);

            const column = {
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'costCentre',
                catalogueLabel: 'Cost centre',
                attributeContentType: AttributeContentType.Integer,
            };

            await mount(<div>{buildCertificateRowColumns(cert, baseOpts, [column])[0]}</div>);

            await expect(page.getByText('4820')).toBeVisible();
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
                { certificateKeyUsage: {}, qcType: {} },
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
            const rows = buildCertificateDetailBaseRows(
                minimalCertificate,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

            rows.forEach((row) => {
                expect(row.columns).toHaveLength(2);
            });
        });

        test('does not throw for a pre-registered certificate without key material', () => {
            // A certificate in "registered" state has no issued certificate or key yet, so
            // keySize, publicKeyAlgorithm, serialNumber, notBefore/notAfter are all absent.
            const preRegisteredCert = {
                uuid: 'uuid-registered',
                commonName: 'pre-registered',
                subjectDn: 'CN=pre-registered',
                hybridCertificate: false,
                state: 'registered',
                validationStatus: 'not_checked',
                complianceStatus: 'not_checked',
                privateKeyAvailability: false,
                archived: false,
                groups: [],
                certificateType: CertificateType.X509,
            } as unknown as CertificateDetailResponseModel;

            const rows = buildCertificateDetailBaseRows(
                preRegisteredCert,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

            const keySizeRow = rows.find((r) => r.id === 'keySize');
            expect(keySizeRow?.columns[1]).toBe('');
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

            const rows = buildCertificateDetailBaseRows(
                hybridCert,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

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

            const rows = buildCertificateDetailBaseRows(
                certWithQc,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

            const ids = rows.map((r) => r.id);
            expect(ids).toContain('qcCompliance');
            expect(ids).toContain('qcSscd');
            expect(ids).toContain('qcType');
            expect(ids).toContain('qcCcLegislation');
        });

        test('omits qcStatements rows when certificate has no qcStatements', () => {
            const rows = buildCertificateDetailBaseRows(
                minimalCertificate,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

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

            const rows = buildCertificateDetailBaseRows(
                certWithQc,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: {} },
                mockDateFormatter,
                mockGetEnumLabel,
            );

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

            const rows = buildCertificateDetailBaseRows(
                certWithQc,
                undefined,
                false,
                { certificateKeyUsage: {}, qcType: qcTypeEnum },
                mockDateFormatter,
                getLabel,
            );

            const qcTypeRow = rows.find((r) => r.id === 'qcType');
            expect(qcTypeRow).toBeDefined();
        });
    });

    test.describe('buildCertificateProtocolRows', () => {
        // Playwright CT compiles JSX into its own element descriptors rather than real React elements, so a rendered
        // link is asserted through its `to` prop while plain text stays a bare string.
        type LinkCell = { props: { to: string } };

        test('returns no rows when the certificate was not issued through a protocol', () => {
            expect(buildCertificateProtocolRows(undefined, {}, mockGetEnumLabel)).toEqual([]);
        });

        test('links the protocol profile UUID to the profile detail page of its protocol', () => {
            const cell = valueCellOf({ protocol: CertificateProtocol.Cmp, protocolProfileUuid: 'profile-1' }, 'protocolProfileUuid');

            expect((cell as LinkCell).props.to).toBe('../cmpprofiles/detail/profile-1');
        });

        test('renders the profile UUID as plain text when it is missing', () => {
            // Legacy CMP-issued certificates can have no recorded profile — a Link here would point at
            // ../cmpprofiles/detail/undefined and render an empty, invisible label.
            const cell = valueCellOf({ protocol: CertificateProtocol.Cmp }, 'protocolProfileUuid');

            expect(typeof cell).toBe('string');
            expect(cell).toBe('n/a');
        });

        test('renders the profile UUID as plain text when its protocol has no known profile route', () => {
            // A protocol the backend added before these types were regenerated resolves to no route, so the UUID is
            // kept visible rather than linked to a path that cannot exist.
            const cell = valueCellOf(
                { protocol: 'unknown-protocol' as CertificateProtocol, protocolProfileUuid: 'profile-1' },
                'protocolProfileUuid',
            );

            expect(typeof cell).toBe('string');
            expect(cell).toBe('profile-1');
        });

        test('still renders the protocol name row when the profile UUID is missing', () => {
            const rows = buildCertificateProtocolRows({ protocol: CertificateProtocol.Cmp }, {}, mockGetEnumLabel);

            expect(rows.map((r) => r.id)).toEqual(['protocol', 'protocolProfileUuid']);
        });

        test('links the ACME account under its profile when both UUIDs are known', () => {
            const cell = valueCellOf(
                { protocol: CertificateProtocol.Acme, protocolProfileUuid: 'profile-1', additionalProtocolUuid: 'account-1' },
                'additionalProfileUuid',
            );

            expect((cell as LinkCell).props.to).toBe('../acmeaccounts/detail/profile-1/account-1');
        });

        test('renders the ACME account UUID as plain text when the profile UUID is missing', () => {
            // The account route is nested under the profile, so there is no resolvable path without it.
            const cell = valueCellOf({ protocol: CertificateProtocol.Acme, additionalProtocolUuid: 'account-1' }, 'additionalProfileUuid');

            expect(typeof cell).toBe('string');
            expect(cell).toBe('account-1');
        });
    });
});
