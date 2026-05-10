import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/auth-settings';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import MultipleValueTextInput from 'components/Input/MultipleValueTextInput';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Label from 'components/Label';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { validateAlphaNumericWithSpecialChars, validateRequired, validateUrlWithRoute, validatePositiveInteger } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import type { OAuth2ProviderSettingsUpdateDto } from 'types/auth-settings';
import { isValidJWTBearerProvider, isValidOAuth2FlowProvider } from 'utils/oauth2Providers';

type OAuth2ProviderFormProps = {
    providerName?: string;
    onCancel: () => void;
    onSuccess?: () => void;
};

enum AuthenticationScheme {
    JwtBearer = 'JwtBearer',
    OAuth2Flow = 'OAuth2Flow',
}

const authenticationSchemeOptions: Record<AuthenticationScheme, OptionType> = {
    [AuthenticationScheme.JwtBearer]: {
        label: 'JWT Bearer',
        value: AuthenticationScheme.JwtBearer,
    },
    [AuthenticationScheme.OAuth2Flow]: {
        label: 'OAuth2 Flow',
        value: AuthenticationScheme.OAuth2Flow,
    },
};
interface OptionType {
    value: string;
    label: string;
}

interface FormValues {
    scheme: string;
    name: string;
    issuerUrl: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    jwkSetUrl: string;
    jwkSet: string;
    scope: string[];
    logoutUrl: string;
    postLogoutUrl: string;
    userInfoUrl: string;
    audiences: string[];
    skew: string;
    sessionMaxInactiveInterval: string;
}

export default function OAuth2ProviderForm({ providerName, onCancel, onSuccess }: Readonly<OAuth2ProviderFormProps>) {
    const editMode = providerName !== undefined;

    const dispatch = useDispatch();

    const oauth2Provider = useSelector(selectors.oauth2Provider);
    const isFetchingProvider = useSelector(selectors.isFetchingProvider);
    const isUpdatingProvider = useSelector(selectors.isUpdatingProvider);
    const isCreatingProvider = useSelector(selectors.isCreatingProvider);

    const isBusy = useMemo(
        () => isFetchingProvider || isUpdatingProvider || isCreatingProvider,
        [isFetchingProvider, isUpdatingProvider, isCreatingProvider],
    );

    useEffect(() => {
        if (!providerName) return;
        dispatch(actions.getOAuth2ProviderSettings({ providerName }));
    }, [dispatch, providerName]);

    const defaultValues: FormValues = useMemo(() => {
        if (editMode && oauth2Provider) {
            let scheme = '';
            if (isValidJWTBearerProvider(oauth2Provider)) {
                scheme = AuthenticationScheme.JwtBearer;
            }
            if (isValidOAuth2FlowProvider(oauth2Provider)) {
                scheme = AuthenticationScheme.OAuth2Flow;
            }
            return {
                scheme,
                name: oauth2Provider.name || '',
                issuerUrl: oauth2Provider.issuerUrl || '',
                clientId: oauth2Provider.clientId || '',
                clientSecret: '',
                authorizationUrl: oauth2Provider.authorizationUrl || '',
                tokenUrl: oauth2Provider.tokenUrl || '',
                jwkSetUrl: oauth2Provider.jwkSetUrl || '',
                jwkSet: oauth2Provider.jwkSet || '',
                scope: oauth2Provider.scope || [],
                logoutUrl: oauth2Provider.logoutUrl || '',
                postLogoutUrl: oauth2Provider.postLogoutUrl || '',
                userInfoUrl: oauth2Provider.userInfoUrl || '',
                audiences: oauth2Provider.audiences || [],
                skew: oauth2Provider.skew?.toString() || '',
                sessionMaxInactiveInterval: oauth2Provider.sessionMaxInactiveInterval?.toString() || '',
            };
        } else {
            return {
                scheme: '',
                name: '',
                issuerUrl: '',
                clientId: '',
                clientSecret: '',
                authorizationUrl: '',
                tokenUrl: '',
                jwkSetUrl: '',
                jwkSet: '',
                scope: [],
                logoutUrl: '',
                postLogoutUrl: '',
                userInfoUrl: '',
                audiences: [],
                skew: '',
                sessionMaxInactiveInterval: '',
            };
        }
    }, [editMode, oauth2Provider]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
    } = methods;

    const formValues = useWatch({ control });
    const watchedScheme = useWatch({
        control,
        name: 'scheme',
    });

    const watchedJwkSet = useWatch({
        control,
        name: 'jwkSet',
    });

    const watchedJwkSetUrl = useWatch({
        control,
        name: 'jwkSetUrl',
    });

    const onSubmit = useCallback(
        (values: FormValues) => {
            const updateModel: OAuth2ProviderSettingsUpdateDto = {
                issuerUrl: values.issuerUrl || undefined,
                clientId: values.clientId || undefined,
                authorizationUrl: values.authorizationUrl || undefined,
                tokenUrl: values.tokenUrl || undefined,
                jwkSetUrl: values.jwkSetUrl || undefined,
                jwkSet: values.jwkSet || undefined,
                scope: values.scope && values.scope.length > 0 ? values.scope : undefined,
                logoutUrl: values.logoutUrl || undefined,
                postLogoutUrl: values.postLogoutUrl || undefined,
                userInfoUrl: values.userInfoUrl || undefined,
                audiences: values.audiences && values.audiences.length > 0 ? values.audiences : undefined,
                skew: values.skew ? Number.parseInt(values.skew, 10) : undefined,
                sessionMaxInactiveInterval: values.sessionMaxInactiveInterval
                    ? Number.parseInt(values.sessionMaxInactiveInterval, 10)
                    : undefined,
            };

            Object.assign(updateModel, { clientSecret: values.clientSecret || undefined });

            if (editMode) {
                if (!providerName) return;
                dispatch(
                    actions.updateOAuth2Provider({
                        providerName,
                        oauth2ProviderSettingsUpdateModel: updateModel,
                    }),
                );
            } else {
                dispatch(
                    actions.createOAuth2Provider({
                        providerName: values.name ?? '',
                        oauth2ProviderSettingsUpdateModel: updateModel,
                    }),
                );
            }
        },
        [dispatch, providerName, editMode],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const schemeOptions: OptionType[] = [
        authenticationSchemeOptions[AuthenticationScheme.JwtBearer],
        authenticationSchemeOptions[AuthenticationScheme.OAuth2Flow],
    ];

    const isSubmitDisabled = useMemo(
        () =>
            isBusy ||
            isSubmitting ||
            !isValid ||
            (editMode ? areDefaultValuesSame(formValues as unknown as Record<string, unknown>) : !isDirty),
        [areDefaultValuesSame, editMode, formValues, isBusy, isDirty, isSubmitting, isValid],
    );

    const requiredFields = useMemo(() => {
        const fields: Partial<Record<keyof FormValues, boolean>> = {};
        if (watchedScheme === AuthenticationScheme.JwtBearer) {
            fields.issuerUrl = true;
        }
        if (watchedScheme === AuthenticationScheme.OAuth2Flow) {
            fields.clientId = true;
            fields.clientSecret = true;
            fields.authorizationUrl = true;
            fields.tokenUrl = true;
            fields.logoutUrl = true;
            fields.postLogoutUrl = true;
        }
        return fields;
    }, [watchedScheme]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="scheme" required>
                                Authentication Scheme
                            </Label>
                            <p className="text-sm text-gray-500 mb-2">Select authentication scheme supported by the provider.</p>
                            <Controller
                                name="scheme"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="scheme"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={schemeOptions}
                                            placeholder="Select Authentication Scheme"
                                            placement="bottom"
                                        />
                                        {fieldState.error && fieldState.isTouched && (
                                            <p className="mt-1 text-sm text-red-600">
                                                {typeof fieldState.error === 'string'
                                                    ? fieldState.error
                                                    : fieldState.error?.message || 'Invalid value'}
                                            </p>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {watchedScheme && (
                            <>
                                {!editMode && (
                                    <div>
                                        <Controller
                                            name="name"
                                            control={control}
                                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    {...field}
                                                    id="name"
                                                    type="text"
                                                    label="Provider Name"
                                                    required
                                                    disabled={editMode}
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The URL where the JSON Web Key Set (JWKS) containing the public keys used to verify JWT tokens can
                                        be retrieved.
                                    </p>
                                    <Controller
                                        name="jwkSetUrl"
                                        control={control}
                                        rules={buildValidationRules([
                                            (value) => {
                                                if (!watchedJwkSet && !value) {
                                                    return 'JWK Set URL is required if JWK Set is not provided';
                                                }
                                                return undefined;
                                            },
                                            validateUrlWithRoute,
                                        ])}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="jwkSetUrl"
                                                type="text"
                                                label="JWK Set Url"
                                                required={!watchedJwkSet}
                                                disabled={!!watchedJwkSet}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        Base64 encoded JWK Set, provided in case JWK Set URL is not available.
                                    </p>
                                    <Controller
                                        name="jwkSet"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                {...field}
                                                id="jwkSet"
                                                label="JWK Set"
                                                required={!watchedJwkSetUrl}
                                                rows={3}
                                                placeholder="Enter JWK Set encoded in Base64"
                                                disabled={!!watchedJwkSetUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The client ID used to identify the client application during the authorization process.
                                    </p>
                                    <Controller
                                        name="clientId"
                                        control={control}
                                        rules={requiredFields.clientId ? buildValidationRules([validateRequired()]) : {}}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="clientId"
                                                type="text"
                                                label="Client Id"
                                                required={!!requiredFields.clientId}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The client secret used by the client application to authenticate with the authorization server.
                                    </p>
                                    <Controller
                                        name="clientSecret"
                                        control={control}
                                        rules={requiredFields.clientSecret && !editMode ? buildValidationRules([validateRequired()]) : {}}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="clientSecret"
                                                type="password"
                                                label="Client Secret"
                                                required={!!requiredFields.clientSecret && !editMode}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="scope">Scope</Label>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The list of scopes that define the access levels and permissions requested by the client
                                        application.
                                    </p>
                                    <Controller
                                        name="scope"
                                        control={control}
                                        render={({ field }) => (
                                            <MultipleValueTextInput
                                                id="scope"
                                                selectedValues={field.value || []}
                                                onValuesChange={field.onChange}
                                                placeholder="Select or add scopes"
                                                addPlaceholder="Add scope"
                                                initialOptions={
                                                    oauth2Provider?.scope
                                                        ? oauth2Provider.scope.map((el) => ({ label: el, value: el }))
                                                        : []
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="audiences">Audiences</Label>
                                    <p className="text-sm text-gray-500 mb-2">
                                        A list of expected audiences for validating the issued tokens, used to match the intended recipients
                                        of the tokens.
                                    </p>
                                    <Controller
                                        name="audiences"
                                        control={control}
                                        render={({ field }) => (
                                            <MultipleValueTextInput
                                                id="audiences"
                                                selectedValues={field.value || []}
                                                onValuesChange={field.onChange}
                                                placeholder="Select or add audiences"
                                                addPlaceholder="Add audience"
                                                initialOptions={
                                                    oauth2Provider?.audiences
                                                        ? oauth2Provider.audiences.map((el) => ({ label: el, value: el }))
                                                        : []
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The URL used to exchange the authorization code or credentials for an access token.
                                    </p>
                                    <Controller
                                        name="tokenUrl"
                                        control={control}
                                        rules={requiredFields.tokenUrl ? buildValidationRules([validateRequired()]) : {}}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="tokenUrl"
                                                type="text"
                                                label="Token Url"
                                                required={!!requiredFields.tokenUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        The URL where the authorization server redirects the user for login and authorization.
                                    </p>
                                    <Controller
                                        name="authorizationUrl"
                                        control={control}
                                        rules={
                                            requiredFields.authorizationUrl
                                                ? buildValidationRules([validateRequired(), validateUrlWithRoute])
                                                : buildValidationRules([validateUrlWithRoute])
                                        }
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="authorizationUrl"
                                                type="text"
                                                label="Authorization Url"
                                                required={!!requiredFields.authorizationUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">URL to end session on provider side.</p>
                                    <Controller
                                        name="logoutUrl"
                                        control={control}
                                        rules={
                                            requiredFields.logoutUrl
                                                ? buildValidationRules([validateRequired(), validateUrlWithRoute])
                                                : buildValidationRules([validateUrlWithRoute])
                                        }
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="logoutUrl"
                                                type="text"
                                                label="Logout Url"
                                                required={!!requiredFields.logoutUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        URL that user will be redirected after logout from application.
                                    </p>
                                    <Controller
                                        name="postLogoutUrl"
                                        control={control}
                                        rules={
                                            requiredFields.postLogoutUrl
                                                ? buildValidationRules([validateRequired(), validateUrlWithRoute])
                                                : buildValidationRules([validateUrlWithRoute])
                                        }
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="postLogoutUrl"
                                                type="text"
                                                label="Post Logout Url"
                                                required={!!requiredFields.postLogoutUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">
                                        URL of issuer issuing authentication tokens. If provided, authentication via JWT token is enabled
                                        for this provider.
                                    </p>
                                    <Controller
                                        name="issuerUrl"
                                        control={control}
                                        rules={
                                            requiredFields.issuerUrl
                                                ? buildValidationRules([validateRequired(), validateUrlWithRoute])
                                                : buildValidationRules([validateUrlWithRoute])
                                        }
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="issuerUrl"
                                                type="text"
                                                label="Issuer Url"
                                                required={!!requiredFields.issuerUrl}
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">The URL containing information about user.</p>
                                    <Controller
                                        name="userInfoUrl"
                                        control={control}
                                        rules={buildValidationRules([validateUrlWithRoute])}
                                        render={({ field, fieldState }) => (
                                            <TextInput
                                                {...field}
                                                id="userInfoUrl"
                                                type="text"
                                                label="User Info Url"
                                                invalid={fieldState.error && fieldState.isTouched}
                                                error={getFieldErrorMessage(fieldState)}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Controller
                                            name="skew"
                                            control={control}
                                            rules={buildValidationRules([validatePositiveInteger()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    {...field}
                                                    id="skew"
                                                    type="number"
                                                    label="Skew Time"
                                                    placeholder="Enter Time in Seconds"
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                        <p className="text-sm text-gray-500 mt-2">
                                            The allowed time skew, in seconds, for token validation. This accounts for clock differences
                                            between systems. Default value is 30 seconds.
                                        </p>
                                    </div>

                                    <div>
                                        <Controller
                                            name="sessionMaxInactiveInterval"
                                            control={control}
                                            rules={buildValidationRules([validatePositiveInteger()])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    {...field}
                                                    id="sessionMaxInactiveInterval"
                                                    type="number"
                                                    label="Session Max Inactive Interval"
                                                    placeholder="Enter Time in Seconds"
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                        <p className="text-sm text-gray-500 mt-2">
                                            Duration in seconds after which will inactive user's session be terminated. Default value is 15
                                            minutes.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Save' : 'Create'}
                                inProgressTitle={editMode ? 'Saving...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={isSubmitDisabled}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
