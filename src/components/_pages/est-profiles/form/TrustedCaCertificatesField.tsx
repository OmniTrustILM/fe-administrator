import { useMemo } from 'react';
import type { CertificateListResponseModel } from 'types/certificate';
import type { NameAndUuidDto } from 'types/openapi';
import ReferenceMultiSelect from './ReferenceMultiSelect';

type Props = Readonly<{
    value: string[];
    onChange: (uuids: string[]) => void;
    // The result of the CA-certificate search.
    caCertificates: readonly CertificateListResponseModel[];
    // The trusted CA certificates the profile already has.
    bound?: readonly NameAndUuidDto[];
    listError?: string;
    error?: string;
    disabled?: boolean;
}>;

export default function TrustedCaCertificatesField({ value, onChange, caCertificates, bound, listError, error, disabled }: Props) {
    const options = useMemo(
        () =>
            caCertificates.map((certificate) => ({
                value: certificate.uuid,
                label: certificate.commonName || certificate.subjectDn,
                description: [certificate.subjectDn, certificate.serialNumber].filter(Boolean).join(' · '),
            })),
        [caCertificates],
    );
    const knownLabels = useMemo(() => new Map((bound ?? []).map((certificate) => [certificate.uuid, certificate.name])), [bound]);

    return (
        <ReferenceMultiSelect
            id="trustedCaCertificates"
            label="Trusted CA certificates"
            placeholder="Select the CA certificates that issue client certificates"
            hint="A client certificate must chain to one of these. Only root and intermediate CA certificates are listed."
            options={options}
            value={value}
            onChange={onChange}
            knownLabels={knownLabels}
            unusableDescription="Not a listed CA certificate"
            listError={listError}
            error={error}
            disabled={disabled}
        />
    );
}
