import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { actions as certificatesActions } from 'ducks/certificates';
import Dialog from 'components/Dialog';
import TextInput from 'components/TextInput';
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
            icon="destroy"
            size="md"
            body={<TextInput type="textarea" id="cancel-pending-reason" label="Reason (optional)" value={reason} onChange={setReason} />}
            buttons={[
                { key: 'keep', body: 'Keep pending', color: 'secondary', variant: 'outline', onClick: onClose },
                { key: 'cancel', body: 'Cancel operation', color: 'danger', onClick: onConfirm },
            ]}
        />
    );
}
