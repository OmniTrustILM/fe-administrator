import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
    CertificateEventHistoryDtoStatusEnum,
    CertificateState,
    CertificateSubjectType,
    CertificateValidationStatus,
    ComplianceRuleStatus,
    ComplianceStatus,
} from 'types/openapi';
import { formatPEM, getCertificateStatusColor, downloadFile } from './certificate';

vi.mock('react-redux', () => ({
    useSelector: vi.fn((selector: any) => selector({ enums: { platformEnums: {} } })),
}));

vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return {
        ...actual,
        useCallback: (fn: any) => fn,
    };
});

vi.mock('ducks/enums', () => ({
    selectors: {
        platformEnum: (key: string) => (state: any) => state?.enums?.platformEnums?.[key] ?? {},
    },
    getEnumLabel: (_enumObj: any, key: string) => key,
}));

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
Object.defineProperty(global.URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true });

describe('certificate utils', () => {
    describe('formatPEM', () => {
        test('should format short PEM string', () => {
            const result = formatPEM('short');
            expect(result).toContain('-----BEGIN CERTIFICATE-----');
            expect(result).toContain('-----END CERTIFICATE-----');
            expect(result).toContain('short');
        });

        test('should format CSR when csr is true', () => {
            const result = formatPEM('content', true);
            expect(result).toContain('-----BEGIN CERTIFICATE REQUEST-----');
            expect(result).toContain('-----END CERTIFICATE REQUEST-----');
        });

        test('should wrap long PEM string at 64 chars', () => {
            const longString = 'a'.repeat(100);
            const result = formatPEM(longString);
            expect(result).toContain('-----BEGIN CERTIFICATE-----');
            expect(result).toContain('-----END CERTIFICATE-----');
            expect(result).toContain('a'.repeat(64));
        });
    });

    describe('getCertificateStatusColor', () => {
        test('should return correct colors for CertificateState', () => {
            expect(getCertificateStatusColor(CertificateState.Issued)).toBe('#14B8A6');
            expect(getCertificateStatusColor(CertificateState.Revoked)).toBe('#632828');
            expect(getCertificateStatusColor(CertificateState.Failed)).toBe('#EF4444');
            expect(getCertificateStatusColor(CertificateState.Requested)).toBe('#3754a5');
        });

        test('should return correct colors for CertificateValidationStatus', () => {
            expect(getCertificateStatusColor(CertificateValidationStatus.Valid)).toBe('#14B8A6');
            expect(getCertificateStatusColor(CertificateValidationStatus.Expired)).toBe('#EF4444');
            expect(getCertificateStatusColor(CertificateValidationStatus.Expiring)).toBe('#EAB308');
            expect(getCertificateStatusColor(CertificateValidationStatus.NotChecked)).toBe('#2798E7');
        });

        test('should return correct colors for ComplianceStatus', () => {
            expect(getCertificateStatusColor(ComplianceStatus.Ok)).toBe('#14B8A6');
            expect(getCertificateStatusColor(ComplianceStatus.Nok)).toBe('#EF4444');
            expect(getCertificateStatusColor(ComplianceStatus.Na)).toBe('#6c757d');
        });

        test('should return correct colors for CertificateEventHistoryDtoStatusEnum', () => {
            expect(getCertificateStatusColor(CertificateEventHistoryDtoStatusEnum.Success)).toBe('#14B8A6');
            expect(getCertificateStatusColor(CertificateEventHistoryDtoStatusEnum.Failed)).toBe('#EF4444');
        });

        test('should return correct colors for CertificateSubjectType', () => {
            expect(getCertificateStatusColor(CertificateSubjectType.RootCa)).toBe('#14B8A6');
            expect(getCertificateStatusColor(CertificateSubjectType.EndEntity)).toBe('#6c757d');
        });

        test('should return correct colors for remaining CertificateState cases', () => {
            expect(getCertificateStatusColor(CertificateState.PendingApproval)).toBe('#3754a5');
            expect(getCertificateStatusColor(CertificateState.PendingIssue)).toBe('#3782a5');
            expect(getCertificateStatusColor(CertificateState.PendingRevoke)).toBe('#eb3f33');
            expect(getCertificateStatusColor(CertificateState.Rejected)).toBe('#EF4444');
        });

        test('should return correct colors for remaining CertificateValidationStatus cases', () => {
            expect(getCertificateStatusColor(CertificateValidationStatus.Revoked)).toBe('#632828');
            expect(getCertificateStatusColor(CertificateValidationStatus.Invalid)).toBe('#1F2937');
            expect(getCertificateStatusColor(CertificateValidationStatus.Inactive)).toBe('#6c757d');
        });

        test('should return correct colors for ComplianceStatus NotChecked', () => {
            expect(getCertificateStatusColor(ComplianceStatus.NotChecked)).toBe('#2798E7');
        });

        test('should return correct colors for ComplianceRuleStatus', () => {
            expect(getCertificateStatusColor(ComplianceRuleStatus.Nok)).toBe('#EF4444');
            expect(getCertificateStatusColor(ComplianceRuleStatus.Ok)).toBe('#14B8A6');
            expect(getCertificateStatusColor(ComplianceRuleStatus.Na)).toBe('#6c757d');
        });

        test('should return correct colors for remaining CertificateSubjectType cases', () => {
            expect(getCertificateStatusColor(CertificateSubjectType.SelfSignedEndEntity)).toBe('#EAB308');
            expect(getCertificateStatusColor(CertificateSubjectType.IntermediateCa)).toBe('#3754a5');
        });

        test('should return default gray for unknown status', () => {
            expect(getCertificateStatusColor('unknown' as any)).toBe('#6c757d');
        });
    });

    describe('downloadFile', () => {
        let mockClick: ReturnType<typeof vi.fn>;
        let mockAppendChild: ReturnType<typeof vi.fn>;
        let fakeAnchor: any;

        beforeEach(() => {
            vi.clearAllMocks();
            mockClick = vi.fn();
            fakeAnchor = { href: '', download: '', click: mockClick };
            mockAppendChild = vi.fn();

            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                if (tag === 'a') return fakeAnchor as any;
                return document.createElement(tag);
            });

            vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
        });

        test('creates anchor element and triggers click', () => {
            downloadFile('hello', 'test.txt');
            expect(document.createElement).toHaveBeenCalledWith('a');
            expect(mockClick).toHaveBeenCalledTimes(1);
        });

        test('sets download filename on anchor', () => {
            downloadFile('hello', 'myfile.txt');
            expect(fakeAnchor.download).toBe('myfile.txt');
        });

        test('sets anchor href to object URL', () => {
            downloadFile('hello', 'test.txt');
            expect(fakeAnchor.href).toBe('blob:mock-url');
        });

        test('appends anchor to document.body', () => {
            downloadFile('hello', 'test.txt');
            expect(mockAppendChild).toHaveBeenCalledWith(fakeAnchor);
        });

        test('calls URL.createObjectURL with a Blob', () => {
            downloadFile('content', 'file.txt');
            expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
            const arg = mockCreateObjectURL.mock.calls[0][0];
            expect(arg).toBeInstanceOf(Blob);
        });
    });
});

describe('useGetStatusText', () => {
    test('returns status key as label (via getEnumLabel mock) for CertificateValidationStatus cases', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(CertificateValidationStatus.Valid)).toBe(CertificateValidationStatus.Valid);
        expect(getText(CertificateValidationStatus.Invalid)).toBe(CertificateValidationStatus.Invalid);
        expect(getText(CertificateValidationStatus.Expiring)).toBe(CertificateValidationStatus.Expiring);
        expect(getText(CertificateValidationStatus.Expired)).toBe(CertificateValidationStatus.Expired);
        expect(getText(CertificateValidationStatus.Revoked)).toBe(CertificateValidationStatus.Revoked);
        expect(getText(CertificateValidationStatus.NotChecked)).toBe(CertificateValidationStatus.NotChecked);
        expect(getText(CertificateValidationStatus.Inactive)).toBe(CertificateValidationStatus.Inactive);
        expect(getText(CertificateValidationStatus.Failed)).toBe(CertificateValidationStatus.Failed);
    });

    test('returns status key for CertificateState cases', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(CertificateState.Revoked)).toBe(CertificateState.Revoked);
        expect(getText(CertificateState.Requested)).toBe(CertificateState.Requested);
        expect(getText(CertificateState.Rejected)).toBe(CertificateState.Rejected);
        expect(getText(CertificateState.Issued)).toBe(CertificateState.Issued);
        expect(getText(CertificateState.PendingApproval)).toBe(CertificateState.PendingApproval);
        expect(getText(CertificateState.PendingIssue)).toBe(CertificateState.PendingIssue);
        expect(getText(CertificateState.PendingRevoke)).toBe(CertificateState.PendingRevoke);
    });

    test('returns literal strings for CertificateEventHistoryDtoStatusEnum', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(CertificateEventHistoryDtoStatusEnum.Success)).toBe('Success');
        expect(getText(CertificateEventHistoryDtoStatusEnum.Failed)).toBe('Failed');
    });

    test('returns status key for ComplianceStatus cases', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(ComplianceStatus.Ok)).toBe(ComplianceStatus.Ok);
        expect(getText(ComplianceStatus.Nok)).toBe(ComplianceStatus.Nok);
        expect(getText(ComplianceStatus.Na)).toBe(ComplianceStatus.Na);
        expect(getText(ComplianceStatus.NotChecked)).toBe(ComplianceStatus.NotChecked);
    });

    test('returns status key for ComplianceRuleStatus cases', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(ComplianceRuleStatus.Ok)).toBe(ComplianceRuleStatus.Ok);
        expect(getText(ComplianceRuleStatus.Nok)).toBe(ComplianceRuleStatus.Nok);
        expect(getText(ComplianceRuleStatus.Na)).toBe(ComplianceRuleStatus.Na);
    });

    test('returns status key for CertificateSubjectType cases', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText(CertificateSubjectType.EndEntity)).toBe(CertificateSubjectType.EndEntity);
        expect(getText(CertificateSubjectType.SelfSignedEndEntity)).toBe(CertificateSubjectType.SelfSignedEndEntity);
        expect(getText(CertificateSubjectType.IntermediateCa)).toBe(CertificateSubjectType.IntermediateCa);
        expect(getText(CertificateSubjectType.RootCa)).toBe(CertificateSubjectType.RootCa);
    });

    test('returns Unknown for unrecognized status', async () => {
        const { useGetStatusText } = await import('./certificate');
        const getText = useGetStatusText();
        expect(getText('completely-unknown' as any)).toBe('Unknown');
    });
});
