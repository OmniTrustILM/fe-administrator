import { CertificateRegistrationState } from 'types/openapi';

// There is no platform enum for the pre-registration authorization state — it is not part of the
// backend's enum registry, so it cannot be resolved via useGetStatusText/getEnumLabel. This is a
// plain presentational label map.
export const registrationStateLabels: Record<CertificateRegistrationState, string> = {
    [CertificateRegistrationState.Active]: 'Active',
    [CertificateRegistrationState.Expired]: 'Expired',
    [CertificateRegistrationState.Locked]: 'Locked',
    [CertificateRegistrationState.Closed]: 'Closed',
};
