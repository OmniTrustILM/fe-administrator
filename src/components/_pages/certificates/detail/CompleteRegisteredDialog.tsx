import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Container from 'components/Container';
import FileUpload from 'components/Input/FileUpload/FileUpload';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import RenderRequestKey from 'components/_pages/certificates/form/RenderRequestKey';
import RenderTokenProfile from 'components/_pages/certificates/form/RenderTokenProfile';
import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { selectors as cryptographyOperationSelectors } from 'ducks/cryptographic-operations';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRequestFormat } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';

type Props = Readonly<{
    certificate: CertificateDetailResponseModel;
    onCancel: () => void;
}>;

type KeySource = 'upload' | 'existing';

type CompleteRegisteredFormValues = {
    authorizationSecret: string;
    keySource: KeySource;
    tokenProfileUuid?: string;
    keyUuid?: string;
};

const keySourceOptions = [
    { label: 'Upload CSR', value: 'upload' },
    { label: 'Existing Key', value: 'existing' },
];

export default function CompleteRegisteredDialog({ certificate, onCancel }: Props) {
    const dispatch = useDispatch();
    const signatureAttributeDescriptors = useSelector(cryptographyOperationSelectors.signatureAttributeDescriptors);
    const csrAttributeDescriptors = useSelector(certificateSelectors.csrAttributeDescriptors);
    const isFetchingCsrAttributes = useSelector(certificateSelectors.isFetchingCsrAttributes);
    const isIssuing = useSelector(certificateSelectors.isIssuing);
    const issueErrorMessage = useSelector(certificateSelectors.issueErrorMessage);
    const issueValidationErrors = useSelector(certificateSelectors.issueValidationErrors);

    // The backend generates the CSR from csrAttributes on the existing-key path, so make sure the
    // identity (Request Attributes) descriptors are loaded for this certificate's RA profile.
    useEffect(() => {
        const raProfileUuid = certificate.raProfile?.uuid;
        if (raProfileUuid) {
            dispatch(certificateActions.getCsrAttributes({ raProfileUuid }));
        } else {
            dispatch(certificateActions.clearCsrAttributes());
        }
        // Clear on unmount.
        return () => {
            dispatch(certificateActions.clearCsrAttributes());
        };
    }, [dispatch, certificate.raProfile?.uuid]);

    // Start each session with a clean slate so a stale error from a previous attempt never lingers,
    // and clear it again on unmount.
    useEffect(() => {
        dispatch(certificateActions.clearIssueErrors());
        return () => {
            dispatch(certificateActions.clearIssueErrors());
        };
    }, [dispatch]);

    // Close explicitly once a submission succeeds rather than relying on the success redirect to unmount
    // us: when the issued certificate keeps the pre-registration's uuid the redirect is a same-URL no-op,
    // which would leave the dialog open and re-submittable. A true→false isIssuing transition with no error
    // is a confirmed success.
    const wasIssuing = useRef(false);
    useEffect(() => {
        if (wasIssuing.current && !isIssuing && !issueErrorMessage && (issueValidationErrors ?? []).length === 0) {
            onCancel();
        }
        wasIssuing.current = isIssuing;
    }, [isIssuing, issueErrorMessage, issueValidationErrors, onCancel]);

    // Write-only: the CSR content lives outside the RHF form since FileUpload reports content via a
    // plain callback (not a Controller) — matching the established pattern in the add-certificate form.
    const [csrContent, setCsrContent] = useState('');

    const methods = useForm<CompleteRegisteredFormValues>({
        mode: 'onChange',
        defaultValues: { keySource: 'upload' },
    });
    const { control, handleSubmit, setValue } = methods;

    const keySource = useWatch({ control, name: 'keySource' });
    const authorizationSecret = useWatch({ control, name: 'authorizationSecret' });
    const tokenProfileUuid = useWatch({ control, name: 'tokenProfileUuid' });
    const keyUuid = useWatch({ control, name: 'keyUuid' });

    const isUploadSource = keySource !== 'existing';

    const canSubmit = !!authorizationSecret && (isUploadSource ? !!csrContent : !!tokenProfileUuid && !!keyUuid);

    const onSubmit = useCallback(
        (values: CompleteRegisteredFormValues) => {
            // Guard against duplicate dispatches while a request is in flight — the disabled button only
            // blocks clicks, but Enter/programmatic submit can still fire.
            if (!canSubmit || isIssuing) return;
            // A registered cert always has an RA profile (the Complete action is gated on it), but guard
            // the required identifiers explicitly so we never fire a malformed request with empty UUIDs.
            const authorityUuid = certificate.raProfile?.authorityInstanceUuid;
            const raProfileUuid = certificate.raProfile?.uuid;
            if (!authorityUuid || !raProfileUuid) return;

            const combinedValues: Record<string, any> = { ...values };
            // On the existing-key path the backend generates and signs the CSR from the selected key plus
            // the identity in csrAttributes, so both must be sent; the upload path carries a complete CSR.
            const signatureAttrs = isUploadSource
                ? undefined
                : collectFormAttributes('signatureAttributes', signatureAttributeDescriptors, combinedValues);
            const csrAttrs = isUploadSource ? undefined : collectFormAttributes('csrAttributes', csrAttributeDescriptors, combinedValues);

            dispatch(
                certificateActions.completeRegisteredCertificate({
                    authorityUuid,
                    raProfileUuid,
                    certificateUuid: certificate.uuid,
                    request: isUploadSource ? csrContent : '',
                    format: isUploadSource ? CertificateRequestFormat.Pkcs10 : undefined,
                    authorizationSecret: values.authorizationSecret,
                    attributes: [],
                    tokenProfileUuid: isUploadSource ? undefined : values.tokenProfileUuid,
                    keyUuid: isUploadSource ? undefined : values.keyUuid,
                    signatureAttributes: signatureAttrs,
                    csrAttributes: csrAttrs,
                }),
            );
            // Do not close here: on success the epic redirects to the issued certificate (unmounting this
            // dialog); on failure the dialog stays open with the entered values so the user can correct and retry.
        },
        [canSubmit, certificate, csrAttributeDescriptors, csrContent, dispatch, isIssuing, isUploadSource, signatureAttributeDescriptors],
    );

    const submissionErrors = [...new Set([...(issueErrorMessage ? [issueErrorMessage] : []), ...(issueValidationErrors ?? [])])];

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-4">
                    {submissionErrors.length > 0 && (
                        <div
                            className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-800/10"
                            data-testid="completeRegisteredError"
                            role="alert"
                        >
                            <ul className="list-disc space-y-1 ps-5 text-sm text-red-700 dark:text-red-500">
                                {submissionErrors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Controller
                        control={control}
                        name="authorizationSecret"
                        rules={{ required: true }}
                        render={({ field: { value, onChange } }) => (
                            <TextInput
                                id="completeAuthorizationSecret"
                                dataTestId="completeAuthorizationSecret"
                                type="password"
                                required
                                label="Challenge"
                                value={value ?? ''}
                                onChange={onChange}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="keySource"
                        render={({ field: { value, onChange } }) => (
                            <Select
                                id="completeKeySource"
                                dataTestId="completeKeySource"
                                options={keySourceOptions}
                                value={value ?? 'upload'}
                                label="Key Source"
                                onChange={(selected) => {
                                    const source = (selected ?? 'upload') as KeySource;
                                    onChange(source);
                                    if (source === 'upload') {
                                        setValue('tokenProfileUuid', undefined);
                                        setValue('keyUuid', undefined);
                                    }
                                }}
                            />
                        )}
                    />

                    {isUploadSource ? (
                        <FileUpload id="completeCsrUpload" fileType="CSR" editable required onFileContentLoaded={setCsrContent} />
                    ) : (
                        <div className="space-y-4">
                            <RenderTokenProfile type="normal" name="tokenProfileUuid" />
                            <RenderRequestKey type="normal" name="keyUuid" tokenProfileField="tokenProfileUuid" />

                            {/* Identity the backend uses to build the CSR from the selected key. */}
                            {isFetchingCsrAttributes && (csrAttributeDescriptors ?? []).length === 0 ? (
                                <span className="text-gray-500 dark:text-neutral-400" data-testid="csrAttributes-loading">
                                    Loading request attributes&hellip;
                                </span>
                            ) : (
                                <AttributeEditor id="csrAttributes" attributeDescriptors={csrAttributeDescriptors ?? []} />
                            )}

                            {tokenProfileUuid ? (
                                <AttributeEditor id="signatureAttributes" attributeDescriptors={signatureAttributeDescriptors ?? []} />
                            ) : null}
                        </div>
                    )}

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" onClick={onCancel} type="button">
                            Cancel
                        </Button>
                        <Button color="primary" type="submit" disabled={!canSubmit || isIssuing} data-testid="completeRegisteredSubmit">
                            {isIssuing ? 'Completing…' : 'Complete'}
                        </Button>
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
