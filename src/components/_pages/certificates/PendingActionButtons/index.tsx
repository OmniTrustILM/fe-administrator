import { CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { iconRegistry } from 'utils/icons';

type Props = Readonly<{
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'state' | 'raProfile'>;
    compact?: boolean;
}>;

export default function PendingActionButtons({ certificate, compact = false }: Props) {
    const isPending = certificate.state === CertificateState.PendingIssue || certificate.state === CertificateState.PendingRevoke;

    if (!isPending) return null;
    if (!certificate.raProfile) return null;

    const Upload = iconRegistry['upload'];
    const CheckCircle = iconRegistry['check-circle'];
    const XCircle = iconRegistry['cross-circle'];

    const iconSize = compact ? 16 : 20;
    const containerCls = compact ? 'inline-flex items-center gap-1 ml-2' : 'inline-flex items-center gap-2 ml-2';

    return (
        <span className={containerCls}>
            {certificate.state === CertificateState.PendingIssue && (
                <button
                    type="button"
                    aria-label="Finalise issue (upload certificate)"
                    title="Finalise issue (upload certificate)"
                    onClick={() => {
                        /* wired in Task 15 */
                    }}
                >
                    <Upload size={iconSize} />
                </button>
            )}
            {certificate.state === CertificateState.PendingRevoke && (
                <button
                    type="button"
                    aria-label="Confirm revocation"
                    title="Confirm revocation"
                    onClick={() => {
                        /* wired in Task 15 */
                    }}
                >
                    <CheckCircle size={iconSize} />
                </button>
            )}
            <button
                type="button"
                aria-label="Cancel pending operation"
                title="Cancel pending operation"
                onClick={() => {
                    /* wired in Task 15 */
                }}
            >
                <XCircle size={iconSize} />
            </button>
        </span>
    );
}
