import type { CertificateDetailResponseModel } from 'types/certificate';

export type PendingActionCertificate = Pick<CertificateDetailResponseModel, 'uuid' | 'raProfile'>;

export type PendingAction =
    | { kind: 'finalize'; certificate: PendingActionCertificate }
    | { kind: 'confirmRevoke'; certificate: PendingActionCertificate }
    | { kind: 'cancel'; certificate: PendingActionCertificate };
