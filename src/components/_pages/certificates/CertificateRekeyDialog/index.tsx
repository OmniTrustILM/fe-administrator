import AttributeEditor from 'components/Attributes/AttributeEditor';

import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';

import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as keyActions, selectors as keySelectors } from 'ducks/cryptographic-keys';
import { actions as cryptographyOperationActions, selectors as cryptographyOperationSelectors } from 'ducks/cryptographic-operations';
import { actions as tokenProfileActions, selectors as tokenProfileSelectors } from 'ducks/token-profiles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type FieldValues, FormProvider, useForm, useWatch } from 'react-hook-form';

import { useDispatch, useSelector } from 'react-redux';

import Select from 'components/Select';
import Button from 'components/Button';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';
import type { CryptographicKeyPairResponseModel } from 'types/cryptographic-keys';
import { CertificateRegistrationState, CertificateRequestFormat, KeyType } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { buildValidationRules } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';

import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { ParseRequestRequestDtoParseTypeEnum } from 'types/openapi/utils';
import { transformParseRequestResponseDtoToCertificateResponseDetailModel } from '../../../../ducks/transform/utilsCertificateRequest';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';
import CertificateAttributes from '../../../CertificateAttributes';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import TabLayout from 'components/Layout/TabLayout';
import Switch from 'components/Switch';
import { isObjectSame } from 'utils/common-utils';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import OperationAttributesEditor from '../OperationAttributesEditor';
import { useOperationAttributes } from '../OperationAttributesEditor/useOperationAttributes';
import SuccessorRegistrationFields from '../SuccessorRegistration';
import { type SuccessorFormValues, useSuccessorRegistration } from '../SuccessorRegistration/useSuccessorRegistration';

interface FormValues extends SuccessorFormValues {
    pkcs10: File | null;
    // The certificate's registration challenge, verified by Core on rekey.
    authorizationSecret?: string;
    uploadCsr?: boolean;
    includeAltKey?: boolean;
    tokenProfile?: string;
    altTokenProfile?: string;
    key?: CryptographicKeyPairResponseModel;
    altKey?: CryptographicKeyPairResponseModel;
}

type props = {
    onCancel: () => void;
    // Called once Core confirms the rekey or registration; the page then redirects to the new certificate.
    onDone: () => void;
    onRegister: (request: CertificateRegistrationRequestModel) => void;
    certificate: CertificateDetailResponseModel;
};

export default function CertificateRekeyDialog({ onCancel, onDone, onRegister, certificate }: Readonly<props>) {
    const dispatch = useDispatch();

    const isFetchingSignatureAttributes = useSelector(cryptographyOperationSelectors.isFetchingSignatureAttributes);
    const signatureAttributeDescriptors = useSelector(cryptographyOperationSelectors.signatureAttributeDescriptors);
    const altSignatureAttributeDescriptors = useSelector(cryptographyOperationSelectors.altSignatureAttributeDescriptors);

    const tokenProfiles = useSelector(tokenProfileSelectors.tokenProfiles);

    const keys = useSelector(keySelectors.cryptographicKeyPairs);
    const altKeys = useSelector(keySelectors.altCryptographicKeyPairs);

    const rekeying = useSelector(certificateSelectors.isRekeying);
    // Rekey is a renew at the authority, so it takes the renew schema.
    const renew = useOperationAttributes('renew', certificate?.raProfile?.uuid, certificate?.raProfile?.authorityInstanceUuid);
    const rekeyErrorMessage = useSelector(certificateSelectors.rekeyErrorMessage);

    // Core verifies the challenge only while the registration is Active; with none, or a Closed one, the rekey
    // passes without it.
    const hasChallenge = certificate?.registration?.state === CertificateRegistrationState.Active;

    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);

    const [signatureAttributesCallbackAttributes, setSignatureAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [altSignatureAttributesCallbackAttributes, setAltSignatureAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>(
        [],
    );
    const [fileContent, setFileContent] = useState<string>('');
    const [certificateRequest, setCertificateRequest] = useState<CertificateDetailResponseModel | undefined>();
    const [registerSuccessor, setRegisterSuccessor] = useState(false);

    const health = useSelector(utilsActuatorSelectors.health);

    useEffect(() => {
        dispatch(utilsCertificateRequestActions.reset());
        dispatch(utilsActuatorActions.health());
    }, [dispatch]);

    // Start each session with a clean slate so a stale error from a previous attempt never lingers,
    // and clear it again on unmount.
    useEffect(() => {
        dispatch(certificateActions.clearRekeyErrors());
        return () => {
            dispatch(certificateActions.clearRekeyErrors());
        };
    }, [dispatch]);

    useEffect(() => {
        setCertificateRequest(
            parsedCertificateRequest
                ? transformParseRequestResponseDtoToCertificateResponseDetailModel(parsedCertificateRequest)
                : undefined,
        );
    }, [parsedCertificateRequest]);

    useEffect(() => {
        dispatch(tokenProfileActions.listTokenProfiles({ enabled: true }));
        if (certificate?.key?.tokenProfileUuid) {
            dispatch(keyActions.listCryptographicKeyPairs({ tokenProfileUuid: certificate.key.tokenProfileUuid }));
        }
        dispatch(connectorActions.clearCallbackData());
    }, [dispatch, certificate?.key?.tokenProfileUuid, certificate?.key]);

    const submitCallback = useCallback(
        (values: FormValues, allValues: FieldValues) => {
            if (!certificate) return;
            if (!certificate.raProfile) return;
            if (!values.uploadCsr && !values.tokenProfile) return;
            if (!values.uploadCsr && !values.key) return;
            if (!certificate.raProfile.authorityInstanceUuid) return;
            if (!values.uploadCsr && values.key?.uuid === certificate.key?.uuid && values.altKey?.uuid === certificate.altKey?.uuid) return;

            dispatch(
                certificateActions.rekeyCertificate({
                    uuid: certificate.uuid,
                    raProfileUuid: certificate.raProfile.uuid,
                    authorityUuid: certificate.raProfile.authorityInstanceUuid,
                    rekey: {
                        request: fileContent || undefined,
                        format: CertificateRequestFormat.Pkcs10,
                        authorizationSecret: hasChallenge ? values.authorizationSecret : undefined,
                        signatureAttributes: collectFormAttributes('signatureAttributes', signatureAttributeDescriptors, allValues),
                        attributes: renew.collect(allValues),
                        keyUuid: values.key?.uuid || '',
                        tokenProfileUuid: values.tokenProfile || '',
                        ...(values.includeAltKey
                            ? {
                                  altKeyUuid: values.altKey?.uuid,
                                  altTokenProfileUuid: values.altTokenProfile,
                                  altSignatureAttributes: collectFormAttributes(
                                      'altSignatureAttributes',
                                      altSignatureAttributeDescriptors,
                                      allValues,
                                  ),
                              }
                            : {}),
                    },
                }),
            );
        },
        [certificate, dispatch, fileContent, hasChallenge, signatureAttributeDescriptors, altSignatureAttributeDescriptors, renew],
    );

    const onTokenProfileChange = useCallback(
        (tokenProfileUuid: string | undefined, type: 'alt' | 'normal') => {
            if (!tokenProfileUuid) return;
            dispatch(keyActions.listCryptographicKeyPairs({ tokenProfileUuid, store: type }));
        },
        [dispatch],
    );

    const onKeyChange = useCallback(
        (key: CryptographicKeyPairResponseModel | undefined, type: 'alt' | 'normal') => {
            if (!key) return;
            if (!key.tokenProfileUuid) return;
            if (!key.tokenInstanceUuid) return;
            const privateKeyItem = key.items.find((item) => item.type === KeyType.Private);
            if (!privateKeyItem) return;
            dispatch(cryptographyOperationActions.clearSignatureAttributeDescriptors(type));
            dispatch(
                cryptographyOperationActions.listSignatureAttributeDescriptors({
                    uuid: key.uuid,
                    tokenProfileUuid: key.tokenProfileUuid,
                    tokenInstanceUuid: key.tokenInstanceUuid,
                    keyItemUuid: privateKeyItem.uuid,
                    operation: 'sign',
                    store: type,
                }),
            );
        },
        [dispatch],
    );

    const tokenProfileOptions = useMemo(
        () =>
            tokenProfiles.map((tokenProfile) => ({
                label: tokenProfile.name,
                value: tokenProfile.uuid,
            })),
        [tokenProfiles],
    );

    const keyOptions = useMemo(
        () =>
            keys.map((key) => ({
                label: key.name,
                value: key.uuid,
            })),
        [keys],
    );

    const altKeyOptions = useMemo(
        () =>
            altKeys.map((key) => ({
                label: key.name,
                value: key.uuid,
            })),
        [altKeys],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            pkcs10: null,
            includeAltKey: !!certificate?.altKey,
            key: certificate?.key || undefined,
            tokenProfile: certificate?.key?.tokenProfileUuid || undefined,
            altKey: certificate?.altKey || undefined,
            altTokenProfile: certificate?.altKey?.tokenProfileUuid || undefined,
        }),
        [certificate],
    );

    const methods = useForm<FormValues>({
        mode: 'onTouched',
        defaultValues,
    });

    const { control, handleSubmit, formState, reset } = methods;
    const successor = useSuccessorRegistration(certificate, methods);
    const { isRegistering, registerErrorMessage } = successor;

    // Close once a submission is confirmed: a true→false in-flight transition with no error. A failure keeps the
    // dialog open so the holder can correct a mistyped challenge, each of which spends one attempt.
    // The form's own isSubmitting stays out: a submit that fails validation dispatches nothing yet would close the dialog.
    const isRequestInFlight = rekeying || isRegistering;
    const isSubmitting = formState.isSubmitting || isRequestInFlight;
    const hasSubmissionError = !!rekeyErrorMessage || !!registerErrorMessage;
    const wasSubmitting = useRef(false);
    useEffect(() => {
        if (wasSubmitting.current && !isRequestInFlight && !hasSubmissionError) {
            onDone();
        }
        wasSubmitting.current = isRequestInFlight;
    }, [isRequestInFlight, hasSubmissionError, onDone]);

    const onRegisterSuccessorChange = (checked: boolean) => {
        // The two modes send different requests; values and errors of the one left behind must not carry over.
        setRegisterSuccessor(checked);
        if (checked) successor.loadSchema();
        reset(defaultValues);
        setFileContent('');
        dispatch(utilsCertificateRequestActions.reset());
        successor.clearValues();
        dispatch(certificateActions.clearRekeyErrors());
    };

    useEffect(() => {
        if (defaultValues.altTokenProfile) {
            onTokenProfileChange(defaultValues.altTokenProfile, 'alt');
        }
        if (defaultValues.tokenProfile) {
            onTokenProfileChange(defaultValues.tokenProfile, 'normal');
        }
    }, [defaultValues, onTokenProfileChange]);

    const inputOptions = useMemo(
        () => [
            { label: 'External', value: 'true' },
            { label: 'Existing Key', value: 'false' },
        ],
        [],
    );

    const keyUuidToKeyMap = useMemo(() => {
        const map = new Map<string, CryptographicKeyPairResponseModel>();
        keys.forEach((key) => map.set(key.uuid, key));
        altKeys.forEach((key) => map.set(key.uuid, key));
        return map;
    }, [keys, altKeys]);

    const watchedValues = useWatch({ control });
    const watchedUploadCsr = useWatch({ control, name: 'uploadCsr' });
    const watchedKey = useWatch({ control, name: 'key' });
    const watchedAltKey = useWatch({ control, name: 'altKey' });
    const watchedIncludeAltKey = useWatch({ control, name: 'includeAltKey' });
    const watchedAuthorizationSecret = useWatch({ control, name: 'authorizationSecret' });

    const isRekeyAllowed = useCallback(() => {
        if (watchedUploadCsr) {
            return !!fileContent;
        }
        const currentKey = watchedKey;
        const currentAltKey = watchedAltKey;
        const areValuesSame =
            !isObjectSame(currentKey as unknown as Record<string, unknown>, defaultValues.key as unknown as Record<string, unknown>) ||
            !isObjectSame(currentAltKey as unknown as Record<string, unknown>, defaultValues.altKey as unknown as Record<string, unknown>);

        return areValuesSame;
    }, [watchedUploadCsr, fileContent, watchedKey, watchedAltKey, defaultValues]);

    const renewAttributesTabs =
        renew.descriptors.length > 0 ? [{ title: 'Renew Attributes', content: <OperationAttributesEditor attributes={renew} /> }] : [];

    const getSignatureAttributesTabs = useCallback(() => {
        return watchedUploadCsr
            ? []
            : [
                  ...(watchedKey?.uuid === certificate?.key?.uuid
                      ? []
                      : [
                            {
                                title: 'Signature Attributes',
                                content: (
                                    <AttributeEditor
                                        id="signatureAttributes"
                                        attributeDescriptors={signatureAttributeDescriptors || []}
                                        groupAttributesCallbackAttributes={signatureAttributesCallbackAttributes}
                                        setGroupAttributesCallbackAttributes={setSignatureAttributesCallbackAttributes}
                                    />
                                ),
                            },
                        ]),
                  ...(watchedIncludeAltKey && watchedAltKey?.uuid !== certificate?.altKey?.uuid
                      ? [
                            {
                                title: 'Alternative Signature Attributes',
                                content: (
                                    <AttributeEditor
                                        id="altSignatureAttributes"
                                        attributeDescriptors={altSignatureAttributeDescriptors ?? []}
                                        groupAttributesCallbackAttributes={altSignatureAttributesCallbackAttributes}
                                        setGroupAttributesCallbackAttributes={setAltSignatureAttributesCallbackAttributes}
                                    />
                                ),
                            },
                        ]
                      : []),
              ];
    }, [
        watchedUploadCsr,
        watchedKey?.uuid,
        watchedAltKey?.uuid,
        watchedIncludeAltKey,
        certificate?.altKey?.uuid,
        certificate?.key?.uuid,
        signatureAttributeDescriptors,
        signatureAttributesCallbackAttributes,
        altSignatureAttributeDescriptors,
        altSignatureAttributesCallbackAttributes,
    ]);
    const attributeTabs = [...renewAttributesTabs, ...getSignatureAttributesTabs()];

    const onSubmit = (values: FormValues) => {
        if (registerSuccessor) {
            if (!isSubmitting && successor.canRegister) onRegister(successor.buildRequest(values));
            return;
        }
        submitCallback(values, watchedValues);
    };

    const submissionErrors = [rekeyErrorMessage, registerErrorMessage].filter((error): error is string => !!error);
    const canSubmit = registerSuccessor
        ? successor.canRegister
        : formState.isValid && isRekeyAllowed() && !renew.isFetching && (!hasChallenge || !!watchedAuthorizationSecret?.trim());

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    {submissionErrors.length > 0 && (
                        <div className="rounded-lg border border-danger bg-danger-surface p-4" data-testid="rekeyDialogError" role="alert">
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
                        label="Register instead of rekeying now"
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
                                    name="authorizationSecret"
                                    control={control}
                                    render={({ field: { value, onChange } }) => (
                                        <TextInput
                                            id="rekeyAuthorizationSecret"
                                            type="password"
                                            required
                                            label="Challenge"
                                            value={value ?? ''}
                                            onChange={onChange}
                                        />
                                    )}
                                />
                            )}

                            <Widget noBorder busy={rekeying || isFetchingSignatureAttributes || renew.isFetching}>
                                <Controller
                                    name="uploadCsr"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <div className="mb-4">
                                            <Select
                                                id="uploadCsr"
                                                options={inputOptions}
                                                value={
                                                    field.value
                                                        ? inputOptions.find((opt) => opt.value === String(field.value))?.value || ''
                                                        : ''
                                                }
                                                onChange={(value) => {
                                                    const boolValue = value === 'true';
                                                    field.onChange(boolValue);
                                                }}
                                                placeholder="Select Key Source"
                                                label="Key Source"
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-danger">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                />
                            </Widget>

                            <Widget title="Request Properties" noBorder titleSize="large">
                                {watchedUploadCsr && certificate?.raProfile ? (
                                    <>
                                        <FileUpload
                                            fileType={'CSR'}
                                            editable
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

                                        {certificateRequest && <CertificateAttributes csr={true} certificate={certificateRequest} />}
                                    </>
                                ) : (
                                    <></>
                                )}

                                <br />

                                {watchedUploadCsr !== undefined && !watchedUploadCsr ? (
                                    <>
                                        <Controller
                                            name="tokenProfile"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <div className="mb-4">
                                                    <Select
                                                        id="tokenProfile"
                                                        options={tokenProfileOptions}
                                                        value={field.value || ''}
                                                        onChange={(value) => {
                                                            const uuid = value as string | undefined;
                                                            field.onChange(uuid);
                                                            if (uuid) {
                                                                onTokenProfileChange(uuid, 'normal');
                                                            }
                                                        }}
                                                        placeholder="Select Token Profile"
                                                        label="Token Profile"
                                                    />
                                                    {fieldState.error && fieldState.isTouched && (
                                                        <p className="mt-1 text-sm text-danger">
                                                            {typeof fieldState.error === 'string'
                                                                ? fieldState.error
                                                                : fieldState.error?.message || 'Invalid value'}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        />

                                        <Controller
                                            name="key"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <div className="mb-4">
                                                    <Select
                                                        id="keySelect"
                                                        options={keyOptions}
                                                        value={field.value?.uuid || ''}
                                                        onChange={(value) => {
                                                            const uuid = value as string | undefined;
                                                            const key = uuid ? keyUuidToKeyMap.get(uuid) : undefined;
                                                            field.onChange(key);
                                                            if (key) {
                                                                onKeyChange(key, 'normal');
                                                            }
                                                        }}
                                                        placeholder="Select Key"
                                                        label="Select Key"
                                                    />
                                                    {fieldState.error && fieldState.isTouched && (
                                                        <p className="mt-1 text-sm text-danger">
                                                            {typeof fieldState.error === 'string'
                                                                ? fieldState.error
                                                                : fieldState.error?.message || 'Invalid value'}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        />

                                        {watchedKey && (
                                            <Controller
                                                name="includeAltKey"
                                                control={control}
                                                render={({ field }) => (
                                                    <div className="mb-4">
                                                        <Switch
                                                            id="includeAltKey"
                                                            label="Include Alternative Key"
                                                            checked={field.value || false}
                                                            onChange={field.onChange}
                                                            disabled={!!defaultValues.altKey || !!defaultValues.altTokenProfile}
                                                        />
                                                    </div>
                                                )}
                                            />
                                        )}

                                        {watchedIncludeAltKey && (
                                            <>
                                                <Controller
                                                    name="altTokenProfile"
                                                    control={control}
                                                    rules={buildValidationRules([validateRequired()])}
                                                    render={({ field, fieldState }) => (
                                                        <div className="mb-4">
                                                            <Select
                                                                id="altTokenProfileSelect"
                                                                options={tokenProfileOptions}
                                                                value={field.value || ''}
                                                                onChange={(value) => {
                                                                    const uuid = value as string | undefined;
                                                                    field.onChange(uuid);
                                                                    if (uuid) {
                                                                        onTokenProfileChange(uuid, 'alt');
                                                                    }
                                                                }}
                                                                placeholder="Select Alternative Token Profile"
                                                                label="Alternative Token Profile"
                                                            />
                                                            {fieldState.error && fieldState.isTouched && (
                                                                <p className="mt-1 text-sm text-danger">
                                                                    {typeof fieldState.error === 'string'
                                                                        ? fieldState.error
                                                                        : fieldState.error?.message || 'Invalid value'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                />

                                                <Controller
                                                    name="altKey"
                                                    control={control}
                                                    rules={buildValidationRules([validateRequired()])}
                                                    render={({ field, fieldState }) => (
                                                        <div className="mb-4">
                                                            <Select
                                                                id="altKeySelect"
                                                                options={
                                                                    watchedValues.tokenProfile === watchedValues.altTokenProfile &&
                                                                    altKeyOptions.length === 0
                                                                        ? keyOptions
                                                                        : altKeyOptions
                                                                }
                                                                value={field.value?.uuid || ''}
                                                                onChange={(value) => {
                                                                    const uuid = value as string | undefined;
                                                                    const key = uuid ? keyUuidToKeyMap.get(uuid) : undefined;
                                                                    field.onChange(key);
                                                                    if (key) {
                                                                        onKeyChange(key, 'alt');
                                                                    }
                                                                }}
                                                                label="Select Alternative Key"
                                                                placeholder="Select Alternative Key"
                                                            />
                                                            {fieldState.error && fieldState.isTouched && (
                                                                <p className="mt-1 text-sm text-danger">
                                                                    {typeof fieldState.error === 'string'
                                                                        ? fieldState.error
                                                                        : fieldState.error?.message || 'Invalid value'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <></>
                                )}

                                {attributeTabs.length ? <TabLayout noBorder tabs={attributeTabs} onlyActiveTabContent={false} /> : <></>}
                            </Widget>
                        </>
                    )}

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            title={registerSuccessor ? 'Register' : 'Rekey'}
                            inProgressTitle={registerSuccessor ? 'Registering...' : 'Rekeying...'}
                            inProgress={isSubmitting}
                            disabled={!canSubmit}
                        />
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
