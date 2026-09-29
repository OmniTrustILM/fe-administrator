import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useEffect, useState } from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeRequestModel } from 'types/attributes';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { transformParseRequestResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificateRequest';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';
import type { CertificateDetailResponseModel } from '../../../../types/certificate';
import CertificateAttributes from '../../../CertificateAttributes';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import OperationAttributesEditor from '../OperationAttributesEditor';
import { useOperationAttributes } from '../OperationAttributesEditor/useOperationAttributes';

type Props = {
    onCancel: () => void;
    allowWithoutFile: boolean;
    certificate?: CertificateDetailResponseModel;
    onRenew: (data: { fileContent?: string; attributes: AttributeRequestModel[] }) => void;
};

export default function CertificateRenewDialog({ onCancel, allowWithoutFile, certificate, onRenew }: Readonly<Props>) {
    const dispatch = useDispatch();

    const [fileContent, setFileContent] = useState<string | undefined>();
    const [uploadCsr, setUploadCsr] = useState(false);
    const [parsedCertificate, setParsedCertificate] = useState<CertificateDetailResponseModel | undefined>();

    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const health = useSelector(utilsActuatorSelectors.health);
    const renew = useOperationAttributes('renew', certificate?.raProfile?.uuid, certificate?.raProfile?.authorityInstanceUuid);

    useEffect(() => {
        dispatch(utilsCertificateRequestActions.reset());
        dispatch(utilsActuatorActions.health());
    }, [dispatch]);

    useEffect(() => {
        setParsedCertificate(
            parsedCertificateRequest
                ? transformParseRequestResponseDtoToCertificateResponseDetailModel(parsedCertificateRequest)
                : undefined,
        );
    }, [parsedCertificateRequest]);

    const methods = useForm<FieldValues>({ mode: 'onTouched' });

    const onSubmit = (values: FieldValues) => {
        onRenew({ fileContent, attributes: renew.collect(values) });
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
                <Widget noBorder busy={renew.isFetching}>
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

                            {parsedCertificate && (
                                <>
                                    <br />
                                    <CertificateAttributes csr={true} certificate={parsedCertificate} />
                                </>
                            )}
                        </>
                    ) : null}

                    {renew.descriptors.length > 0 && (
                        <TabLayout
                            noBorder
                            tabs={[{ title: 'Renew Attributes', content: <OperationAttributesEditor attributes={renew} /> }]}
                        />
                    )}

                    <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                        <Button variant="outline" onClick={onCancel} type="button">
                            Cancel
                        </Button>
                        <Button color="primary" type="submit" disabled={renew.isFetching} data-testid="renewSubmit">
                            Renew
                        </Button>
                    </Container>
                </Widget>
            </form>
        </FormProvider>
    );
}
