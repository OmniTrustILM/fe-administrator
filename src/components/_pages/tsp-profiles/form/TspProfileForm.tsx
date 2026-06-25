import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { selectors as enumSelectors, getEnumDescription, getEnumLabel } from 'ducks/enums';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { actions as tspActions, selectors as tspSelectors } from 'ducks/tsp-profiles';
import { actions as vaultProfileActions, selectors as vaultProfileSelectors } from 'ducks/vault-profiles';

import { PlatformEnum, Resource, TspAuthenticationMethod } from 'types/openapi';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

interface FormValues {
    name: string;
    description: string;
    defaultSigningProfile: string;
    allowedAuthenticationMethods: { value: string; label: string }[];
    vaultProfile: string;
}

const hasBasicPassword = (methods: FormValues['allowedAuthenticationMethods'] | undefined) =>
    (methods ?? []).some((method) => method.value === TspAuthenticationMethod.BasicPassword);

export const TspProfileForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const tspProfile = useSelector(tspSelectors.tspProfile);
    const isFetchingDetail = useSelector(tspSelectors.isFetchingDetail);
    const isCreating = useSelector(tspSelectors.isCreating);
    const isUpdating = useSelector(tspSelectors.isUpdating);

    const signingProfiles = useSelector(signingProfileSelectors.signingProfiles);
    const isFetchingSigningProfiles = useSelector(signingProfileSelectors.isFetchingList);

    const vaultProfiles = useSelector(vaultProfileSelectors.vaultProfiles);
    const isFetchingVaultProfiles = useSelector(vaultProfileSelectors.isFetchingList);
    const authenticationMethodEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TspAuthenticationMethod));

    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.TspProfiles]),
    );

    const isBusy = useMemo(
        () =>
            isFetchingDetail ||
            isCreating ||
            isUpdating ||
            isFetchingSigningProfiles ||
            isFetchingVaultProfiles ||
            isFetchingResourceCustomAttributes,
        [isFetchingDetail, isCreating, isUpdating, isFetchingSigningProfiles, isFetchingVaultProfiles, isFetchingResourceCustomAttributes],
    );

    useEffect(() => {
        // Large page size: the default epic search caps at 10 items, far too few for a select.
        dispatch(signingProfileActions.listSigningProfiles({ pageNumber: 1, itemsPerPage: 1000, filters: [] }));
        dispatch(vaultProfileActions.listVaultProfiles({ pageNumber: 1, itemsPerPage: 1000, filters: [] }));
        dispatch(customAttributesActions.loadMultipleResourceCustomAttributes([{ resource: Resource.TspProfiles, customAttributes: [] }]));
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) {
            dispatch(tspActions.getTspProfile({ uuid: id }));
        }
    }, [dispatch, editMode, id]);

    const optionsForSigningProfiles = useMemo(
        () =>
            signingProfiles.map((sp) => ({
                value: sp.uuid,
                label: sp.name,
            })),
        [signingProfiles],
    );

    const authenticationMethodOptions = useMemo(
        () =>
            Object.values(TspAuthenticationMethod).map((method) => ({
                value: method,
                label: getEnumLabel(authenticationMethodEnum, method),
                description: getEnumDescription(authenticationMethodEnum, method),
            })),
        [authenticationMethodEnum],
    );

    const vaultProfileOptions = useMemo(
        () =>
            vaultProfiles.map((vp) => ({
                value: vp.uuid,
                label: vp.name,
            })),
        [vaultProfiles],
    );

    const initialCustomAttributes = useMemo(
        () =>
            mapProfileAttribute(
                tspProfile,
                multipleResourceCustomAttributes,
                Resource.TspProfiles,
                'customAttributes',
                '__attributes__customTspProfile__',
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const defaultValues = useMemo<FormValues>(
        () => ({
            name: '',
            description: '',
            defaultSigningProfile: '',
            allowedAuthenticationMethods: [],
            vaultProfile: '',
            ...transformAttributes(initialCustomAttributes ?? []),
        }),
        [initialCustomAttributes],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
        reset,
        trigger,
    } = methods;

    const selectedAuthenticationMethods = useWatch({ control, name: 'allowedAuthenticationMethods' });
    const basicPasswordSelected = useMemo(() => hasBasicPassword(selectedAuthenticationMethods), [selectedAuthenticationMethods]);

    // The vault-profile requirement depends on another field, so re-validate it whenever the method selection flips.
    // biome-ignore lint/correctness/useExhaustiveDependencies: basicPasswordSelected is the re-validation trigger, not used in the body
    useEffect(() => {
        trigger('vaultProfile');
    }, [basicPasswordSelected, trigger]);

    const lastResetIdRef = useRef<string | undefined>(undefined);

    const valuesToReset = useMemo<FormValues | undefined>(() => {
        if (!editMode || !id || tspProfile?.uuid !== id || isFetchingDetail) return undefined;

        const attributeInitialValues = mapProfileAttribute(
            tspProfile,
            multipleResourceCustomAttributes,
            Resource.TspProfiles,
            'customAttributes',
            '__attributes__customTspProfile__',
        );

        return {
            name: tspProfile.name || '',
            description: tspProfile.description || '',
            defaultSigningProfile: tspProfile.defaultSigningProfile?.uuid || '',
            allowedAuthenticationMethods: (tspProfile.allowedAuthenticationMethods ?? []).map((method) => ({
                value: method,
                label: getEnumLabel(authenticationMethodEnum, method),
            })),
            vaultProfile: tspProfile.vaultProfile?.uuid || '',
            ...transformAttributes(attributeInitialValues ?? []),
        };
    }, [editMode, id, tspProfile, isFetchingDetail, multipleResourceCustomAttributes, authenticationMethodEnum]);

    useEffect(() => {
        if (valuesToReset && lastResetIdRef.current !== id) {
            reset(valuesToReset);
            lastResetIdRef.current = id;
        }
    }, [valuesToReset, id, reset]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const requestDto = {
                name: values.name,
                description: values.description || undefined,
                defaultSigningProfileUuid: values.defaultSigningProfile || undefined,
                allowedAuthenticationMethods: (values.allowedAuthenticationMethods ?? []).map(
                    (method) => method.value as TspAuthenticationMethod,
                ),
                vaultProfileUuid: values.vaultProfile || undefined,
                customAttributes: collectFormAttributes('customTspProfile', multipleResourceCustomAttributes[Resource.TspProfiles], values),
            };

            if (editMode && id) {
                dispatch(tspActions.updateTspProfile({ uuid: id, tspProfileRequestDto: requestDto }));
            } else {
                dispatch(tspActions.createTspProfile({ tspProfileRequestDto: requestDto }));
            }
        },
        [dispatch, editMode, id, multipleResourceCustomAttributes],
    );

    const onCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <Container>
            <Breadcrumb
                items={[
                    {
                        label: `${getEnumLabel(resourceEnum, Resource.TspProfiles)} Inventory`,
                        href: `/${Resource.TspProfiles.toLowerCase()}`,
                    },
                    {
                        label: editMode ? tspProfile?.name || 'Edit TSP Profile' : 'Create TSP Profile',
                        href: '',
                    },
                ]}
            />

            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Widget title={editMode ? 'Edit TSP Profile' : 'Create TSP Profile'} busy={isBusy} titleSize="large">
                        <div className="space-y-4">
                            <Controller
                                name="name"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="name"
                                        type="text"
                                        label="TSP Profile Name"
                                        required
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="description"
                                control={control}
                                rules={buildValidationRules([validateLength(0, 300)])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="description"
                                        type="text"
                                        label="Description"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />

                            <Controller
                                name="defaultSigningProfile"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        id="defaultSigningProfileSelect"
                                        label="Default Signing Profile"
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        options={optionsForSigningProfiles}
                                        placeholder="Select a Signing Profile (optional)"
                                        isClearable
                                        placement="bottom"
                                    />
                                )}
                            />

                            <Controller
                                name="allowedAuthenticationMethods"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <Select
                                        id="allowedAuthenticationMethods"
                                        label="Allowed Authentication Methods"
                                        isMulti
                                        required
                                        value={field.value ?? []}
                                        onChange={field.onChange}
                                        options={authenticationMethodOptions}
                                        placeholder="Select authentication methods"
                                        placement="bottom"
                                        showOptionDescriptionInDropdown
                                        error={fieldState.error?.message}
                                    />
                                )}
                            />

                            <Controller
                                name="vaultProfile"
                                control={control}
                                rules={{
                                    validate: (value, formValues) =>
                                        hasBasicPassword(formValues.allowedAuthenticationMethods) && !value
                                            ? 'Vault Profile is required when Basic password authentication is allowed.'
                                            : undefined,
                                }}
                                render={({ field, fieldState }) => (
                                    <div>
                                        <Select
                                            id="vaultProfileSelect"
                                            label="Vault Profile"
                                            required={basicPasswordSelected}
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            options={vaultProfileOptions}
                                            placeholder={
                                                basicPasswordSelected
                                                    ? 'Select a Vault Profile (required)'
                                                    : 'Select a Vault Profile (optional)'
                                            }
                                            isClearable
                                            placement="bottom"
                                            error={fieldState.error?.message}
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            Stores Basic credentials — required when Basic password authentication is allowed.
                                        </p>
                                    </div>
                                )}
                            />

                            <Widget title="Custom Attributes" noBorder busy={isFetchingResourceCustomAttributes}>
                                <AttributeEditor
                                    id="customTspProfile"
                                    attributeDescriptors={multipleResourceCustomAttributes[Resource.TspProfiles] || []}
                                    attributes={editMode ? tspProfile?.customAttributes : undefined}
                                />
                            </Widget>

                            <Container className="flex-row justify-end" gap={4}>
                                <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                    Cancel
                                </Button>
                                <ProgressButton
                                    title={editMode ? 'Update' : 'Create'}
                                    inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                    inProgress={isSubmitting || isCreating || isUpdating}
                                    disabled={!isDirty || isSubmitting || !isValid}
                                    type="submit"
                                />
                            </Container>
                        </div>
                    </Widget>
                </form>
            </FormProvider>
        </Container>
    );
};
