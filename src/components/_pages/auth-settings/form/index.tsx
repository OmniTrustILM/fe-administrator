import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/auth-settings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import Callout from 'components/Callout';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import Label from 'components/Label';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { AuthenticationScheme, authenticationSchemeLabels, schemesOfProvider, withRequiredSchemes } from 'utils/oauth2Providers';
import { type FormValues, incompleteSchemes, removedSchemes, storedSchemes, toFormValues, toUpdateModel } from './form-model';
import ApplicationsSection from './ApplicationsSection';
import GeneralSection from './GeneralSection';
import JwtBearerSection from './JwtBearerSection';
import OAuth2FlowSection from './OAuth2FlowSection';

type OAuth2ProviderFormProps = {
    providerName?: string;
    onCancel: () => void;
    onSuccess?: () => void;
};

const schemeOptions = Object.values(AuthenticationScheme).map((scheme) => ({ value: scheme, label: authenticationSchemeLabels[scheme] }));

function validateSchemes(schemes: AuthenticationScheme[]) {
    return schemes.includes(AuthenticationScheme.JwtBearer) || schemes.includes(AuthenticationScheme.OAuth2Flow)
        ? undefined
        : 'Choose JWT Bearer or OAuth2 Flow';
}

export default function OAuth2ProviderForm({ providerName, onCancel, onSuccess }: Readonly<OAuth2ProviderFormProps>) {
    const editMode = providerName !== undefined;

    const dispatch = useDispatch();

    const oauth2Provider = useSelector(selectors.oauth2Provider);
    const oauth2ProviderETag = useSelector(selectors.oauth2ProviderETag);
    const updateProviderConflict = useSelector(selectors.updateProviderConflict);
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

    const defaultValues = useMemo(() => toFormValues(editMode ? oauth2Provider : undefined), [editMode, oauth2Provider]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        reset,
        formState: { isSubmitting, isValid, isDirty },
    } = methods;

    // The values the form shows were read together with this tag; a save sends it so Core refuses it when the provider changed since.
    const [loadedETag, setLoadedETag] = useState(oauth2ProviderETag);
    const [providerBeforeReload, setProviderBeforeReload] = useState<typeof oauth2Provider>();

    const reloadProvider = useCallback(() => {
        if (!providerName) return;
        setProviderBeforeReload(oauth2Provider);
        dispatch(actions.getOAuth2ProviderSettings({ providerName }));
    }, [dispatch, oauth2Provider, providerName]);

    useEffect(() => {
        if (!providerBeforeReload || isFetchingProvider || oauth2Provider === providerBeforeReload) return;
        reset(defaultValues);
        setLoadedETag(oauth2ProviderETag);
        setProviderBeforeReload(undefined);
    }, [defaultValues, isFetchingProvider, oauth2Provider, oauth2ProviderETag, providerBeforeReload, reset]);

    const formValues = useWatch({ control });
    const watchedSchemes = useWatch({ control, name: 'schemes' });

    const removedSchemeLabels = useMemo(
        () =>
            editMode && oauth2Provider
                ? removedSchemes(storedSchemes(oauth2Provider), watchedSchemes).map((scheme) => authenticationSchemeLabels[scheme])
                : [],
        [editMode, oauth2Provider, watchedSchemes],
    );

    const storedProviderSchemes = oauth2Provider ? schemesOfProvider(oauth2Provider) : [];
    const incompleteSchemeLabels = editMode
        ? incompleteSchemes(watchedSchemes, formValues, storedProviderSchemes).map((scheme) => authenticationSchemeLabels[scheme])
        : [];

    const onSubmit = useCallback(
        (values: FormValues) => {
            const updateModel = toUpdateModel(values);

            if (editMode) {
                if (!providerName) return;
                dispatch(
                    actions.updateOAuth2Provider({
                        providerName,
                        oauth2ProviderSettingsUpdateModel: updateModel,
                        ifMatch: loadedETag,
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
        [dispatch, providerName, editMode, loadedETag],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const isSubmitDisabled = useMemo(
        () =>
            isBusy ||
            isSubmitting ||
            !isValid ||
            (editMode ? areDefaultValuesSame(formValues as unknown as Record<string, unknown>) : !isDirty),
        [areDefaultValuesSame, editMode, formValues, isBusy, isDirty, isSubmitting, isValid],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="schemes" required>
                                Authentication schemes
                            </Label>
                            <p className="text-sm text-content-subtle mb-2">
                                Choose what this provider is used for. Application also needs JWT Bearer, because applications send their
                                tokens to the API as bearer tokens.
                            </p>
                            <Controller
                                name="schemes"
                                control={control}
                                rules={{ validate: validateSchemes, deps: ['applicationsClientId'] }}
                                render={({ field, fieldState }) => (
                                    <Select
                                        id="schemes"
                                        isMulti
                                        value={field.value.map((scheme) => ({ value: scheme, label: authenticationSchemeLabels[scheme] }))}
                                        onChange={(values) =>
                                            field.onChange(
                                                withRequiredSchemes((values ?? []).map((option) => option.value as AuthenticationScheme)),
                                            )
                                        }
                                        onBlur={field.onBlur}
                                        options={schemeOptions}
                                        placeholder="Select authentication schemes"
                                        placement="bottom"
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                            {removedSchemeLabels.length > 0 && (
                                <Callout severity="warning" role="status" className="mt-2" dataTestId="scheme-removal-warning">
                                    Saving removes the {removedSchemeLabels.join(', ')} settings from this provider.
                                </Callout>
                            )}
                            {incompleteSchemeLabels.length > 0 && (
                                <Callout severity="warning" role="status" className="mt-2" dataTestId="incomplete-schemes-warning">
                                    Complete the {incompleteSchemeLabels.join(', ')} settings, or remove the scheme to drop them.
                                </Callout>
                            )}
                        </div>

                        {watchedSchemes.length > 0 && (
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
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                    </div>
                                )}

                                <GeneralSection editMode={editMode} storedProvider={oauth2Provider} />
                                {watchedSchemes.includes(AuthenticationScheme.JwtBearer) && (
                                    <JwtBearerSection storedProvider={oauth2Provider} />
                                )}
                                {watchedSchemes.includes(AuthenticationScheme.OAuth2Flow) && (
                                    <OAuth2FlowSection editMode={editMode} storedProvider={oauth2Provider} />
                                )}
                                {watchedSchemes.includes(AuthenticationScheme.Application) && (
                                    <ApplicationsSection providerName={providerName} storedProvider={oauth2Provider} />
                                )}
                            </>
                        )}

                        {editMode && updateProviderConflict && (
                            <Callout severity="danger" role="alert" dataTestId="provider-changed-conflict">
                                <p>
                                    Someone else changed this provider since you opened it, so your changes were not saved. Reload to see
                                    the current settings; your unsaved changes will be discarded.
                                </p>
                                <Button variant="outline" type="button" className="mt-2" onClick={reloadProvider} disabled={isBusy}>
                                    Reload
                                </Button>
                            </Callout>
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
