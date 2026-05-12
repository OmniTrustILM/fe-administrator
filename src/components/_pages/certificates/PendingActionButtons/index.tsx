import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { actions as certificatesActions, selectors as certificatesSelectors } from 'ducks/certificates';
import Button from 'components/Button';
import Dialog from 'components/Dialog';
import { iconRegistry } from 'utils/icons';
import CertificateUploadDialog from '../CertificateUploadDialog';
import ConfirmRevokeDialog from './ConfirmRevokeDialog';
import CancelPendingDialog from './CancelPendingDialog';

type Props = Readonly<{
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'state' | 'raProfile'>;
    compact?: boolean;
}>;

export default function PendingActionButtons({ certificate, compact = false }: Props) {
    const dispatch = useDispatch();
    const [showFinalize, setShowFinalize] = useState(false);
    const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
    const [showCancel, setShowCancel] = useState(false);

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

    const onUpload = (data: { fileContent: string; customAttributes?: any }) => {
        if (!certificate.raProfile?.authorityInstanceUuid) return;
        dispatch(
            certificatesActions.manuallyIssueCertificate({
                authorityUuid: certificate.raProfile.authorityInstanceUuid,
                raProfileUuid: certificate.raProfile.uuid,
                uuid: certificate.uuid,
                uploadRequest: {
                    certificate: data.fileContent,
                    customAttributes: data.customAttributes ?? [],
                },
            }),
        );
        setShowFinalize(false);
    };

    return (
        <>
            <span className="inline-flex items-center gap-1 ml-2 align-middle">
                {certificate.state === CertificateState.PendingIssue && (
                    <Button
                        variant="transparent"
                        className={buttonClass}
                        title="Finalize issue (upload certificate)"
                        data-testid="finalize-issue-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isFinalizingThis) setShowFinalize(true);
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
                            if (!isConfirmingThis) setShowConfirmRevoke(true);
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
                        if (!isCancelingThis) setShowCancel(true);
                    }}
                    disabled={isCancelingThis}
                >
                    <XCircle size={16} />
                    <span className="sr-only">Cancel pending operation</span>
                </Button>
            </span>

            {createPortal(
                <div onClickCapture={(e) => e.stopPropagation()} onKeyDownCapture={(e) => e.stopPropagation()}>
                    <Dialog
                        isOpen={showFinalize}
                        caption="Finalize Issue"
                        body={
                            <CertificateUploadDialog
                                onCancel={() => setShowFinalize(false)}
                                onUpload={onUpload}
                                okButtonTitle="Finalize issue"
                            />
                        }
                        toggle={() => setShowFinalize(false)}
                        buttons={[]}
                        size="xl"
                        icon="upload"
                    />
                    <ConfirmRevokeDialog isOpen={showConfirmRevoke} onClose={() => setShowConfirmRevoke(false)} certificate={certificate} />
                    <CancelPendingDialog isOpen={showCancel} onClose={() => setShowCancel(false)} certificate={certificate} />
                </div>,
                document.body,
            )}
        </>
    );
}
