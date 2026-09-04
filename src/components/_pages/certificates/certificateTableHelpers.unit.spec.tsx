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

describe('buildCertificateCellRegistry', () => {
    const opts = {
        isLinkDisabled: true,
        selectCertsOnly: false,
        currentFilters: [],
        dispatch: (() => undefined) as never,
        dateFormatter: (d: Date) => d.toISOString(),
        certificateTypeEnum: {},
        getEnumLabel: (_enumMap: unknown, key: string) => key,
        onPendingAction: () => undefined,
    };

    /**
     * The registry decides whether the picker offers a property column: a field whose value the list
     * DTO does not carry could only ever render the empty state, so it is registered nowhere. This
     * pins both halves — a field that gains a renderer becomes pickable, and one that loses its value
     * on the DTO must lose its renderer with it.
     */
    it('registers every catalogued certificate property field whose value the list DTO carries', async () => {
        const { buildCertificateCellRegistry } = await import('./certificateTableHelpers');

        expect(Object.keys(buildCertificateCellRegistry(opts)).sort()).toEqual(
            [
                'property:ALT_KEY_SIZE',
                'property:ALT_PUBLIC_KEY_ALGORITHM',
                'property:ALT_SIGNATURE_ALGORITHM',
                'property:ARCHIVED',
                'property:CERTIFICATE_STATE',
                'property:CERTIFICATE_TYPE',
                'property:CERTIFICATE_VALIDATION_STATUS',
                'property:COMMON_NAME',
                'property:COMPLIANCE_STATUS',
                'property:FINGERPRINT',
                'property:GROUP_NAME',
                'property:HYBRID_CERTIFICATE',
                'property:ISSUERDN',
                'property:ISSUER_COMMON_NAME',
                'property:ISSUER_SERIAL_NUMBER',
                'property:KEY_SIZE',
                'property:NOT_AFTER',
                'property:NOT_BEFORE',
                'property:OWNER',
                'property:PRIVATE_KEY',
                'property:PUBLIC_KEY_ALGORITHM',
                'property:RA_PROFILE_NAME',
                'property:SERIAL_NUMBER',
                'property:SIGNATURE_ALGORITHM',
                'property:SUBJECTDN',
                'property:TRUSTED_CA',
            ].sort(),
        );
    });

    it.each([
        'CERT_LOCATION_NAME',
        'KEY_USAGE',
        'SUBJECT_TYPE',
        'SUBJECT_ALTERNATIVE_NAMES',
        'OCSP_VALIDATION',
        'CRL_VALIDATION',
        'SIGNATURE_VALIDATION',
        'CERTIFICATE_PROTOCOL',
        'SUCCEEDING_CERTIFICATES',
        'PRECEDING_CERTIFICATES',
        'ACME_PROFILE',
        'SCEP_PROFILE',
        'CMP_PROFILE',
        'ACME_ACCOUNT',
    ])('registers no renderer for %s, whose value the list DTO does not carry', async (identifier) => {
        const { buildCertificateCellRegistry } = await import('./certificateTableHelpers');

        expect(buildCertificateCellRegistry(opts)[`property:${identifier}`]).toBeUndefined();
    });

    it('covers every column of the platform default set', async () => {
        const { buildCertificateCellRegistry, CERTIFICATE_COLUMNS } = await import('./certificateTableHelpers');
        const registry = buildCertificateCellRegistry(opts);

        for (const column of CERTIFICATE_COLUMNS) {
            expect(registry[`${column.fieldSource}:${column.fieldIdentifier}`], column.fieldIdentifier).toBeDefined();
        }
    });
});
