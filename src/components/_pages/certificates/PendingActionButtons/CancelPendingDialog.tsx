import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { actions as certificatesActions } from 'ducks/certificates';
import Dialog from 'components/Dialog';
import type { CertificateDetailResponseModel } from 'types/certificate';

type Props = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'raProfile'>;
}>;

export default function CancelPendingDialog({ isOpen, onClose, certificate }: Props) {
    const dispatch = useDispatch();
    const [reason, setReason] = useState('');

    const onConfirm = () => {
        if (!certificate.raProfile?.authorityInstanceUuid) return;
        const trimmed = reason.trim();
        dispatch(
            certificatesActions.cancelPendingCertificateOperation({
                authorityUuid: certificate.raProfile.authorityInstanceUuid,
                raProfileUuid: certificate.raProfile.uuid,
                uuid: certificate.uuid,
                reason: trimmed.length === 0 ? undefined : trimmed,
            }),
        );
        setReason('');
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption="Cancel pending operation"
            body={
                <div>
                    <label htmlFor="cancel-pending-reason" className="block mb-2">
                        Reason (optional)
                    </label>
                    <textarea
                        id="cancel-pending-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full"
                    />
                </div>
            }
            buttons={[
                { key: 'keep', body: 'Keep pending', color: 'secondary', onClick: onClose },
                { key: 'cancel', body: 'Cancel operation', color: 'danger', onClick: onConfirm },
            ]}
        />
    );
}
