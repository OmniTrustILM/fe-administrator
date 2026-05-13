import { useSelector } from 'react-redux';
import { CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { selectors as certificatesSelectors } from 'ducks/certificates';
import Button from 'components/Button';
import { iconRegistry } from 'utils/icons';
import type { PendingAction } from './types';

type Props = Readonly<{
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'state' | 'raProfile'>;
    compact?: boolean;
    onAction: (action: PendingAction) => void;
}>;

export default function PendingActionButtons({ certificate, compact = false, onAction }: Props) {
    const finalizing = useSelector(certificatesSelectors.finalizingIssueCertificateUuids);
    const confirming = useSelector(certificatesSelectors.confirmingRevokeCertificateUuids);
    const canceling = useSelector(certificatesSelectors.cancelingPendingCertificateUuids);

    const isFinalizingThis = finalizing.includes(certificate.uuid);
    const isConfirmingThis = confirming.includes(certificate.uuid);
    const isCancelingThis = canceling.includes(certificate.uuid);

    const isPending = certificate.state === CertificateState.PendingIssue || certificate.state === CertificateState.PendingRevoke;
    if (!isPending) return null;
    if (!certificate.raProfile?.authorityInstanceUuid) return null;

    const Upload = iconRegistry['upload'];
    const CheckCircle = iconRegistry['check-circle'];
    const XCircle = iconRegistry['cross-circle'];
    const buttonClass = compact ? '!p-1 -my-1' : undefined;

    const actionCertificate = { uuid: certificate.uuid, raProfile: certificate.raProfile };

    return (
        <span className="inline-flex items-center gap-1 ml-2 align-middle">
            {certificate.state === CertificateState.PendingIssue && (
                <Button
                    variant="transparent"
                    className={buttonClass}
                    title="Finalize issue (upload certificate)"
                    data-testid="finalize-issue-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isFinalizingThis) onAction({ kind: 'finalize', certificate: actionCertificate });
                    }}
                    disabled={isFinalizingThis}
                >
                    <Upload size={16} />
                    <span className="sr-only">Finalize issue (upload certificate)</span>
                </Button>
            )}
            {certificate.state === CertificateState.PendingRevoke && (
                <Button
                    variant="transparent"
                    className={buttonClass}
                    title="Confirm revocation"
                    data-testid="confirm-revoke-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isConfirmingThis) onAction({ kind: 'confirmRevoke', certificate: actionCertificate });
                    }}
                    disabled={isConfirmingThis}
                >
                    <CheckCircle size={16} />
                    <span className="sr-only">Confirm revocation</span>
                </Button>
            )}
            <Button
                variant="transparent"
                className={buttonClass}
                title="Cancel pending operation"
                data-testid="cancel-pending-button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isCancelingThis) onAction({ kind: 'cancel', certificate: actionCertificate });
                }}
                disabled={isCancelingThis}
            >
                <XCircle size={16} />
                <span className="sr-only">Cancel pending operation</span>
            </Button>
        </span>
    );
}
