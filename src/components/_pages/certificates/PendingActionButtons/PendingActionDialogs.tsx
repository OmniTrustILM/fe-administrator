import { useDispatch } from 'react-redux';
import { actions as certificatesActions } from 'ducks/certificates';
import Dialog from 'components/Dialog';
import CertificateUploadDialog from '../CertificateUploadDialog';
import ConfirmRevokeDialog from './ConfirmRevokeDialog';
import CancelPendingDialog from './CancelPendingDialog';
import type { AttributeRequestModel } from 'types/attributes';
import type { PendingAction } from './types';

type Props = Readonly<{
    action: PendingAction | null;
    onClose: () => void;
}>;

export default function PendingActionDialogs({ action, onClose }: Props) {
    const dispatch = useDispatch();

    const onUpload = (data: { fileContent: string; customAttributes?: AttributeRequestModel[] }) => {
        if (action?.kind !== 'finalize') return;
        const { certificate } = action;
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
        onClose();
    };

    return (
        <>
            {action?.kind === 'finalize' && (
                <Dialog
                    isOpen
                    caption="Finalize Issue"
                    body={
                        <CertificateUploadDialog
                            onCancel={onClose}
                            onUpload={onUpload}
                            showCustomAttributes={false}
                            okButtonTitle="Finalize issue"
                        />
                    }
                    toggle={onClose}
                    buttons={[]}
                    size="xl"
                    icon="upload"
                />
            )}
            {action?.kind === 'confirmRevoke' && <ConfirmRevokeDialog isOpen onClose={onClose} certificate={action.certificate} />}
            {action?.kind === 'cancel' && <CancelPendingDialog isOpen onClose={onClose} certificate={action.certificate} />}
        </>
    );
}
