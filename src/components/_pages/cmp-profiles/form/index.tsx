import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { actions as cmpProfileActions, selectors as cmpProfileSelectors } from 'ducks/cmp-profiles';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CmpProfileEditRequestModel, CmpProfileRequestModel } from 'types/cmp-profiles';
import {
    type CmpProfileEditRequestDtoVariantEnum,
    CmpProfileRequestDtoVariantEnum,
    PlatformEnum,
    ProtectionMethod,
    Resource,
} from 'types/openapi';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import useAttributeEditor, { buildGroups, buildOwner } from 'utils/widget';
import CertificateAssociationsFormWidget from 'components/CertificateAssociationsFormWidget/CertificateAssociationsFormWidget';
import { deepEqual } from 'utils/deep-equal';

type CmpProfileFormProps = Readonly<{
    cmpProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    variant: string;
    requestProtectionMethod: string;
    responseProtectionMethod: string;
    raProfileUuid: string;
    sharedSecret: string;
    signingCertificateUuid: string;
    owner: string;
    groups: { value: string; label: string }[];
    deletedAttributes: string[];
}
export default function CmpProfileForm({ cmpProfileId, onCancel, onSuccess }: CmpProfileFormProps) {
    const { id: routeId } = useParams();
    const id = cmpProfileId || routeId;
    const dispatch = useDispatch();

    const editMode = useMemo(() => !!id, [id]);

    const cmpProfile = useSelector(cmpProfileSelectors.cmpProfile);
    const cmpSigningCertificates = useSelector(cmpProfileSelectors.cmpSigningCertificates);
    const raProfileIssuanceAttrDescs = useSelector(raProfileSelectors.issuanceAttributes);
    const raProfileRevocationAttrDescs = useSelector(raProfileSelectors.revocationAttributes);
    const raProfiles = useSelector(raProfileSelectors.raProfiles);

    const isFetchingCmpCertificates = useSelector(cmpProfileSelectors.isFetchingCertificates);
    const isFetchingDetail = useSelector(cmpProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(cmpProfileSelectors.isCreating);
    const isUpdating = useSelector(cmpProfileSelectors.isUpdating);
    const isFetchingRaProfilesList = useSelector(raProfileSelectors.isFetchingList);
    const isFetchingIssuanceAttributes = useSelector(raProfileSelectors.isFetchingIssuanceAttributes);
    const isFetchingRevocationAttributes = useSelector(raProfileSelectors.isFetchingRevocationAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const protectionMethodEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ProtectionMethod));
    const cmpCmpProfileVariantEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CmpProfileVariant));
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.CmpProfiles, Resource.Certificates]),
    );

    const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);

    const [issueGroupAttributesCallbackAttributes, setIssueGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [revokeGroupAttributesCallbackAttributes, setRevokeGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const raProfilesOptions = useMemo(
        () =>
            raProfiles.map((raProfile) => ({
                value: raProfile,
                label: raProfile.name,
            })),
        [raProfiles],
    );

    const protectionMethodOptions = useMemo(
        () => [
            { value: ProtectionMethod.SharedSecret, label: getEnumLabel(protectionMethodEnum, ProtectionMethod.SharedSecret) },
            { value: ProtectionMethod.Signature, label: getEnumLabel(protectionMethodEnum, ProtectionMethod.Signature) },
        ],
        [protectionMethodEnum],
    );

    const cmpProfileVariantOptions = useMemo(
        () => [
            {
                value: CmpProfileRequestDtoVariantEnum.V2,
                label: getEnumLabel(cmpCmpProfileVariantEnum, CmpProfileRequestDtoVariantEnum.V2),
            },
            {
                value: CmpProfileRequestDtoVariantEnum.V3,
                label: getEnumLabel(cmpCmpProfileVariantEnum, CmpProfileRequestDtoVariantEnum.V3),
            },
            {
                value: CmpProfileRequestDtoVariantEnum.V23gpp,
                label: getEnumLabel(cmpCmpProfileVariantEnum, CmpProfileRequestDtoVariantEnum.V23gpp),
            },
        ],
        [cmpCmpProfileVariantEnum],
    );

    const signingCertificateOptions = useMemo(
        () =>
            cmpSigningCertificates?.map((certificate) => ({
                value: certificate.uuid,
                label: `${certificate.commonName} (${certificate.serialNumber})`,
            })),
        [cmpSigningCertificates],
    );

    useEffect(() => {
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([
                { resource: Resource.CmpProfiles, customAttributes: [] },
                { resource: Resource.Certificates, customAttributes: [] },
            ]),
        );
    }, [dispatch]);

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
    }, [dispatch]);

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingCmpCertificates,
        [isFetchingDetail, isCreating, isUpdating, isFetchingCmpCertificates],
    );

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || cmpProfile?.uuid !== id) {
                dispatch(cmpProfileActions.getCmpProfile({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            dispatch(cmpProfileActions.resetCmpProfile());
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, cmpProfile]);

    const defaultValues: FormValues = useMemo(() => {
        const initialAssociatedAttributes = mapProfileAttribute(
            cmpProfile,
            multipleResourceCustomAttributes,
            Resource.Certificates,
            'certificateAssociations.customAttributes',
            '__attributes__certificateAssociatedAttributes__',
        );

        const initialCustomAttributes = mapProfileAttribute(
            cmpProfile,
            multipleResourceCustomAttributes,
            Resource.CmpProfiles,
            'customAttributes',
            '__attributes__customCmpProfile__',
        );

        const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
        const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

        if (!(editMode && cmpProfile)) {
            return {
                name: '',
                description: '',
                variant: '',
                requestProtectionMethod: '',
                responseProtectionMethod: '',
                raProfileUuid: '',
                sharedSecret: '',
                signingCertificateUuid: '',
                owner: '',
                groups: [],
                deletedAttributes: [],
                ...transformedInitialAssociatedAttributes,
                ...transformedInitialCustomAttributes,
            };
        }

        const { raProfile, signingCertificate, requestProtectionMethod, responseProtectionMethod, variant, certificateAssociations } =
            cmpProfile;

        return {
            name: cmpProfile?.name || '',
            description: cmpProfile?.description || '',
            variant: variant || '',
            requestProtectionMethod: requestProtectionMethod || '',
            responseProtectionMethod: responseProtectionMethod || '',
            raProfileUuid: raProfile?.uuid || '',
            sharedSecret: '',
            signingCertificateUuid: signingCertificate?.uuid || '',
            owner: buildOwner(userOptions, certificateAssociations?.ownerUuid)?.value || '',
            groups: buildGroups(groupOptions, certificateAssociations?.groupUuids),
            deletedAttributes: [],
            ...transformedInitialAssociatedAttributes,
            ...transformedInitialCustomAttributes,
        };
    }, [cmpProfile, multipleResourceCustomAttributes, editMode, userOptions, groupOptions]);

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
        setValue,
        getValues,
        reset,
    } = methods;

    const formValues = useWatch({ control });
    const watchedRequestProtectionMethod = useWatch({
        control,
        name: 'requestProtectionMethod',
    });

    const watchedResponseProtectionMethod = useWatch({
        control,
        name: 'responseProtectionMethod',
    });

    useEffect(() => {
        if (watchedResponseProtectionMethod === ProtectionMethod.Signature) {
            if (!cmpSigningCertificates || cmpSigningCertificates.length === 0) dispatch(cmpProfileActions.listCmpSigningCertificates());
        }
    }, [watchedResponseProtectionMethod, dispatch, cmpSigningCertificates]);

    const lastResetProfileIdRef = useRef<string | undefined>(undefined);
    const lastResetEditModeRef = useRef<boolean | undefined>(undefined);

    // Reset form values when cmpProfile is loaded in edit mode
    useEffect(() => {
        if (editMode && id && cmpProfile?.uuid === id && !isFetchingDetail && userOptions.length > 0 && groupOptions.length > 0) {
            // Only reset if the profile ID changed or we haven't reset yet
            if (lastResetProfileIdRef.current !== id || lastResetEditModeRef.current !== editMode) {
                const initialAssociatedAttributes = mapProfileAttribute(
                    cmpProfile,
                    multipleResourceCustomAttributes,
                    Resource.Certificates,
                    'certificateAssociations.customAttributes',
                    '__attributes__certificateAssociatedAttributes__',
                );

                const initialCustomAttributes = mapProfileAttribute(
                    cmpProfile,
                    multipleResourceCustomAttributes,
                    Resource.CmpProfiles,
                    'customAttributes',
                    '__attributes__customCmpProfile__',
                );

                const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
                const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

                const {
                    raProfile,
                    signingCertificate,
                    requestProtectionMethod,
                    responseProtectionMethod,
                    variant,
                    certificateAssociations,
                } = cmpProfile;

                const newDefaultValues: FormValues = {
                    name: cmpProfile?.name || '',
                    description: cmpProfile?.description || '',
                    variant: variant || '',
                    requestProtectionMethod: requestProtectionMethod || '',
                    responseProtectionMethod: responseProtectionMethod || '',
                    raProfileUuid: raProfile?.uuid || '',
                    sharedSecret: '',
                    signingCertificateUuid: signingCertificate?.uuid || '',
                    owner: buildOwner(userOptions, certificateAssociations?.ownerUuid)?.value || '',
                    groups: buildGroups(groupOptions, certificateAssociations?.groupUuids),
                    deletedAttributes: [],
                    ...transformedInitialAssociatedAttributes,
                    ...transformedInitialCustomAttributes,
                };
                reset(newDefaultValues, { keepDefaultValues: false });
                lastResetProfileIdRef.current = id;
                lastResetEditModeRef.current = editMode;
            }
        } else if (!editMode) {
            // Reset form when switching to create mode (only if we were in edit mode before)
            if (lastResetEditModeRef.current === true) {
                const initialAssociatedAttributes = mapProfileAttribute(
                    undefined,
                    multipleResourceCustomAttributes,
                    Resource.Certificates,
                    'certificateAssociations.customAttributes',
                    '__attributes__certificateAssociatedAttributes__',
                );

                const initialCustomAttributes = mapProfileAttribute(
                    undefined,
                    multipleResourceCustomAttributes,
                    Resource.CmpProfiles,
                    'customAttributes',
                    '__attributes__customCmpProfile__',
                );

                const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
                const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

                reset(
                    {
                        name: '',
                        description: '',
                        variant: '',
                        requestProtectionMethod: '',
                        responseProtectionMethod: '',
                        raProfileUuid: '',
                        sharedSecret: '',
                        signingCertificateUuid: '',
                        owner: '',
                        groups: [],
                        deletedAttributes: [],
                        ...transformedInitialAssociatedAttributes,
                        ...transformedInitialCustomAttributes,
                    },
                    { keepDefaultValues: false },
                );
                lastResetProfileIdRef.current = undefined;
                lastResetEditModeRef.current = editMode;
            }
        }
    }, [editMode, cmpProfile, id, reset, isFetchingDetail, userOptions, groupOptions, multipleResourceCustomAttributes]);

    const normalizeOptionalValue = (value: string | undefined): string | undefined => {
        return value && value.trim() !== '' ? value : undefined;
    };

    const onSubmit = useCallback(
        (values: FormValues) => {
            const customAttributes = collectFormAttributes(
                'customCmpProfile',
                multipleResourceCustomAttributes[Resource.CmpProfiles],
                values,
            );
            const certificateAssociations = {
                ownerUuid: normalizeOptionalValue(values.owner),
                groupUuids: values.groups.map((group) => group.value),
                customAttributes: collectFormAttributes(
                    'certificateAssociatedAttributes',
                    multipleResourceCustomAttributes[Resource.Certificates],
                    values,
                ),
            };
            if (editMode && cmpProfile && cmpProfile?.uuid === id) {
                const valuesToSubmit: CmpProfileEditRequestModel = {
                    name: values.name,
                    description: normalizeOptionalValue(values.description),
                    variant: values.variant as CmpProfileEditRequestDtoVariantEnum,
                    requestProtectionMethod: values.requestProtectionMethod as ProtectionMethod,
                    responseProtectionMethod: values.responseProtectionMethod as ProtectionMethod,
                    raProfileUuid: normalizeOptionalValue(values.raProfileUuid),
                    sharedSecret:
                        values.requestProtectionMethod === ProtectionMethod.SharedSecret
                            ? normalizeOptionalValue(values.sharedSecret)
                            : undefined,
                    signingCertificateUuid:
                        values.responseProtectionMethod === ProtectionMethod.Signature
                            ? normalizeOptionalValue(values.signingCertificateUuid)
                            : undefined,

                    issueCertificateAttributes: collectFormAttributes(
                        'issuanceAttributes',
                        [...(raProfileIssuanceAttrDescs ?? []), ...issueGroupAttributesCallbackAttributes],
                        values,
                    ),
                    revokeCertificateAttributes: collectFormAttributes(
                        'revocationAttributes',
                        [...(raProfileRevocationAttrDescs ?? []), ...revokeGroupAttributesCallbackAttributes],
                        values,
                    ),
                    customAttributes,
                    certificateAssociations,
                };
                dispatch(cmpProfileActions.updateCmpProfile({ uuid: cmpProfile.uuid, updateCmpRequest: valuesToSubmit }));
            } else {
                const valuesToSubmit: CmpProfileRequestModel = {
                    name: values.name,
                    description: normalizeOptionalValue(values.description),
                    variant: values.variant as CmpProfileRequestDtoVariantEnum,
                    requestProtectionMethod: values.requestProtectionMethod as ProtectionMethod,
                    responseProtectionMethod: values.responseProtectionMethod as ProtectionMethod,
                    raProfileUuid: normalizeOptionalValue(values.raProfileUuid),
                    sharedSecret:
                        values.requestProtectionMethod === ProtectionMethod.SharedSecret
                            ? normalizeOptionalValue(values.sharedSecret)
                            : undefined,
                    signingCertificateUuid:
                        values.responseProtectionMethod === ProtectionMethod.Signature
                            ? normalizeOptionalValue(values.signingCertificateUuid)
                            : undefined,

                    issueCertificateAttributes: collectFormAttributes(
                        'issuanceAttributes',
                        [...(raProfileIssuanceAttrDescs ?? []), ...issueGroupAttributesCallbackAttributes],
                        values,
                    ),
                    revokeCertificateAttributes: collectFormAttributes(
                        'revocationAttributes',
                        [...(raProfileRevocationAttrDescs ?? []), ...revokeGroupAttributesCallbackAttributes],
                        values,
                    ),
                    customAttributes,
                    certificateAssociations,
                };
                dispatch(cmpProfileActions.createCmpProfile(valuesToSubmit));
            }
        },
        [
            id,
            cmpProfile,
            dispatch,
            editMode,
            issueGroupAttributesCallbackAttributes,
            raProfileIssuanceAttrDescs,
            raProfileRevocationAttrDescs,
            multipleResourceCustomAttributes,
            revokeGroupAttributesCallbackAttributes,
        ],
    );

    useEffect(() => {
        if (cmpProfile?.raProfile?.authorityInstanceUuid) {
            dispatch(
                raProfileActions.listIssuanceAttributeDescriptors({
                    authorityUuid: cmpProfile.raProfile.authorityInstanceUuid,
                    uuid: cmpProfile.raProfile.uuid,
                }),
            );
            dispatch(
                raProfileActions.listRevocationAttributeDescriptors({
                    authorityUuid: cmpProfile.raProfile.authorityInstanceUuid,
                    uuid: cmpProfile.raProfile.uuid,
                }),
            );
        }

        if (cmpProfile?.responseProtectionMethod === ProtectionMethod.Signature) {
            dispatch(cmpProfileActions.listCmpSigningCertificates());
        }
    }, [dispatch, cmpProfile]);

    const onRaProfileChange = useCallback(
        (value?: string) => {
            dispatch(connectorActions.clearCallbackData());
            setIssueGroupAttributesCallbackAttributes([]);
            setRevokeGroupAttributesCallbackAttributes([]);

            if (!value) {
                const formValues = getValues();
                Object.keys(formValues).forEach((key) => {
                    if (key.startsWith('__attributes__issuanceAttributes__') || key.startsWith('__attributes__revocationAttributes__')) {
                        setValue(key as any, undefined);
                    }
                });
                setValue('raProfileUuid', '');
                return;
            }
            const selectedRaProfile = raProfilesOptions.find((raProfile) => raProfile.value.uuid === value);

            if (selectedRaProfile?.value?.authorityInstanceUuid) {
                dispatch(
                    raProfileActions.listIssuanceAttributeDescriptors({
                        authorityUuid: selectedRaProfile?.value?.authorityInstanceUuid,
                        uuid: selectedRaProfile?.value?.uuid,
                    }),
                );
                dispatch(
                    raProfileActions.listRevocationAttributeDescriptors({
                        authorityUuid: selectedRaProfile?.value?.authorityInstanceUuid,
                        uuid: selectedRaProfile?.value?.uuid,
                    }),
                );
            }
            if (cmpProfile) {
                const formValues = getValues();
                Object.keys(formValues).forEach((key) => {
                    if (key.startsWith('__attributes__issuanceAttributes__') || key.startsWith('__attributes__revocationAttributes__')) {
                        setValue(key as any, undefined);
                    }
                });
            }
        },
        [dispatch, cmpProfile, raProfilesOptions, getValues, setValue],
    );

    const renderCustomAttributeEditor = useMemo(() => {
        return (
            <AttributeEditor
                id="customCmpProfile"
                attributeDescriptors={multipleResourceCustomAttributes[Resource.CmpProfiles] || []}
                attributes={cmpProfile?.customAttributes}
            />
        );
    }, [multipleResourceCustomAttributes, cmpProfile?.customAttributes]);

    const renderIssuanceAttributes = useMemo(() => {
        if (!raProfileIssuanceAttrDescs) return <></>;
        return (
            <AttributeEditor
                id="issuanceAttributes"
                attributeDescriptors={raProfileIssuanceAttrDescs}
                attributes={cmpProfile?.issueCertificateAttributes}
                groupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                setGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
            />
        );
    }, [raProfileIssuanceAttrDescs, cmpProfile?.issueCertificateAttributes, issueGroupAttributesCallbackAttributes]);

    const renderCertificateAssociatedAttributesEditor = useAttributeEditor({
        isBusy,
        id: 'certificateAssociatedAttributes',
        resourceKey: Resource.Certificates,
        attributes: cmpProfile?.certificateAssociations?.customAttributes,
        multipleResourceCustomAttributes,
        withRemoveAction: true,
    });

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const allFormValues = useWatch({ control });
    const isEqual = useMemo(() => deepEqual(defaultValues, allFormValues), [defaultValues, allFormValues]);

    const selectedRaProfile = raProfilesOptions.find((raProfile) => raProfile.value.uuid === allFormValues?.raProfileUuid);

    return (
        <>
            {!isFetchingDetail && (
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Widget noBorder busy={isBusy}>
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
                                            label="Name"
                                            required
                                            placeholder="CMP Profile Name"
                                            disabled={editMode}
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
                                        <TextArea
                                            {...field}
                                            id="description"
                                            label="Description"
                                            rows={3}
                                            placeholder="Enter Description"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Widget title="CMP Variant Configuration">
                                    <div>
                                        <label
                                            id="variant-label"
                                            htmlFor="variant-0"
                                            className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                        >
                                            Variant <span className="text-red-500">*</span>
                                        </label>
                                        <Controller
                                            name="variant"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <>
                                                    <div className="flex flex-wrap gap-4" role="radiogroup" aria-labelledby="variant-label">
                                                        {cmpProfileVariantOptions.map((option, index) => (
                                                            <label key={index} className="flex items-center cursor-pointer">
                                                                <input
                                                                    id={index === 0 ? 'variant-0' : undefined}
                                                                    type="radio"
                                                                    name="variant"
                                                                    value={option.value}
                                                                    checked={field.value === option.value}
                                                                    onChange={() => field.onChange(option.value)}
                                                                    className="shrink-0 mt-0.5 border-gray-200 rounded-full text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
                                                                />
                                                                <span className="ml-2 text-sm text-gray-700 dark:text-neutral-400">
                                                                    {option.label}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
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
                                </Widget>
                                <Widget title="Request Configuration">
                                    <div className="space-y-4">
                                        <Controller
                                            name="requestProtectionMethod"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <Select
                                                    id="selectedRequestProtectionMethodSelect"
                                                    label="Requested Protection Method"
                                                    required
                                                    value={field.value || ''}
                                                    onChange={(value) => {
                                                        field.onChange(value);
                                                        setValue('sharedSecret', '');
                                                    }}
                                                    options={protectionMethodOptions.map((opt) => ({
                                                        value: opt.value,
                                                        label: opt.label,
                                                    }))}
                                                    placeholder="Select Requested Protection Method"
                                                    isClearable
                                                    placement="bottom"
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />
                                        {watchedRequestProtectionMethod === ProtectionMethod.SharedSecret && (
                                            <Controller
                                                name="sharedSecret"
                                                control={control}
                                                rules={buildValidationRules(editMode ? [] : [validateRequired()])}
                                                render={({ field, fieldState }) => (
                                                    <TextInput
                                                        {...field}
                                                        id="sharedSecret"
                                                        type="password"
                                                        label="Shared Secret"
                                                        required={!editMode}
                                                        placeholder={editMode ? 'Leave blank to keep current' : 'Shared Secret'}
                                                        invalid={fieldState.error && fieldState.isTouched}
                                                        error={getFieldErrorMessage(fieldState)}
                                                    />
                                                )}
                                            />
                                        )}
                                    </div>
                                </Widget>

                                <Widget title="Response Configuration">
                                    <div className="space-y-4">
                                        <Controller
                                            name="responseProtectionMethod"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <Select
                                                    id="selectedResponseProtectionMethodSelect"
                                                    label="Response Protection Method"
                                                    required
                                                    value={field.value || ''}
                                                    onChange={(value) => {
                                                        field.onChange(value);
                                                        setValue('signingCertificateUuid', '');
                                                    }}
                                                    options={protectionMethodOptions.map((opt) => ({
                                                        value: opt.value,
                                                        label: opt.label,
                                                    }))}
                                                    placeholder="Select Response Protection Method"
                                                    isClearable
                                                    placement="bottom"
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />

                                        {watchedResponseProtectionMethod === ProtectionMethod.Signature && (
                                            <Controller
                                                name="signingCertificateUuid"
                                                control={control}
                                                rules={buildValidationRules([validateRequired()])}
                                                render={({ field, fieldState }) => (
                                                    <Select
                                                        id="selectedSigningCertificate"
                                                        label="Signing Certificate"
                                                        required
                                                        value={field.value || ''}
                                                        onChange={(value) => {
                                                            field.onChange(value);
                                                        }}
                                                        options={signingCertificateOptions}
                                                        placeholder="Select Signing Certificate"
                                                        isClearable
                                                        placement="bottom"
                                                        error={getFieldErrorMessage(fieldState)}
                                                    />
                                                )}
                                            />
                                        )}
                                    </div>
                                </Widget>
                                <Widget
                                    title="RA Profile Configuration"
                                    busy={
                                        isFetchingRaProfilesList ||
                                        isFetchingIssuanceAttributes ||
                                        isFetchingRevocationAttributes ||
                                        isFetchingResourceCustomAttributes
                                    }
                                >
                                    <div className="space-y-4">
                                        <Controller
                                            name="raProfileUuid"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    id="selectedRaProfileSelect"
                                                    label="Default RA Profile"
                                                    value={field.value || ''}
                                                    onChange={(value) => {
                                                        field.onChange(value);
                                                        onRaProfileChange(typeof value === 'string' ? value : value?.toString() || '');
                                                    }}
                                                    options={raProfilesOptions.map((opt) => ({
                                                        value: opt.value.uuid,
                                                        label: opt.label,
                                                    }))}
                                                    placeholder="Select to change RA Profile if needed"
                                                    isClearable
                                                    placement="bottom"
                                                />
                                            )}
                                        />

                                        <TabLayout
                                            noBorder
                                            onlyActiveTabContent={false}
                                            tabs={[
                                                {
                                                    title: 'Issue Attributes',
                                                    content:
                                                        !selectedRaProfile?.value ||
                                                        !raProfileIssuanceAttrDescs ||
                                                        raProfileIssuanceAttrDescs.length === 0 ? (
                                                            <></>
                                                        ) : (
                                                            renderIssuanceAttributes
                                                        ),
                                                },
                                                {
                                                    title: 'Revocation Attributes',
                                                    content:
                                                        !selectedRaProfile?.value ||
                                                        !raProfileRevocationAttrDescs ||
                                                        raProfileRevocationAttrDescs.length === 0 ? (
                                                            <></>
                                                        ) : (
                                                            <AttributeEditor
                                                                id="revocationAttributes"
                                                                attributeDescriptors={raProfileRevocationAttrDescs}
                                                                attributes={cmpProfile?.revokeCertificateAttributes}
                                                                groupAttributesCallbackAttributes={revokeGroupAttributesCallbackAttributes}
                                                                setGroupAttributesCallbackAttributes={
                                                                    setRevokeGroupAttributesCallbackAttributes
                                                                }
                                                            />
                                                        ),
                                                },
                                                {
                                                    title: 'Custom Attributes',
                                                    content: renderCustomAttributeEditor,
                                                },
                                            ]}
                                        />
                                    </div>
                                </Widget>

                                <CertificateAssociationsFormWidget
                                    renderCustomAttributes={renderCertificateAssociatedAttributesEditor}
                                    userOptions={userOptions}
                                    groupOptions={groupOptions}
                                    setUserOptions={setUserOptions}
                                    setGroupOptions={setGroupOptions}
                                />
                            </div>
                            <Container className="flex-row justify-end modal-footer" gap={4}>
                                <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                    Cancel
                                </Button>
                                <ProgressButton
                                    title={editMode ? 'Update' : 'Create'}
                                    inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                    inProgress={isSubmitting}
                                    disabled={
                                        isEqual ||
                                        isSubmitting ||
                                        !isValid ||
                                        isBusy ||
                                        !formValues.requestProtectionMethod ||
                                        !formValues.responseProtectionMethod ||
                                        areDefaultValuesSame(formValues)
                                    }
                                    type="submit"
                                />
                            </Container>
                        </Widget>
                    </form>
                </FormProvider>
            )}
        </>
    );
}
