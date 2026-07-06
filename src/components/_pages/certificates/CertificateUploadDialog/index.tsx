import CertificateAttributes from 'components/CertificateAttributes';
import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { transformParseCertificateResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificate';
import { actions as utilsCertificateActions, selectors as utilsCertificateSelectors } from '../../../../ducks/utilsCertificate';
import type { AttributeRequestModel } from '../../../../types/attributes';
import { Resource } from '../../../../types/openapi';
import { ParseCertificateRequestDtoParseTypeEnum } from '../../../../types/openapi/utils';
import { collectFormAttributes } from '../../../../utils/attributes/attributes';
import AttributeEditor from '../../../Attributes/AttributeEditor';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import TabLayout from '../../../Layout/TabLayout';
import ProgressButton from '../../../ProgressButton';
import Button from 'components/Button';
import Container from 'components/Container';

type FormValues = Record<string, never>;

type Props = {
    onCancel: () => void;
    onUpload: (data: {
        fileContent: string;
        customAttributes?: Array<AttributeRequestModel>;
        certificate?: CertificateDetailResponseModel;
    }) => void;
    okButtonTitle?: string;
    showCustomAttributes?: boolean;
};

export default function CertificateUploadDialog({
    onCancel,
    onUpload,
    okButtonTitle = 'Upload',
    showCustomAttributes = true,
}: Readonly<Props>) {
    const dispatch = useDispatch();

    const [certificate, setCertificate] = useState<CertificateDetailResponseModel | undefined>();
    const [fileContent, setFileContent] = useState('');

    const secondaryResourceCustomAttributes = useSelector(customAttributesSelectors.secondaryResourceCustomAttributes);
    const parsedCertificate = useSelector(utilsCertificateSelectors.parsedCertificate);
    const health = useSelector(utilsActuatorSelectors.health);

    useEffect(() => {
        if (showCustomAttributes) {
            dispatch(customAttributesActions.listSecondaryResourceCustomAttributes(Resource.Certificates));
        }
        dispatch(utilsCertificateActions.reset());
        dispatch(utilsActuatorActions.health());
    }, [dispatch, showCustomAttributes]);

    useEffect(() => {
        setCertificate(
            parsedCertificate ? transformParseCertificateResponseDtoToCertificateResponseDetailModel(parsedCertificate) : undefined,
        );
    }, [parsedCertificate]);

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { control, handleSubmit, formState } = methods;
    const allFormValues = useWatch({ control });

    const onSubmit = () => {
        onUpload({
            fileContent: fileContent,
            customAttributes: showCustomAttributes
                ? collectFormAttributes('customUploadCertificate', secondaryResourceCustomAttributes, allFormValues)
                : [],
            certificate: certificate,
        });
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <FileUpload
                        editable
                        fileType={'certificate'}
                        onFileContentLoaded={(fileContent) => {
                            setFileContent(fileContent);
                            if (health) {
                                dispatch(
                                    utilsCertificateActions.parseCertificate({
                                        certificate: fileContent,
                                        parseType: ParseCertificateRequestDtoParseTypeEnum.Basic,
                                    }),
                                );
                            }
                        }}
                    />

                    {certificate && <CertificateAttributes certificate={certificate} />}

                    {showCustomAttributes && (
                        <TabLayout
                            noBorder
                            tabs={[
                                {
                                    title: 'Custom Attributes',
                                    content: (
                                        <AttributeEditor
                                            id="customUploadCertificate"
                                            attributeDescriptors={secondaryResourceCustomAttributes}
                                        />
                                    ),
                                },
                            ]}
                        />
                    )}

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" onClick={onCancel} disabled={formState.isSubmitting} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            title={okButtonTitle}
                            inProgressTitle={okButtonTitle}
                            inProgress={formState.isSubmitting}
                            disabled={!formState.isValid || !fileContent}
                        />
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
