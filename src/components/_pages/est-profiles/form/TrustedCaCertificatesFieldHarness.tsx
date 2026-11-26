import { useState } from 'react';
import type { CertificateListResponseModel } from 'types/certificate';
import type { NameAndUuidDto } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import TrustedCaCertificatesField from './TrustedCaCertificatesField';

const caCertificate = (uuid: string, displayName: string, commonName: string): CertificateListResponseModel =>
    ({
        uuid,
        displayName,
        commonName,
        subjectDn: `CN=${commonName}`,
        serialNumber: `${uuid}-serial`,
    }) as CertificateListResponseModel;

const CA_CERTIFICATES = [caCertificate('ca-1', 'Root CA', 'root.example'), caCertificate('ca-2', 'Issuing CA', 'issuing.example')];

type Props = Readonly<{ initialValue?: string[]; bound?: NameAndUuidDto[]; listError?: string; disabled?: boolean }>;

export default function TrustedCaCertificatesFieldHarness({ initialValue = [], bound, listError, disabled }: Props) {
    const [value, setValue] = useState(initialValue);

    return withProviders(
        <>
            <TrustedCaCertificatesField
                value={value}
                onChange={setValue}
                caCertificates={CA_CERTIFICATES}
                bound={bound}
                listError={listError}
                disabled={disabled}
            />
            <pre data-testid="value">{JSON.stringify(value)}</pre>
        </>,
    );
}
