import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { transformParseRequestResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificateRequest';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';
import type { CertificateDetailResponseModel } from '../../../../types/certificate';
import CertificateAttributes from '../../../CertificateAttributes';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import Button from 'components/Button';
import Container from 'components/Container';
import Switch from 'components/Switch';

type Props = Readonly<{
    onCancel: () => void;
    allowWithoutFile: boolean;
    onRenew: (data: { fileContent?: string }) => void;
}>;

export default function CertificateRenewDialog({ onCancel, allowWithoutFile, onRenew }: Props) {
    const dispatch = useDispatch();

    const [fileContent, setFileContent] = useState<string | undefined>();
    const [uploadCsr, setUploadCsr] = useState(false);
    const [certificate, setCertificate] = useState<CertificateDetailResponseModel | undefined>();

    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const health = useSelector(utilsActuatorSelectors.health);

    useEffect(() => {
        dispatch(utilsCertificateRequestActions.reset());
        dispatch(utilsActuatorActions.health());
    }, [dispatch]);

    useEffect(() => {
        setCertificate(
            parsedCertificateRequest
                ? transformParseRequestResponseDtoToCertificateResponseDetailModel(parsedCertificateRequest)
                : undefined,
        );
    }, [parsedCertificateRequest]);

    return (
        <div>
            {allowWithoutFile ? (
                <div className="mb-4">
                    <Switch id="uploadCsr" label="Upload new CSR ?" checked={uploadCsr} onChange={setUploadCsr} />
                </div>
            ) : null}

            {!allowWithoutFile || uploadCsr ? (
                <>
                    <FileUpload
                        editable
                        fileType={'CSR'}
                        onFileContentLoaded={(fileContent) => {
                            setFileContent(fileContent);
                            if (health) {
                                dispatch(
                                    utilsCertificateRequestActions.parseCertificateRequest({
                                        content: fileContent,
                                        requestParseType: ParseRequestRequestDtoParseTypeEnum.Basic,
                                    }),
                                );
                            }
                        }}
                    />

                    {certificate && (
                        <>
                            <br />
                            <CertificateAttributes csr={true} certificate={certificate} />
                        </>
                    )}
                </>
            ) : (
                <></>
            )}

            <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button color="primary" onClick={() => onRenew({ fileContent: fileContent })}>
                    Renew
                </Button>
            </Container>
        </div>
    );
}
