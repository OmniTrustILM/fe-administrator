import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useEffect, useRef, useState } from 'react';
import { Controller, type FieldValues, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeRequestModel } from 'types/attributes';
import { CertificateRegistrationState } from 'types/openapi';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { transformParseRequestResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificateRequest';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from '../../../../types/certificate';
import CertificateAttributes from '../../../CertificateAttributes';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import OperationAttributesEditor from '../OperationAttributesEditor';
import { useOperationAttributes } from '../OperationAttributesEditor/useOperationAttributes';
import SuccessorRegistrationFields from '../SuccessorRegistration';
import { type SuccessorFormValues, useSuccessorRegistration } from '../SuccessorRegistration/useSuccessorRegistration';

type Props = {
    certificate: CertificateDetailResponseModel;
    onCancel: () => void;
    // Called once Core confirms the renewal or registration; the page then redirects to the new certificate.
    onDone: () => void;
    allowWithoutFile: boolean;
    onRenew: (data: { fileContent?: string; authorizationSecret?: string; attributes: AttributeRequestModel[] }) => void;
    onRegister: (request: CertificateRegistrationRequestModel) => void;
};

type RenewFormValues = SuccessorFormValues & {
    // The certificate's own challenge, verified by Core on renew.
    authorizationSecret?: string;
};

export default function CertificateRenewDialog({ certificate, onCancel, onDone, allowWithoutFile, onRenew, onRegister }: Readonly<Props>) {
    const dispatch = useDispatch();

    const [fileContent, setFileContent] = useState<string | undefined>();
    const [uploadCsr, setUploadCsr] = useState(false);
    const [registerSuccessor, setRegisterSuccessor] = useState(false);
    const [parsedCertificate, setParsedCertificate] = useState<CertificateDetailResponseModel | undefined>();

    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const health = useSelector(utilsActuatorSelectors.health);
    const isRenewing = useSelector(certificateSelectors.isRenewing);
    const renewErrorMessage = useSelector(certificateSelectors.renewErrorMessage);

    const raProfileUuid = certificate.raProfile?.uuid;
    const authorityUuid = certificate.raProfile?.authorityInstanceUuid;
    const renew = useOperationAttributes('renew', raProfileUuid, authorityUuid);

    // Core verifies the certificate's challenge only while its registration is Active; with none, or a Closed one,
    // the renewal passes without it.
    const hasChallenge = certificate.registration?.state === CertificateRegistrationState.Active;

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

    // Start each session with a clean slate so a stale error from a previous attempt never lingers,
    // and clear it again on unmount.
    useEffect(() => {
        dispatch(certificateActions.clearRenewErrors());
        return () => {
            dispatch(certificateActions.clearRenewErrors());
        };
    }, [dispatch]);

    const methods = useForm<RenewFormValues>({ mode: 'onChange' });
    const { control, handleSubmit, setValue, clearErrors } = methods;
    const successor = useSuccessorRegistration(certificate, methods);
    const { isRegistering, registerErrorMessage } = successor;

    // Close once a submission is confirmed: a true→false in-flight transition with no error. A failure keeps the
    // dialog open so the holder can correct a mistyped challenge, each of which spends one attempt.
    const isSubmitting = isRenewing || isRegistering;
    const hasSubmissionError = !!renewErrorMessage || !!registerErrorMessage;
    const wasSubmitting = useRef(false);
    useEffect(() => {
        if (wasSubmitting.current && !isSubmitting && !hasSubmissionError) {
            onDone();
        }
        wasSubmitting.current = isSubmitting;
    }, [isSubmitting, hasSubmissionError, onDone]);

    const authorizationSecret = useWatch({ control, name: 'authorizationSecret' });

    const onRegisterSuccessorChange = (checked: boolean) => {
        // The two modes send different requests; values and errors of the one left behind must not carry over.
        setRegisterSuccessor(checked);
        if (checked) successor.loadSchema();
        setUploadCsr(false);
        setFileContent(undefined);
        dispatch(utilsCertificateRequestActions.reset());
        setValue('authorizationSecret', undefined);
        successor.clearValues();
        clearErrors();
        dispatch(certificateActions.clearRenewErrors());
    };

    const canRenew = (!hasChallenge || !!authorizationSecret?.trim()) && !renew.isFetching;
    const canSubmit = !isSubmitting && (registerSuccessor ? successor.canRegister : canRenew);

    const onSubmit = (values: RenewFormValues) => {
        if (!canSubmit) return;
        if (registerSuccessor) {
            onRegister(successor.buildRequest(values));
            return;
        }
        onRenew({
            // A CSR counts only while the upload section is shown.
            fileContent: !allowWithoutFile || uploadCsr ? fileContent : undefined,
            authorizationSecret: hasChallenge ? values.authorizationSecret : undefined,
            attributes: renew.collect(values as FieldValues),
        });
    };

    const submissionErrors = [renewErrorMessage, registerErrorMessage].filter((error): error is string => !!error);

    let submitLabel = registerSuccessor ? 'Register' : 'Renew';
    if (isSubmitting) submitLabel = registerSuccessor ? 'Registering…' : 'Renewing…';

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-4">
                    {submissionErrors.length > 0 && (
                        <div className="rounded-lg border border-danger bg-danger-surface p-4" data-testid="renewDialogError" role="alert">
                            <ul className="list-disc space-y-1 ps-5 text-sm text-danger">
                                {submissionErrors.map((error) => (
                                    <li key={error} className="whitespace-pre-line">
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Switch
                        id="registerSuccessor"
                        label="Register instead of renewing now"
                        checked={registerSuccessor}
                        onChange={onRegisterSuccessorChange}
                        disabled={isSubmitting}
                    />

                    {registerSuccessor ? (
                        <SuccessorRegistrationFields successor={successor} />
                    ) : (
                        <>
                            {hasChallenge && (
                                <Controller
                                    control={control}
                                    name="authorizationSecret"
                                    render={({ field: { value, onChange } }) => (
                                        <TextInput
                                            id="renewAuthorizationSecret"
                                            type="password"
                                            required
                                            label="Challenge"
                                            value={value ?? ''}
                                            onChange={onChange}
                                        />
                                    )}
                                />
                            )}

                            {allowWithoutFile ? (
                                <Switch id="uploadCsr" label="Upload new CSR ?" checked={uploadCsr} onChange={setUploadCsr} />
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

                                    {parsedCertificate && <CertificateAttributes csr={true} certificate={parsedCertificate} />}
                                </>
                            ) : null}

                            {renew.descriptors.length > 0 && (
                                <TabLayout
                                    noBorder
                                    tabs={[{ title: 'Renew Attributes', content: <OperationAttributesEditor attributes={renew} /> }]}
                                />
                            )}
                        </>
                    )}

                    <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                        {/* No way out while a request is in flight: its outcome, possibly a spent challenge attempt, is only
                            shown here. */}
                        <Button variant="outline" onClick={onCancel} type="button" disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button color="primary" type="submit" disabled={!canSubmit} data-testid="renewSubmit">
                            {submitLabel}
                        </Button>
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
