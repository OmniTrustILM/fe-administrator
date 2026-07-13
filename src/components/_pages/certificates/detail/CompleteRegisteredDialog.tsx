import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import FileUpload from 'components/Input/FileUpload/FileUpload';
import { actions as certificateActions } from 'ducks/certificates';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRequestFormat } from 'types/openapi';

type Props = Readonly<{
    certificate: CertificateDetailResponseModel;
    onCancel: () => void;
}>;

export default function CompleteRegisteredDialog({ certificate, onCancel }: Props) {
    const dispatch = useDispatch();

    // Write-only: the challenge is never displayed back, only forwarded to the completion request.
    const [authorizationSecret, setAuthorizationSecret] = useState('');
    const [csrContent, setCsrContent] = useState('');

    const canSubmit = !!authorizationSecret && !!csrContent;

    const onSubmit = useCallback(() => {
        if (!canSubmit) return;

        dispatch(
            certificateActions.completeRegisteredCertificate({
                authorityUuid: certificate.raProfile?.authorityInstanceUuid ?? '',
                raProfileUuid: certificate.raProfile?.uuid ?? '',
                certificateUuid: certificate.uuid,
                request: csrContent,
                format: CertificateRequestFormat.Pkcs10,
                authorizationSecret,
                attributes: [],
            }),
        );
        onCancel();
    }, [canSubmit, dispatch, certificate, csrContent, authorizationSecret, onCancel]);

    return (
        <div className="space-y-4">
            <TextInput
                id="completeAuthorizationSecret"
                dataTestId="completeAuthorizationSecret"
                type="password"
                required
                label="Challenge"
                value={authorizationSecret}
                onChange={setAuthorizationSecret}
            />

            <FileUpload id="completeCsrUpload" fileType="CSR" editable required onFileContentLoaded={setCsrContent} />

            <Container className="flex-row justify-end modal-footer" gap={4}>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button color="primary" disabled={!canSubmit} onClick={onSubmit} data-testid="completeRegisteredSubmit">
                    Complete
                </Button>
            </Container>
        </div>
    );
}
