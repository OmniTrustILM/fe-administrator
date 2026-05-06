import { describe, expect, test, vi, beforeEach } from 'vitest';

import { runDownloadFileSuite, setupAnchorDownloadMocks } from './__tests__/anchor-download-mock';
import { downloadFile, downloadFileZip, formatPEM } from './download';

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global.URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true });
Object.defineProperty(global.URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true });

vi.mock('jszip', () => {
    const generateAsync = vi.fn().mockResolvedValue(new Blob(['zip-data'], { type: 'application/zip' }));
    const file = vi.fn();

    class JSZipMock {
        file = file;
        generateAsync = generateAsync;
    }

    return { default: JSZipMock };
});

describe('downloadFileZip', () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let mockRemove: ReturnType<typeof vi.fn>;
    let fakeAnchor: any;

    beforeEach(() => {
        vi.clearAllMocks();
        ({ fakeAnchor, mockClick, mockRemove } = setupAnchorDownloadMocks());
    });

    test('triggers blob download for pem certificates', async () => {
        const certs = [{ uuid: 'c-1', commonName: 'example.com', serialNumber: '01', certificateContent: 'YQ==' }] as any[];

        downloadFileZip(['c-1'], certs, 'pem');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
        expect(fakeAnchor.download).toMatch(/CertificateDownload/);
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    });

    test('triggers blob download for der certificates', async () => {
        const certs = [{ uuid: 'c-2', commonName: '*.wildcard.com', serialNumber: '02', certificateContent: 'YQ==' }] as any[];

        downloadFileZip(['c-2'], certs, 'der');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    test('skips unmatched certificate uuids and still generates empty zip', async () => {
        const certs = [{ uuid: 'c-3', commonName: 'a.com', serialNumber: '03', certificateContent: 'YQ==' }] as any[];

        downloadFileZip(['c-999'], certs, 'pem');

        await vi.waitFor(() => expect(mockCreateObjectURL).toHaveBeenCalledTimes(1));
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
});

describe('formatPEM', () => {
    test('should format short PEM string', () => {
        const result = formatPEM('short');
        expect(result).toContain('-----BEGIN CERTIFICATE-----');
        expect(result).toContain('-----END CERTIFICATE-----');
        expect(result).toContain('short');
    });

    test('should wrap long PEM string at 64 chars', () => {
        const longString = 'a'.repeat(100);
        const result = formatPEM(longString);
        expect(result).toContain('-----BEGIN CERTIFICATE-----');
        expect(result).toContain('\r\n');
        expect(result).toContain('-----END CERTIFICATE-----');
    });

    test('wraps string into 64-char lines', () => {
        const input = 'a'.repeat(64 * 3);
        const result = formatPEM(input);
        const lines = result.split('\n');
        const contentLines = lines.filter((l) => !l.startsWith('-----'));
        contentLines.forEach((line) => {
            expect(line.replace(/\r/g, '').length).toBeLessThanOrEqual(64);
        });
    });

    test('exact 64-char input is treated as short (no wrapping)', () => {
        const input = 'b'.repeat(64);
        const result = formatPEM(input);
        expect(result).not.toContain('\r\n');
        expect(result).toContain(input);
    });

    test('65-char input triggers wrapping', () => {
        const input = 'c'.repeat(65);
        const result = formatPEM(input);
        expect(result).toContain('\r\n');
    });

    test('empty string returns just the headers', () => {
        const result = formatPEM('');
        expect(result).toBe('-----BEGIN CERTIFICATE-----\n\n-----END CERTIFICATE-----');
    });
});

describe('downloadFile', () => {
    runDownloadFileSuite(downloadFile, mockCreateObjectURL);

    test('uses text/plain as default type', () => {
        downloadFile('hello', 'test.txt');
        const blob: Blob = mockCreateObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('text/plain');
    });

    test('uses provided type when specified', () => {
        downloadFile('hello', 'test.pem', 'application/x-pem-file');
        const blob: Blob = mockCreateObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/x-pem-file');
    });

    test('handles empty content string', () => {
        const { mockClick } = setupAnchorDownloadMocks();
        downloadFile('', 'empty.txt');
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
});
