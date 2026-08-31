import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { CertificateState, CertificateValidationStatus } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';

setupReactActEnvironment();

vi.mock('./CertificateStatus', () => ({
    default: ({ status }: { status: string }) => <span data-testid="certificate-status">{status}</span>,
}));

vi.mock('./PendingActionButtons', () => ({
    default: () => <span>pending-actions</span>,
}));

vi.mock('components/EnumDescription', () => ({
    EnumValueDescription: () => <span>enum-description</span>,
    EnumColumnDescription: () => <span>enum-column-description</span>,
}));

vi.mock('react-router', () => ({
    Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

const { buildCertificateDetailBaseRows } = await import('./certificateTableHelpers');

function buildRows(state: CertificateState, resultStatus?: CertificateValidationStatus) {
    return buildCertificateDetailBaseRows(
        { uuid: 'cert-1', commonName: 'cert.example.com', subjectDn: 'CN=cert', state } as CertificateDetailResponseModel,
        resultStatus ? { resultStatus } : undefined,
        false,
        { certificateKeyUsage: {}, qcType: {} },
        (d: Date) => d.toISOString(),
        (_enumMap, key: string) => key,
        () => undefined,
    );
}

describe('buildCertificateDetailBaseRows - validation status', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    async function renderValidationStatusValue(state: CertificateState, resultStatus?: CertificateValidationStatus) {
        const row = buildRows(state, resultStatus).find((r) => r.id === 'validationStatus');
        await act(async () => {
            root.render(<>{row?.columns[1]}</>);
        });
    }

    it('explains that validation waits for issuance while the certificate is only requested', async () => {
        await renderValidationStatusValue(CertificateState.Requested);

        expect(container.textContent).toContain('Validation will run once the certificate is issued.');
        expect(container.querySelector('[data-testid="certificate-status"]')?.textContent).toBe(CertificateValidationStatus.NotChecked);
    });

    it('does not explain issuance for an issued certificate that has simply not been validated', async () => {
        await renderValidationStatusValue(CertificateState.Issued);

        expect(container.textContent).not.toContain('Validation will run once the certificate is issued.');
        expect(container.querySelector('[data-testid="certificate-status"]')?.textContent).toBe(CertificateValidationStatus.NotChecked);
    });

    it('shows the validation result status when one is available', async () => {
        await renderValidationStatusValue(CertificateState.Issued, CertificateValidationStatus.Valid);

        expect(container.querySelector('[data-testid="certificate-status"]')?.textContent).toBe(CertificateValidationStatus.Valid);
    });
});
