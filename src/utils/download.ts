import { Buffer } from 'buffer';

import type { CertificateContentResponseModel, CertificateDetailResponseModel } from 'types/certificate';

export function triggerBlobDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    element.remove();
    // The browser starts the download from the click; revoking the URL in the same task can cancel it.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function fileNameFromContentDisposition(header: string | undefined, fallback: string): string {
    if (!header) return fallback;
    const extended = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
    if (extended) {
        try {
            return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ''));
        } catch {
            // A malformed percent-escape falls through to a plain filename, then the fallback.
        }
    }
    const plain = /filename="?([^";]+)"?/i.exec(header);
    return plain ? plain[1].trim() : fallback;
}

export function downloadFile(content: string, fileName: string, type?: string) {
    const element = document.createElement('a');

    const byteNumbers = new Array(content.length);
    for (let i = 0; i < content.length; i++) {
        byteNumbers[i] = content.codePointAt(i) ?? 0;
    }
    const byteArray = new Uint8Array(byteNumbers);

    if (!type) {
        type = 'text/plain';
    }

    const file = new Blob([byteArray], { type: type });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
}

export function downloadFileZip(
    certificateUuids: string[],
    certificates: CertificateDetailResponseModel[] | CertificateContentResponseModel[],
    fileType: string,
): void {
    void (async () => {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();

        for (const i of certificateUuids) {
            const certificate = (certificates as Array<CertificateDetailResponseModel | CertificateContentResponseModel>).find(
                (c) => c.uuid === i,
            );

            if (!certificate) continue;

            let content: string | Uint8Array;

            if (fileType === 'pem') {
                content = formatPEM(certificate.certificateContent || '');
            } else {
                content = new Uint8Array(Buffer.from(certificate.certificateContent || '', 'base64'));
            }

            zip.file(certificate.commonName.replace('*.', '_.') + '_' + certificate.serialNumber + '.' + fileType, content);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        triggerBlobDownload(blob, 'CertificateDownload ' + new Date().toISOString().replace(' ', '_') + '.zip');
    })().catch((err) => {
        console.error('Failed to build certificate zip', err);
    });
}

export function formatPEM(pemString: string) {
    const PEM_STRING_LENGTH = pemString.length,
        LINE_LENGTH = 64;

    const wrapNeeded = PEM_STRING_LENGTH > LINE_LENGTH;

    if (wrapNeeded) {
        let formattedString = '',
            wrapIndex = 0;

        for (let i = LINE_LENGTH; i < PEM_STRING_LENGTH; i += LINE_LENGTH) {
            formattedString += pemString.substring(wrapIndex, i) + '\r\n';
            wrapIndex = i;
        }

        formattedString += pemString.substring(wrapIndex, PEM_STRING_LENGTH);

        return `-----BEGIN CERTIFICATE-----\n${formattedString}\n-----END CERTIFICATE-----`;
    } else {
        return `-----BEGIN CERTIFICATE-----\n${pemString}\n-----END CERTIFICATE-----`;
    }
}
