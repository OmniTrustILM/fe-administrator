import AttributeEditor from 'components/Attributes/AttributeEditor';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import Button from 'components/Button';
import Container from 'components/Container';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import TabLayout from 'components/Layout/TabLayout';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type FieldValues, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import { CertificateRegistrationState, Resource } from 'types/openapi';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { validateRegistrationChallenge } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';
import { createWidgetDetailHeaders } from 'utils/widget';
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
import { replaySourceIdentity, toRequestAttributes } from './successorIdentity';

type Props = {
    certificate: CertificateDetailResponseModel;
    onCancel: () => void;
    // Called once Core confirms the renewal or registration; the page then redirects to the new certificate.
    onDone: () => void;
    allowWithoutFile: boolean;
    onRenew: (data: { fileContent?: string; authorizationSecret?: string; attributes: AttributeRequestModel[] }) => void;
    onRegister: (request: CertificateRegistrationRequestModel) => void;
};

type RenewFormValues = {
    // The certificate's own challenge, verified by Core on renew.
    authorizationSecret?: string;
    // A new, independent challenge for the staged successor; nothing is inherited from this certificate.
    successorAuthorizationSecret?: string;
    successorExpiresAt?: string;
};

const detailHeaders = createWidgetDetailHeaders();

export default function CertificateRenewDialog({ certificate, onCancel, onDone, allowWithoutFile, onRenew, onRegister }: Readonly<Props>) {
    const dispatch = useDispatch();

    const [fileContent, setFileContent] = useState<string | undefined>();
    const [uploadCsr, setUploadCsr] = useState(false);
    const [registerSuccessor, setRegisterSuccessor] = useState(false);
    const [parsedCertificate, setParsedCertificate] = useState<CertificateDetailResponseModel | undefined>();
    const [registerCallbackAttributes, setRegisterCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const health = useSelector(utilsActuatorSelectors.health);
    const isRenewing = useSelector(certificateSelectors.isRenewing);
    const renewErrorMessage = useSelector(certificateSelectors.renewErrorMessage);
    const isRegistering = useSelector(certificateSelectors.isRegistering);
    const registerErrorMessage = useSelector(certificateSelectors.registerErrorMessage);
    const registerAttributeDescriptors = useSelector(certificateSelectors.registerAttributes);
    const isFetchingRegisterAttributes = useSelector(certificateSelectors.isFetchingRegisterAttributes);

    const raProfileUuid = certificate.raProfile?.uuid;
    const authorityUuid = certificate.raProfile?.authorityInstanceUuid;
    const renew = useOperationAttributes('renew', raProfileUuid, authorityUuid);
    const registerDescriptors = (raProfileUuid && registerAttributeDescriptors[raProfileUuid]) || [];

    // Core verifies the certificate's challenge only while its registration is Active; with none, or a Closed one,
    // the renewal passes without it.
    const hasChallenge = certificate.registration?.state === CertificateRegistrationState.Active;
    const identity = useMemo(() => replaySourceIdentity(certificate), [certificate]);

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
        dispatch(certificateActions.clearRegisterErrors());
        return () => {
            dispatch(certificateActions.clearRenewErrors());
            dispatch(certificateActions.clearRegisterErrors());
        };
    }, [dispatch]);

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

    const methods = useForm<RenewFormValues>({ mode: 'onChange' });
    const { control, handleSubmit, setValue, clearErrors } = methods;

    const authorizationSecret = useWatch({ control, name: 'authorizationSecret' });
    const successorAuthorizationSecret = useWatch({ control, name: 'successorAuthorizationSecret' });
    const successorExpiresAt = useWatch({ control, name: 'successorExpiresAt' });

    // Core treats a blank secret as none (String.isBlank).
    const hasSuccessorChallenge = !!successorAuthorizationSecret?.trim();

    useEffect(() => {
        if (registerSuccessor && raProfileUuid && authorityUuid) {
            dispatch(certificateActions.getRegisterAttributes({ raProfileUuid, authorityUuid }));
        }
    }, [dispatch, registerSuccessor, raProfileUuid, authorityUuid]);

    useEffect(() => {
        // An issuance window without a challenge is rejected by Core, so a date entered and then abandoned must not
        // survive clearing the challenge.
        if (!hasSuccessorChallenge) {
            setValue('successorExpiresAt', undefined);
            clearErrors('successorExpiresAt');
        }
    }, [hasSuccessorChallenge, setValue, clearErrors]);

    const onRegisterSuccessorChange = (checked: boolean) => {
        // The two modes send different requests; values and errors of the one left behind must not carry over.
        setRegisterSuccessor(checked);
        setUploadCsr(false);
        setFileContent(undefined);
        dispatch(utilsCertificateRequestActions.reset());
        setValue('authorizationSecret', undefined);
        setValue('successorAuthorizationSecret', undefined);
        setValue('successorExpiresAt', undefined);
        clearErrors();
        dispatch(certificateActions.clearRenewErrors());
        dispatch(certificateActions.clearRegisterErrors());
    };

    const identityPresent = Object.keys(identity.request).length > 0;
    const successorChallengeValid = !validateRegistrationChallenge()(successorAuthorizationSecret);
    const successorWindowValid = !successorExpiresAt || new Date(successorExpiresAt) > new Date();
    const canRegister =
        identityPresent &&
        successorChallengeValid &&
        successorWindowValid &&
        // A blank challenge on a successor of a challenge-protected certificate would silently drop that protection
        // for the new branch.
        (!hasChallenge || hasSuccessorChallenge) &&
        !isFetchingRegisterAttributes;
    const canRenew = (!hasChallenge || !!authorizationSecret?.trim()) && !renew.isFetching;
    const canSubmit = !isSubmitting && (registerSuccessor ? canRegister : canRenew);

    const onSubmit = (values: RenewFormValues) => {
        if (!canSubmit) return;
        if (registerSuccessor) {
            onRegister({
                ...identity.request,
                sourceCertificateUuid: certificate.uuid,
                authorizationSecret: hasSuccessorChallenge ? values.successorAuthorizationSecret : undefined,
                expiresAt:
                    hasSuccessorChallenge && values.successorExpiresAt ? new Date(values.successorExpiresAt).toISOString() : undefined,
                attributes: collectFormAttributes('register_attributes', [...registerDescriptors, ...registerCallbackAttributes], values),
                // Carried over as Core's own renew does, so a required certificate custom attribute is satisfied.
                customAttributes: toRequestAttributes(certificate.customAttributes),
            });
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

    const flatIdentityRows: TableDataRow[] =
        identity.kind === 'flat'
            ? [
                  { id: 'subjectDn', columns: ['Subject DN', identity.subjectDn ?? ''] },
                  { id: 'subjectAltName', columns: ['Subject Alternative Names', identity.subjectAltName ?? ''] },
              ]
            : [];

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
                        <>
                            <Widget title="Identity" titleSize="large" noBorder>
                                <div data-testid="successorIdentity">
                                    {identity.kind === 'csrAttributes' ? (
                                        <AttributeViewer attributes={identity.attributes} />
                                    ) : (
                                        <CustomTable headers={detailHeaders} data={flatIdentityRows} />
                                    )}
                                </div>
                                {identity.kind === 'flat' && identity.omittedSanTypes.length > 0 && (
                                    <p className="mt-2 text-sm text-content-subtle">
                                        Not carried over (no textual form): {identity.omittedSanTypes.join(', ')}
                                    </p>
                                )}
                                {!identityPresent && (
                                    <p className="mt-2 text-sm text-danger">This certificate has no subject or SAN to register.</p>
                                )}
                            </Widget>

                            <Controller
                                control={control}
                                name="successorAuthorizationSecret"
                                rules={buildValidationRules([validateRegistrationChallenge()])}
                                render={({ field: { value, onChange, onBlur }, fieldState }) => (
                                    <TextInput
                                        id="successorAuthorizationSecret"
                                        type="password"
                                        required={hasChallenge}
                                        label={hasChallenge ? 'Challenge' : 'Challenge (optional)'}
                                        labelTooltip={
                                            hasChallenge
                                                ? 'This certificate is challenge-protected, so its successor needs its own challenge'
                                                : 'Leave empty to register without a challenge — completion will not require a secret'
                                        }
                                        value={value ?? ''}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                        invalid={!!fieldState.error}
                                        error={fieldState.error?.message}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="successorExpiresAt"
                                disabled={!hasSuccessorChallenge}
                                rules={{
                                    validate: (value) => !value || new Date(value) > new Date() || 'Issuance window must be a future date',
                                }}
                                render={({ field: { value, onChange }, fieldState }) => (
                                    <TextInput
                                        id="successorExpiresAt"
                                        type="date"
                                        label="Issuance window (optional)"
                                        labelTooltip={hasSuccessorChallenge ? undefined : 'Requires a challenge'}
                                        disabled={!hasSuccessorChallenge}
                                        value={value ?? ''}
                                        onChange={onChange}
                                        invalid={!!fieldState.error}
                                        error={fieldState.error?.message}
                                    />
                                )}
                            />

                            <Widget title="Connector Attributes" titleSize="large" noBorder busy={isFetchingRegisterAttributes}>
                                {registerDescriptors.length > 0 ? (
                                    <AttributeEditor
                                        id="register_attributes"
                                        attributeDescriptors={registerDescriptors}
                                        callbackParentUuid={raProfileUuid}
                                        callbackResource={Resource.Certificates}
                                        groupAttributesCallbackAttributes={registerCallbackAttributes}
                                        setGroupAttributesCallbackAttributes={setRegisterCallbackAttributes}
                                    />
                                ) : (
                                    <span className="text-content-subtle">This RA Profile has no connector attributes.</span>
                                )}
                            </Widget>
                        </>
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
