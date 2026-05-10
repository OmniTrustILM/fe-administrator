import AttributeEditor from 'components/Attributes/AttributeEditor';
import FileUpload from 'components/Input/FileUpload/FileUpload';
import Label from 'components/Label';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Select from 'components/Select';
import Button from 'components/Button';

import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { actions as secretsActions, selectors as secretsSelectors } from 'ducks/secrets';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';

import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import {
    type ApiKeySecretContent,
    type BasicAuthSecretContent,
    type GenericSecretContent,
    type JwtTokenSecretContent,
    type KeyStoreSecretContent,
    KeyStoreType,
    type KeyValueSecretContent,
    PlatformEnum,
    type PrivateKeySecretContent,
    Resource,
    type SecretDetailDto,
    type SecretKeySecretContent,
    SecretType,
} from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

interface SelectOption {
    value: string;
    label: string;
}

type SecretFormProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
    initialSecret?: SecretDetailDto;
}>;

interface FormValues {
    name: string;
    description: string;
    sourceVaultProfile?: string;
    type?: string;
    owner?: string;
    groups: SelectOption[];
    content?: string;
    username?: string;
    password?: string;
    keyStoreType?: KeyStoreType;
    keyStoreContent?: string;
    keyStorePassword?: string;
    keyValueContent?: string;
}

export default function SecretForm({ onCancel, onSuccess, initialSecret }: SecretFormProps) {
    const dispatch = useDispatch();

    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupSelectors.certificateGroups);
    const isCreating = useSelector(secretsSelectors.isCreating);
    const createSecretSucceeded = useSelector(secretsSelectors.createSecretSucceeded);
    const isUpdating = useSelector(secretsSelectors.isUpdating);
    const updateSecretSucceeded = useSelector(secretsSelectors.updateSecretSucceeded);
    const secret = useSelector(secretsSelectors.secret);
    const vaultProfiles = useSelector(vaultProfileSelectors.vaultProfiles);
    const secretCreationAttributeDescriptors = useSelector(secretsSelectors.secretCreationAttributeDescriptors);
    const isFetchingSecretCreationAttributes = useSelector(secretsSelectors.isFetchingSecretCreationAttributes);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const secretTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SecretType));

    useEffect(() => {
        dispatch(groupActions.listGroups());
        dispatch(userActions.list());
    }, [dispatch]);

    useEffect(() => {
        dispatch(vaultProfileActions.listVaultProfiles());
    }, [dispatch]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Secrets));
    }, [dispatch]);

    const optionsForUsers = useMemo(
        () =>
            users.map((user) => ({
                value: user.uuid,
                label: user.username,
            })),
        [users],
    );

    const optionsForGroups = useMemo(
        () =>
            groups.map((group) => ({
                value: group.uuid,
                label: group.name,
            })),
        [groups],
    );

    const optionsForVaultProfiles = useMemo(
        () =>
            vaultProfiles
                .filter((profile) => profile.enabled)
                .map((profile) => ({
                    value: profile.uuid,
                    label: profile.name,
                })),
        [vaultProfiles],
    );

    const optionsForTypes = useMemo(() => {
        const options: SelectOption[] = [];
        for (const key in SecretType) {
            const value = SecretType[key as keyof typeof SecretType];
            options.push({
                value,
                label: getEnumLabel(secretTypeEnum, value),
            });
        }
        return options;
    }, [secretTypeEnum]);

    const defaultValues: FormValues = useMemo(
        () =>
            initialSecret
                ? {
                      name: initialSecret.name,
                      description: initialSecret.description ?? '',
                      sourceVaultProfile: initialSecret.sourceVaultProfile?.uuid,
                      type: initialSecret.type,
                      owner: initialSecret.owner?.uuid,
                      groups:
                          initialSecret.groups?.map((g) => ({
                              value: g.uuid,
                              label: g.name,
                          })) ?? [],
                      content: '',
                      username: '',
                      password: '',
                      keyStoreType: undefined,
                      keyStoreContent: '',
                      keyStorePassword: '',
                      keyValueContent: '',
                  }
                : {
                      name: '',
                      description: '',
                      sourceVaultProfile: undefined,
                      type: undefined,
                      owner: undefined,
                      groups: [],
                      content: '',
                      username: '',
                      password: '',
                      keyStoreType: undefined,
                      keyStoreContent: '',
                      keyStorePassword: '',
                      keyValueContent: '',
                  },
        [initialSecret],
    );

    const optionsForKeyStoreType = useMemo(
        () => [
            { value: KeyStoreType.Pkcs12, label: 'PKCS12' },
            { value: KeyStoreType.Jks, label: 'JKS' },
        ],
        [],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        setValue,
        getValues,
        formState: { isDirty, isSubmitting, isValid },
    } = methods;

    const watchedType = useWatch({ control, name: 'type', defaultValue: defaultValues.type });
    const watchedSourceVaultProfile = useWatch({ control, name: 'sourceVaultProfile' });

    useEffect(() => {
        if (!watchedSourceVaultProfile || !watchedType) return;
        const profile = vaultProfiles.find((p) => p.uuid === watchedSourceVaultProfile);
        const vaultUuid = profile?.vaultInstance?.uuid;
        if (!vaultUuid) return;
        dispatch(
            secretsActions.listSecretAttributes({
                vaultUuid,
                vaultProfileUuid: watchedSourceVaultProfile,
                secretType: watchedType as SecretType,
            }),
        );
    }, [dispatch, vaultProfiles, watchedSourceVaultProfile, watchedType]);

    const buildSecretContent = useCallback((values: FormValues): import('types/openapi').SecretContent => {
        const type = values.type as SecretType;
        switch (type) {
            case SecretType.BasicAuth:
                return {
                    type: SecretType.BasicAuth,
                    username: values.username ?? '',
                    password: values.password ?? '',
                } as BasicAuthSecretContent;
            case SecretType.ApiKey:
                return { type: SecretType.ApiKey, content: values.content ?? '' } as ApiKeySecretContent;
            case SecretType.JwtToken:
                return { type: SecretType.JwtToken, content: values.content ?? '' } as JwtTokenSecretContent;
            case SecretType.SecretKey:
                return { type: SecretType.SecretKey, content: values.content ?? '' } as SecretKeySecretContent;
            case SecretType.PrivateKey:
                return { type: SecretType.PrivateKey, content: values.content ?? '' } as PrivateKeySecretContent;
            case SecretType.KeyStore:
                return {
                    type: SecretType.KeyStore,
                    keyStoreType: values.keyStoreType ?? KeyStoreType.Pkcs12,
                    content: values.keyStoreContent ?? '',
                    password: values.keyStorePassword ?? '',
                } as KeyStoreSecretContent;
            case SecretType.KeyValue: {
                let content: { [key: string]: unknown } = {};
                try {
                    content = values.keyValueContent ? JSON.parse(values.keyValueContent) : {};
                } catch {
                    content = {};
                }
                return { type: SecretType.KeyValue, content } as KeyValueSecretContent;
            }
            default:
                return { type: SecretType.Generic, content: values.content ?? '' } as GenericSecretContent;
        }
    }, []);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const sourceVaultProfileUuid = values.sourceVaultProfile;
            const effectiveType = (initialSecret?.type ?? values.type) as SecretType | undefined;
            if (!sourceVaultProfileUuid || !effectiveType) return;

            const selectedProfile = vaultProfiles.find((p) => p.uuid === sourceVaultProfileUuid);
            const vaultUuid = selectedProfile?.vaultInstance?.uuid;
            if (!vaultUuid) return;

            let includeSecret: boolean;

            switch (effectiveType) {
                case SecretType.BasicAuth:
                    includeSecret = Boolean(values.username || values.password);
                    break;
                case SecretType.ApiKey:
                case SecretType.JwtToken:
                case SecretType.SecretKey:
                case SecretType.PrivateKey:
                case SecretType.Generic:
                    includeSecret = Boolean(values.content);
                    break;
                case SecretType.KeyStore:
                    includeSecret = Boolean(values.keyStoreContent || values.keyStorePassword || values.keyStoreType);
                    break;
                case SecretType.KeyValue:
                    includeSecret = Boolean(values.keyValueContent);
                    break;
                default:
                    includeSecret = false;
            }

            const secretContent = buildSecretContent(values);
            const allValues = getValues();
            const attributes = collectFormAttributes('secret', secretCreationAttributeDescriptors, allValues);
            const customAttributes = collectFormAttributes('customSecret', resourceCustomAttributes, allValues);

            if (initialSecret) {
                // Edit mode
                dispatch(
                    secretsActions.updateSecret({
                        uuid: initialSecret.uuid,
                        update: {
                            description: values.description ?? '',
                            attributes,
                            customAttributes,
                            // For updates, secret content itself is optional; backend keeps existing content if it's not provided.
                            ...(includeSecret ? { secret: secretContent as any } : {}),
                        } as any,
                    }),
                );

                if (sourceVaultProfileUuid !== initialSecret.sourceVaultProfile?.uuid) {
                    dispatch(
                        secretsActions.updateSecretObjects({
                            uuid: initialSecret.uuid,
                            update: {
                                sourceVaultProfileUuid,
                                secretAttributes: attributes,
                            } as any,
                        }),
                    );
                }
            } else {
                // Create mode – secret content is required by API
                dispatch(
                    secretsActions.createSecret({
                        vaultUuid,
                        vaultProfileUuid: sourceVaultProfileUuid,
                        request: {
                            name: values.name,
                            description: values.description ?? '',
                            secret: secretContent,
                            attributes,
                            customAttributes,
                        },
                    }),
                );
            }
        },
        [
            buildSecretContent,
            dispatch,
            getValues,
            initialSecret,
            resourceCustomAttributes,
            secretCreationAttributeDescriptors,
            vaultProfiles,
        ],
    );

    const handleCreateSuccess = useCallback(() => {
        if (!initialSecret && secret) onSuccess?.();
    }, [initialSecret, secret, onSuccess]);

    const handleUpdateSuccess = useCallback(() => {
        if (initialSecret && secret) onSuccess?.();
    }, [initialSecret, secret, onSuccess]);

    useRunOnSuccessfulFinish(isCreating, createSecretSucceeded, handleCreateSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateSecretSucceeded, handleUpdateSuccess);

    const handleCancel = useCallback(() => {
        onCancel?.();
    }, [onCancel]);

    const submitTitle = useMemo(() => (initialSecret ? 'Update' : 'Create'), [initialSecret]);
    const inProgressTitle = useMemo(() => (initialSecret ? 'Updating...' : 'Creating...'), [initialSecret]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget busy={initialSecret ? isUpdating : isCreating} noBorder>
                    <div className="space-y-4">
                        {!initialSecret && (
                            <Controller
                                name="name"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        id="secret-name"
                                        label="Name"
                                        placeholder="Enter the secret name"
                                        value={field.value}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        error={getFieldErrorMessage(fieldState)}
                                        required
                                    />
                                )}
                            />
                        )}

                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextArea
                                    id="secret-description"
                                    label="Description"
                                    placeholder="Describe the secret"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />

                        <Controller
                            name="sourceVaultProfile"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <Select
                                    id="secret-vault-profile"
                                    label="Source Vault Profile"
                                    placeholder="Select profile"
                                    options={optionsForVaultProfiles}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    error={getFieldErrorMessage(fieldState)}
                                    required
                                />
                            )}
                        />

                        <Widget title="Content" noBorder>
                            <div className="space-y-4">
                                {initialSecret ? (
                                    <TextInput
                                        id="secret-type"
                                        label="Secret type"
                                        value={getEnumLabel(secretTypeEnum, initialSecret.type)}
                                        disabled
                                        onChange={() => {}}
                                    />
                                ) : (
                                    <Controller
                                        name="type"
                                        control={control}
                                        rules={buildValidationRules([validateRequired()])}
                                        render={({ field, fieldState }) => (
                                            <Select
                                                id="secret-type"
                                                label="Secret type"
                                                placeholder="Select"
                                                options={optionsForTypes}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                error={getFieldErrorMessage(fieldState)}
                                                required
                                            />
                                        )}
                                    />
                                )}
                                {watchedType === SecretType.BasicAuth && (
                                    <>
                                        <Controller
                                            name="username"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    id="secret-username"
                                                    label="Username"
                                                    placeholder="Username"
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="password"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    id="secret-password"
                                                    type="password"
                                                    label="Password"
                                                    placeholder="Password"
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                    </>
                                )}
                                {watchedType === SecretType.ApiKey && (
                                    <Controller
                                        name="content"
                                        control={control}
                                        rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                id="secret-apikey-content"
                                                type="password"
                                                label="API Key"
                                                placeholder="API key content"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                error={getFieldErrorMessage(fieldState)}
                                                required
                                            />
                                        )}
                                    />
                                )}
                                {watchedType === SecretType.JwtToken && (
                                    <Controller
                                        name="content"
                                        control={control}
                                        rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                id="secret-jwt-content"
                                                label="JWT Token"
                                                placeholder="JWT token (decoded or BASE64 encoded)"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                error={getFieldErrorMessage(fieldState)}
                                                required
                                            />
                                        )}
                                    />
                                )}
                                {watchedType === SecretType.SecretKey && (
                                    <>
                                        <Controller
                                            name="content"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <TextArea
                                                    id="secret-secretkey-content"
                                                    label="Secret Key"
                                                    placeholder="Paste BASE64 encoded content or use file upload below"
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                        <div>
                                            <Label
                                                htmlFor="secret-secretkey-file__fileUpload__file"
                                                className="mb-1 block text-sm font-medium"
                                            >
                                                Or upload file
                                            </Label>
                                            <FileUpload
                                                id="secret-secretkey-file"
                                                onFileContentLoaded={(base64) =>
                                                    setValue('content', base64, { shouldDirty: true, shouldValidate: true })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                                {watchedType === SecretType.PrivateKey && (
                                    <>
                                        <Controller
                                            name="content"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <TextArea
                                                    id="secret-privatekey-content"
                                                    label="Private Key"
                                                    placeholder="Paste PEM content or use file upload below"
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                        <div>
                                            <Label
                                                htmlFor="secret-privatekey-file__fileUpload__file"
                                                className="mb-1 block text-sm font-medium"
                                            >
                                                Or upload file
                                            </Label>
                                            <FileUpload
                                                id="secret-privatekey-file"
                                                onFileContentLoaded={(base64) =>
                                                    setValue('content', base64, { shouldDirty: true, shouldValidate: true })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                                {watchedType === SecretType.KeyStore && (
                                    <>
                                        <Controller
                                            name="keyStoreType"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <Select
                                                    id="secret-keystore-type"
                                                    label="Key Store type"
                                                    placeholder="Select"
                                                    options={optionsForKeyStoreType}
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                        <Controller
                                            name="keyStoreContent"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ fieldState }) => (
                                                <div>
                                                    <Label
                                                        htmlFor="secret-keystore-file__fileUpload__file"
                                                        className="mb-1 block text-sm font-medium"
                                                        required
                                                    >
                                                        Key Store
                                                    </Label>
                                                    <FileUpload
                                                        id="secret-keystore-file"
                                                        onFileContentLoaded={(base64) =>
                                                            setValue('keyStoreContent', base64, {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            })
                                                        }
                                                    />
                                                    {fieldState.error && (
                                                        <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>
                                                    )}
                                                </div>
                                            )}
                                        />
                                        <Controller
                                            name="keyStorePassword"
                                            control={control}
                                            rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    id="secret-keystore-password"
                                                    type="password"
                                                    label="Password"
                                                    placeholder="Key store password"
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    error={getFieldErrorMessage(fieldState)}
                                                    required
                                                />
                                            )}
                                        />
                                    </>
                                )}
                                {watchedType === SecretType.KeyValue && (
                                    <Controller
                                        name="keyValueContent"
                                        control={control}
                                        rules={
                                            initialSecret
                                                ? buildValidationRules([
                                                      (value) => {
                                                          if (!value) return undefined;
                                                          try {
                                                              JSON.parse(value as string);
                                                              return undefined;
                                                          } catch {
                                                              return 'Invalid JSON';
                                                          }
                                                      },
                                                  ])
                                                : buildValidationRules([
                                                      validateRequired(),
                                                      (value) => {
                                                          if (!value) return undefined;
                                                          try {
                                                              JSON.parse(value as string);
                                                              return undefined;
                                                          } catch {
                                                              return 'Invalid JSON';
                                                          }
                                                      },
                                                  ])
                                        }
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                id="secret-keyvalue-content"
                                                label="Secret"
                                                placeholder='{"key": "value"}'
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={() => {
                                                    field.onBlur();
                                                    const raw = field.value;
                                                    if (!raw) return;
                                                    try {
                                                        const parsed = JSON.parse(raw);
                                                        const pretty = JSON.stringify(parsed, null, 2);
                                                        if (pretty !== raw) {
                                                            setValue('keyValueContent', pretty, { shouldDirty: true });
                                                        }
                                                    } catch {}
                                                }}
                                                error={getFieldErrorMessage(fieldState)}
                                                className="font-mono text-sm"
                                                required={!initialSecret}
                                            />
                                        )}
                                    />
                                )}
                                {watchedType === SecretType.Generic && (
                                    <Controller
                                        name="content"
                                        control={control}
                                        rules={initialSecret ? undefined : buildValidationRules([validateRequired()])}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                id="secret-generic-content"
                                                type="password"
                                                label="Secret"
                                                placeholder="Secret content"
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                error={getFieldErrorMessage(fieldState)}
                                                required={!initialSecret}
                                            />
                                        )}
                                    />
                                )}
                            </div>
                        </Widget>

                        {!initialSecret && (
                            <Widget title="Ownership" noBorder>
                                <div className="space-y-4">
                                    <Controller
                                        name="owner"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                id="secret-owner"
                                                label="Owner"
                                                placeholder="Select user"
                                                options={optionsForUsers}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="groups"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                id="secret-groups"
                                                label="Groups"
                                                placeholder="Select group"
                                                options={optionsForGroups}
                                                value={field.value}
                                                onChange={field.onChange}
                                                isMulti
                                            />
                                        )}
                                    />
                                </div>
                            </Widget>
                        )}

                        <Widget title="Attributes" noBorder>
                            <TabLayout
                                noBorder
                                onlyActiveTabContent={false}
                                tabs={[
                                    {
                                        title: 'Attributes',
                                        content: isFetchingSecretCreationAttributes ? (
                                            <div className="text-sm text-gray-500">Loading attributes...</div>
                                        ) : (
                                            <AttributeEditor
                                                id="secret"
                                                attributeDescriptors={secretCreationAttributeDescriptors}
                                                attributes={initialSecret?.attributes}
                                            />
                                        ),
                                    },
                                    {
                                        title: 'Custom Attributes',
                                        content: (
                                            <AttributeEditor
                                                id="customSecret"
                                                attributeDescriptors={resourceCustomAttributes}
                                                attributes={initialSecret?.customAttributes}
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </Widget>

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                inProgress={isSubmitting || isCreating}
                                disabled={!isDirty || !isValid || isSubmitting || isCreating}
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                type="submit"
                                color="primary"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
