import { afterEach, describe, expect, test, vi, beforeEach } from 'vitest';

import { runDownloadFileSuite, setupAnchorDownloadMocks } from './__tests__/anchor-download-mock';
import {
    certificateFileBaseName,
    downloadFile,
    downloadFileZip,
    fileNameFromContentDisposition,
    formatPEM,
    triggerBlobDownload,
} from './download';

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(globalThis.URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true });
Object.defineProperty(globalThis.URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true });

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
        const certs = [
            { uuid: 'c-1', displayName: 'example.com', commonName: 'example.com', serialNumber: '01', certificateContent: 'YQ==' },
        ] as any[];

        downloadFileZip(['c-1'], certs, 'pem');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
        expect(fakeAnchor.download).toMatch(/CertificateDownload/);
        expect(mockRemove).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1));
    });

    test('triggers blob download for der certificates', async () => {
        const certs = [
            { uuid: 'c-2', displayName: '*.wildcard.com', commonName: '*.wildcard.com', serialNumber: '02', certificateContent: 'YQ==' },
        ] as any[];

        downloadFileZip(['c-2'], certs, 'der');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    test('numbers the entries that would share a name, so that no certificate is left out', async () => {
        const { default: JSZip } = await import('jszip');
        const zipFile = new JSZip().file as unknown as ReturnType<typeof vi.fn>;
        const certs = [
            { uuid: 'c-1', displayName: 'host-key', certificateContent: 'YQ==' },
            { uuid: 'c-2', displayName: 'host-key', certificateContent: 'Yg==' },
            { uuid: 'c-3', displayName: 'host-key', certificateContent: 'Yw==' },
            { uuid: 'c-4', displayName: 'other', serialNumber: '04', certificateContent: 'ZA==' },
        ] as any[];

        downloadFileZip(['c-1', 'c-2', 'c-3', 'c-4'], certs, 'pem');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(zipFile.mock.calls.map(([name]) => name)).toEqual(['host-key.pem', 'host-key (2).pem', 'host-key (3).pem', 'other_04.pem']);
    });

    test('numbers past an entry whose own name already looks numbered', async () => {
        const { default: JSZip } = await import('jszip');
        const zipFile = new JSZip().file as unknown as ReturnType<typeof vi.fn>;
        const certs = [
            { uuid: 'c-1', displayName: 'host-key', certificateContent: 'YQ==' },
            { uuid: 'c-2', displayName: 'host-key (2)', certificateContent: 'Yg==' },
            { uuid: 'c-3', displayName: 'host-key', certificateContent: 'Yw==' },
        ] as any[];

        downloadFileZip(['c-1', 'c-2', 'c-3'], certs, 'pem');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(zipFile.mock.calls.map(([name]) => name)).toEqual(['host-key.pem', 'host-key (2).pem', 'host-key (3).pem']);
    });

    test('numbers the entries whose names differ only by case, keeping their own casing', async () => {
        const { default: JSZip } = await import('jszip');
        const zipFile = new JSZip().file as unknown as ReturnType<typeof vi.fn>;
        const certs = [
            { uuid: 'c-1', displayName: 'App.example', certificateContent: 'YQ==' },
            { uuid: 'c-2', displayName: 'app.example', certificateContent: 'Yg==' },
        ] as any[];

        downloadFileZip(['c-1', 'c-2'], certs, 'pem');

        await vi.waitFor(() => expect(mockClick).toHaveBeenCalledTimes(1));
        expect(zipFile.mock.calls.map(([name]) => name)).toEqual(['App.example.pem', 'app.example (2).pem']);
    });

    test('skips unmatched certificate uuids and still generates empty zip', async () => {
        const certs = [{ uuid: 'c-3', displayName: 'a.com', commonName: 'a.com', serialNumber: '03', certificateContent: 'YQ==' }] as any[];

        downloadFileZip(['c-999'], certs, 'pem');

        await vi.waitFor(() => expect(mockCreateObjectURL).toHaveBeenCalledTimes(1));
        expect(mockClick).toHaveBeenCalledTimes(1);
    });
});

describe('triggerBlobDownload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('removes the anchor at once, and revokes the object URL only in the task after the click', () => {
        const { fakeAnchor, mockClick, mockRemove } = setupAnchorDownloadMocks();

        triggerBlobDownload(new Blob(['bytes']), 'web-01.p12');

        expect(fakeAnchor.download).toBe('web-01.p12');
        expect(mockClick).toHaveBeenCalledTimes(1);
        expect(mockRemove).toHaveBeenCalledTimes(1);
        expect(mockRevokeObjectURL).not.toHaveBeenCalled();

        vi.runAllTimers();

        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        expect(mockClick.mock.invocationCallOrder[0]).toBeLessThan(mockRevokeObjectURL.mock.invocationCallOrder[0]);
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
            expect(line.replaceAll('\r', '').length).toBeLessThanOrEqual(64);
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

describe('fileNameFromContentDisposition', () => {
    test('reads filename*', () => {
        expect(fileNameFromContentDisposition("attachment; filename*=UTF-8''web-01.p12", 'fallback.p12')).toBe('web-01.p12');
    });
    test('reads a quoted filename', () => {
        expect(fileNameFromContentDisposition('attachment; filename="web-01.p12"', 'fallback.p12')).toBe('web-01.p12');
    });
    test('falls back when there is no header', () => {
        expect(fileNameFromContentDisposition(undefined, 'fallback.p12')).toBe('fallback.p12');
    });
    test('falls back when the header names no file', () => {
        expect(fileNameFromContentDisposition('attachment', 'fallback.pem')).toBe('fallback.pem');
    });
    test('falls back to a plain filename when the extended one cannot be decoded', () => {
        expect(fileNameFromContentDisposition('attachment; filename*=UTF-8\'\'%E0%A4%A; filename="plain.p12"', 'fallback.p12')).toBe(
            'plain.p12',
        );
    });
    test('falls back to the fallback when the extended filename cannot be decoded and there is no plain one', () => {
        expect(fileNameFromContentDisposition("attachment; filename*=UTF-8''%E0%A4%A", 'fallback.p12')).toBe('fallback.p12');
    });
});

describe('certificateFileBaseName', () => {
    test('joins the display name and the serial number', () => {
        expect(certificateFileBaseName({ displayName: 'host.example', serialNumber: '0A1B' })).toBe('host.example_0A1B');
    });

    test('is the display name alone for a certificate without a serial number', () => {
        expect(certificateFileBaseName({ displayName: 'host-key' })).toBe('host-key');
    });

    test('is empty while no certificate is loaded', () => {
        expect(certificateFileBaseName(undefined)).toBe('');
    });
});
