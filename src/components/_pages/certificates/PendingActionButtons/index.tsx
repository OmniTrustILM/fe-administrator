import { CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';

type Props = Readonly<{
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'state' | 'raProfile'>;
    compact?: boolean;
}>;

export default function PendingActionButtons({ certificate, compact = false }: Props) {
    const isPending = certificate.state === CertificateState.PendingIssue || certificate.state === CertificateState.PendingRevoke;

    if (!isPending) return null;
    if (!certificate.raProfile) return null;

    // Buttons added in subsequent tasks.
    // The `compact` prop is consumed in Task 11 to size icons + tighten padding.
    void compact;
    return null;
}
