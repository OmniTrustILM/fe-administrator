import { useDispatch } from 'react-redux';
import { actions as certificatesActions } from 'ducks/certificates';
import Dialog from 'components/Dialog';
import type { CertificateDetailResponseModel } from 'types/certificate';

type Props = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    certificate: Pick<CertificateDetailResponseModel, 'uuid' | 'raProfile'>;
}>;

export default function ConfirmRevokeDialog({ isOpen, onClose, certificate }: Props) {
    const dispatch = useDispatch();

    const onConfirm = () => {
        if (!certificate.raProfile?.authorityInstanceUuid) return;
        dispatch(
            certificatesActions.manuallyConfirmRevoke({
                authorityUuid: certificate.raProfile.authorityInstanceUuid,
                raProfileUuid: certificate.raProfile.uuid,
                uuid: certificate.uuid,
            }),
        );
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption="Confirm revocation"
            icon="check"
            size="md"
            body={<p>Mark this certificate as revoked. The pending revocation request will be finalised.</p>}
            buttons={[
                { key: 'cancel', body: 'Cancel', color: 'secondary', variant: 'outline', onClick: onClose },
                { key: 'confirm', body: 'Confirm', color: 'danger', onClick: onConfirm },
            ]}
        />
    );
}
