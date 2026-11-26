import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { setupReactActEnvironment } from '../test-utils/reactActEnvironment';
import { AutoRenewalMode, CertificateState, CertificateValidationStatus, RenewalWindowSource } from 'types/openapi';
import type { EnumItemModel } from 'types/enums';
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

    const opts = {
        isLinkDisabled: true,
        selectCertsOnly: false,
        dateFormatter: (d: Date) => d.toISOString(),
        certificateTypeEnum: {},
        getEnumLabel: (_enumMap: unknown, key: string) => key,
        onPendingAction: () => undefined,
    };

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
                'property:RENEWAL_WINDOW_START',
                'property:SERIAL_NUMBER',
                'property:SIGNATURE_ALGORITHM',
                'property:SUBJECTDN',
                'property:TRUSTED_CA',
            ].sort(),
        );
    });

    it('renders the renewal window start as a date, and nothing without one', async () => {
        const { buildCertificateCellRegistry } = await import('./certificateTableHelpers');
        const render = buildCertificateCellRegistry(opts)['property:RENEWAL_WINDOW_START'];

        await act(async () => {
            root.render(<>{render({ renewalWindowStart: '2026-05-01T00:00:00.000Z' } as any)}</>);
        });
        expect(container.textContent).toBe('2026-05-01T00:00:00.000Z');

        expect(render({} as any)).toBeNull();
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

describe('buildCertificateDetailBaseRows - renewal rows', () => {
    const renewalIds = ['renewalWindow', 'renewalWindowSource', 'renewalExplanation', 'renewalWindowUpdatedAt', 'renewalDue'];
    const baseCertificate = { uuid: 'cert-1', commonName: 'cert.example.com', subjectDn: 'CN=cert' };
    const renewalInfo = {
        windowStart: '2026-05-01T00:00:00.000Z',
        windowEnd: '2026-05-10T00:00:00.000Z',
        explanationUrl: 'https://ca.example.com/why',
        source: RenewalWindowSource.Authority,
        updatedAt: '2026-04-01T00:00:00.000Z',
        due: true,
    };
    const sourceEnum: Record<string, EnumItemModel> = { authority: { label: 'Authority' } as EnumItemModel };

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

    function buildRows(certificate: object) {
        return buildCertificateDetailBaseRows(
            certificate as CertificateDetailResponseModel,
            undefined,
            false,
            { certificateKeyUsage: {}, qcType: {}, renewalWindowSource: sourceEnum },
            (d: Date) => d.toISOString(),
            (enumMap, key: string) => enumMap?.[key]?.label ?? key,
            () => undefined,
        );
    }

    async function renderValue(rows: ReturnType<typeof buildRows>, id: string) {
        await act(async () => {
            root.render(<>{rows.find((r) => r.id === id)?.columns[1]}</>);
        });
    }

    it('adds no renewal rows without renewalInfo', () => {
        const rowIds = buildRows(baseCertificate).map((r) => r.id);

        for (const id of renewalIds) expect(rowIds).not.toContain(id);
    });

    it('adds the renewal rows right after Expires At when renewalInfo is present', async () => {
        const rows = buildRows({ ...baseCertificate, renewalInfo });
        const rowIds = rows.map((r) => r.id);
        const expiresAt = rowIds.indexOf('expiresAt');

        expect(rowIds.slice(expiresAt + 1, expiresAt + 1 + renewalIds.length)).toEqual(renewalIds);

        await renderValue(rows, 'renewalWindow');
        expect(container.textContent).toBe('2026-05-01T00:00:00.000Z - 2026-05-10T00:00:00.000Z');
        await renderValue(rows, 'renewalWindowSource');
        expect(container.textContent).toBe('Authority');
        await renderValue(rows, 'renewalExplanation');
        expect(container.querySelector('a')?.getAttribute('href')).toBe('https://ca.example.com/why');
        await renderValue(rows, 'renewalDue');
        expect(container.textContent).toBe('Renewal due');
    });

    it('shows no badge and no explanation when the window is not due and has no explanation url', async () => {
        const rows = buildRows({ ...baseCertificate, renewalInfo: { ...renewalInfo, due: false, explanationUrl: undefined } });

        await renderValue(rows, 'renewalDue');
        expect(container.textContent).toBe('');
        expect(rows.find((r) => r.id === 'renewalExplanation')?.columns[1]).toBe('');
    });

    it.each(['javascript:alert(1)', 'not a url'])('shows the explanation %s as plain text, not as a link', async (explanationUrl) => {
        const rows = buildRows({ ...baseCertificate, renewalInfo: { ...renewalInfo, explanationUrl } });

        await renderValue(rows, 'renewalExplanation');
        expect(container.querySelector('a')).toBeNull();
        expect(container.textContent).toBe(explanationUrl);
    });

    it('adds no automatic renewal row when renewalInfo carries no automatic renewal', () => {
        const rowIds = buildRows({ ...baseCertificate, renewalInfo }).map((r) => r.id);

        expect(rowIds).not.toContain('autoRenewal');
    });

    it.each([
        [AutoRenewalMode.Location, 'Per location'],
        [AutoRenewalMode.IlmKey, 'With the key held by ILM'],
    ])('shows the %s automatic renewal mode as "%s"', async (mode, label) => {
        const rows = buildRows({ ...baseCertificate, renewalInfo: { ...renewalInfo, autoRenewal: { mode } } });
        const rowIds = rows.map((r) => r.id);

        expect(rowIds.indexOf('autoRenewal')).toBe(rowIds.indexOf('renewalDue') + 1);
        expect(rows.find((r) => r.id === 'autoRenewal')?.columns[0]).toBe('Automatic Renewal');
        await renderValue(rows, 'autoRenewal');
        expect(container.textContent).toBe(label);
    });

    it('shows the blocked reason when automatic renewal is not possible', async () => {
        const autoRenewal = { mode: AutoRenewalMode.None, blockedReason: 'No location generates the key and ILM does not hold it' };
        const rows = buildRows({ ...baseCertificate, renewalInfo: { ...renewalInfo, autoRenewal } });

        await renderValue(rows, 'autoRenewal');
        expect(container.textContent).toBe(autoRenewal.blockedReason);
    });

    it('shows the raw mode when the backend sends an unknown automatic renewal mode', async () => {
        const rows = buildRows({
            ...baseCertificate,
            renewalInfo: { ...renewalInfo, autoRenewal: { mode: 'FUTURE_MODE' as AutoRenewalMode } },
        });

        await renderValue(rows, 'autoRenewal');
        expect(container.textContent).toBe('FUTURE_MODE');
    });

    it('falls back to the mode label when automatic renewal is not possible and no reason is given', async () => {
        const rows = buildRows({ ...baseCertificate, renewalInfo: { ...renewalInfo, autoRenewal: { mode: AutoRenewalMode.None } } });

        await renderValue(rows, 'autoRenewal');
        expect(container.textContent).toBe('Not possible');
    });
});
