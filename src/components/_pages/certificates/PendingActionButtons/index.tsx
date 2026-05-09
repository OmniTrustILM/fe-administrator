import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CertificateState } from 'types/openapi';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { actions as certificatesActions, selectors as certificatesSelectors } from 'ducks/certificates';
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
    const iconSize = compact ? 16 : 20;
    const containerCls = compact ? 'inline-flex items-center gap-1 ml-2' : 'inline-flex items-center gap-2 ml-2';

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
            <span className={containerCls}>
                {certificate.state === CertificateState.PendingIssue && (
                    <button
                        type="button"
                        aria-label="Finalise issue (upload certificate)"
                        title="Finalise issue (upload certificate)"
                        onClick={() => {
                            if (!isFinalizingThis) setShowFinalize(true);
                        }}
                        disabled={isFinalizingThis}
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
                            if (!isConfirmingThis) setShowConfirmRevoke(true);
                        }}
                        disabled={isConfirmingThis}
                    >
                        <CheckCircle size={iconSize} />
                    </button>
                )}
                <button
                    type="button"
                    aria-label="Cancel pending operation"
                    title="Cancel pending operation"
                    onClick={() => {
                        if (!isCancelingThis) setShowCancel(true);
                    }}
                    disabled={isCancelingThis}
                >
                    <XCircle size={iconSize} />
                </button>
            </span>

            {showFinalize && (
                <CertificateUploadDialog onCancel={() => setShowFinalize(false)} onUpload={onUpload} okButtonTitle="Finalise issue" />
            )}

            <ConfirmRevokeDialog isOpen={showConfirmRevoke} onClose={() => setShowConfirmRevoke(false)} certificate={certificate} />
            <CancelPendingDialog isOpen={showCancel} onClose={() => setShowCancel(false)} certificate={certificate} />
        </>
    );
}
