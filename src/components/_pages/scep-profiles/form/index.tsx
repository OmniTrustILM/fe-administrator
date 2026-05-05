import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';

import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { actions as scepProfileActions, selectors as scepProfileSelectors } from 'ducks/scep-profiles';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Switch from 'components/Switch';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { RaProfileSimplifiedModel } from 'types/ra-profiles';
import type { ScepProfileAddRequestModel, ScepProfileEditRequestModel, ScepProfileResponseModel } from 'types/scep-profiles';

import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithoutAccents, validateInteger, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { KeyAlgorithm, Resource } from '../../../../types/openapi';
import CertificateField from '../CertificateField';
import useAttributeEditor, { buildGroups, buildOwner } from 'utils/widget';
import CertificateAssociationsFormWidget from 'components/CertificateAssociationsFormWidget/CertificateAssociationsFormWidget';
import { deepEqual } from 'utils/deep-equal';
import TextInput from 'components/TextInput';

type ScepProfileFormProps = Readonly<{
    scepProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    renewalThreshold: string;
    includeCaCertificate: boolean;
    includeCaCertificateChain: boolean;
    challengePassword: string;
    enableIntune: boolean;
    intuneTenant: string;
    intuneApplicationId: string;
    intuneApplicationKey: string;
    raProfile: string;
    certificate: string;
    owner: string;
    groups: { value: string; label: string }[];
    deletedAttributes: string[];
}

export default function ScepProfileForm({ scepProfileId, onCancel, onSuccess }: ScepProfileFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = scepProfileId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const scepProfileSelector = useSelector(scepProfileSelectors.scepProfile);

    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const raProfileIssuanceAttrDescs = useSelector(raProfileSelectors.issuanceAttributes);
    const certificates = useSelector(scepProfileSelectors.caCertificates);

    const isFetchingDetail = useSelector(scepProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(scepProfileSelectors.isCreating);
    const isUpdating = useSelector(scepProfileSelectors.isUpdating);
    const createScepProfileSucceeded = useSelector(scepProfileSelectors.createScepProfileSucceeded);
    const updateScepProfileSucceeded = useSelector(scepProfileSelectors.updateScepProfileSucceeded);

    const isFetchingRaProfilesList = useSelector(raProfileSelectors.isFetchingList);
    const isFetchingIssuanceAttributes = useSelector(raProfileSelectors.isFetchingIssuanceAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.ScepProfiles, Resource.Certificates]),
    );
    const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);
    const [issueGroupAttributesCallbackAttributes, setIssueGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [scepProfile, setScepProfile] = useState<ScepProfileResponseModel>();
    const [raProfile, setRaProfile] = useState<RaProfileSimplifiedModel>();
    const [intune, setIntune] = useState(false);

    const isBusy = useMemo(() => isFetchingDetail || isCreating || isUpdating, [isFetchingDetail, isCreating, isUpdating]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || scepProfileSelector?.uuid !== id) {
                dispatch(scepProfileActions.getScepProfile({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }

        if (editMode && scepProfileSelector?.uuid === id) {
            setIntune(scepProfileSelector.enableIntune ?? false);
            setScepProfile(scepProfileSelector);
            setRaProfile(scepProfileSelector.raProfile);
        }
    }, [dispatch, id, editMode, scepProfileSelector]);

    useEffect(() => {
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([
                { resource: Resource.ScepProfiles, customAttributes: [] },
                { resource: Resource.Certificates, customAttributes: [] },
            ]),
        );
    }, [dispatch]);

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
    }, [dispatch]);

    useEffect(() => {
        dispatch(scepProfileActions.listScepCaCertificates(intune));
    }, [dispatch, intune]);

    useEffect(() => {
        if (raProfile?.authorityInstanceUuid) {
            dispatch(
                raProfileActions.listIssuanceAttributeDescriptors({ authorityUuid: raProfile.authorityInstanceUuid, uuid: raProfile.uuid }),
            );
        }
    }, [dispatch, raProfile]);

    const optionsForRaProfiles = useMemo(
        () =>
            raProfiles.map((raProfile) => ({
                value: raProfile.uuid,
                label: raProfile.name,
            })),
        [raProfiles],
    );

    const defaultValues = useMemo(() => {
        const initialAssociatedAttributes = mapProfileAttribute(
            scepProfile,
            multipleResourceCustomAttributes,
            Resource.Certificates,
            'certificateAssociations.customAttributes',
            '__attributes__certificateAssociatedAttributes__',
        );
        const initialCustomAttributes = mapProfileAttribute(
            scepProfile,
            multipleResourceCustomAttributes,
            Resource.ScepProfiles,
            'customAttributes',
            '__attributes__customScepProfile__',
        );

        const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
        const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

        return {
            name: editMode ? scepProfileSelector?.name || '' : '',
            description: editMode ? scepProfileSelector?.description || '' : '',
            renewalThreshold: editMode ? (scepProfileSelector?.renewThreshold || 0).toString() : '0',
            includeCaCertificate: editMode ? scepProfileSelector?.includeCaCertificate || false : false,
            includeCaCertificateChain: editMode ? scepProfileSelector?.includeCaCertificateChain || false : false,
            enableIntune: editMode ? (scepProfileSelector?.enableIntune ?? false) : false,
            intuneTenant: editMode ? (scepProfileSelector?.intuneTenant ?? '') : '',
            intuneApplicationId: editMode ? (scepProfileSelector?.intuneApplicationId ?? '') : '',
            intuneApplicationKey: '',
            challengePassword: '',
            raProfile: editMode
                ? (optionsForRaProfiles.find((raProfile) => raProfile.value === scepProfileSelector?.raProfile?.uuid)?.value ?? '')
                : '',
            certificate: editMode && scepProfileSelector?.caCertificate ? scepProfileSelector.caCertificate.uuid : '',
            owner: editMode ? buildOwner(userOptions, scepProfileSelector?.certificateAssociations?.ownerUuid)?.value || '' : '',
            groups: editMode ? buildGroups(groupOptions, scepProfileSelector?.certificateAssociations?.groupUuids) : [],
            deletedAttributes: [] as string[],
            ...transformedInitialAssociatedAttributes,
            ...transformedInitialCustomAttributes,
        };
    }, [editMode, scepProfileSelector, optionsForRaProfiles, userOptions, groupOptions, multipleResourceCustomAttributes, scepProfile]);

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

    const watchedEnableIntune = useWatch({
        control,
        name: 'enableIntune',
    });

    const watchedCertificate = useWatch({
        control,
        name: 'certificate',
    });

    useEffect(() => {
        setIntune(watchedEnableIntune);
    }, [watchedEnableIntune]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            const scepRequest: ScepProfileEditRequestModel | ScepProfileAddRequestModel = {
                name: values.name,
                description: values.description,
                renewalThreshold: Number.parseInt(values.renewalThreshold, 10),
                includeCaCertificate: values.includeCaCertificate,
                includeCaCertificateChain: values.includeCaCertificateChain,
                challengePassword: values.challengePassword || undefined,
                enableIntune: values.enableIntune,
                intuneTenant: values.intuneTenant,
                intuneApplicationId: values.intuneApplicationId,
                intuneApplicationKey: values.intuneApplicationKey,
                caCertificateUuid: values.certificate,
                issueCertificateAttributes: collectFormAttributes(
                    'issuanceAttributes',
                    [...(raProfileIssuanceAttrDescs ?? []), ...issueGroupAttributesCallbackAttributes],
                    values,
                ),
                customAttributes: collectFormAttributes(
                    'customScepProfile',
                    multipleResourceCustomAttributes[Resource.ScepProfiles],
                    values,
                ),
                certificateAssociations: {
                    ownerUuid: values.owner,
                    groupUuids: values.groups.map((group) => group.value),
                    customAttributes: collectFormAttributes(
                        'certificateAssociatedAttributes',
                        multipleResourceCustomAttributes[Resource.Certificates],
                        values,
                    ),
                },
            };
            if (values.raProfile) {
                scepRequest.raProfileUuid = values.raProfile;
            }
            if (editMode) {
                dispatch(
                    scepProfileActions.updateScepProfile({
                        uuid: id!,
                        updateScepRequest: scepRequest,
                    }),
                );
            } else {
                dispatch(scepProfileActions.createScepProfile(scepRequest as ScepProfileAddRequestModel));
            }
        },
        [dispatch, editMode, id, raProfileIssuanceAttrDescs, issueGroupAttributesCallbackAttributes, multipleResourceCustomAttributes],
    );

    const onRaProfileChange = useCallback(
        (value: string) => {
            dispatch(connectorActions.clearCallbackData());
            setIssueGroupAttributesCallbackAttributes([]);

            if (!value) {
                setRaProfile(undefined);
                dispatch(raProfileActions.clearIssuanceAttributesDescriptors());
                const formValues = getValues();
                Object.keys(formValues).forEach((key) => {
                    if (key.startsWith('__attributes__issuanceAttributes__')) {
                        setValue(key as any, undefined);
                    }
                });
                return;
            }

            setRaProfile(raProfiles.find((p) => p.uuid === value));

            if (scepProfile) {
                setScepProfile({
                    ...scepProfile,
                    issueCertificateAttributes: [],
                });
            }
        },
        [dispatch, raProfiles, scepProfile, getValues, setValue],
    );

    const renderCertificateAssociatedAttributesEditor = useAttributeEditor({
        isBusy,
        id: 'certificateAssociatedAttributes',
        resourceKey: Resource.Certificates,
        attributes: scepProfileSelector?.certificateAssociations?.customAttributes,
        multipleResourceCustomAttributes,
        withRemoveAction: true,
    });

    const lastResetProfileIdRef = useRef<string | undefined>(undefined);
    const lastResetEditModeRef = useRef<boolean | undefined>(undefined);

    // Reset form values when scepProfile is loaded in edit mode
    useEffect(() => {
        if (editMode && id && scepProfileSelector?.uuid === id && !isFetchingDetail && optionsForRaProfiles.length > 0) {
            // Only reset if the profile ID changed or we haven't reset yet
            if (lastResetProfileIdRef.current !== id || lastResetEditModeRef.current !== editMode) {
                const initialAssociatedAttributes = mapProfileAttribute(
                    scepProfileSelector,
                    multipleResourceCustomAttributes,
                    Resource.Certificates,
                    'certificateAssociations.customAttributes',
                    '__attributes__certificateAssociatedAttributes__',
                );
                const initialCustomAttributes = mapProfileAttribute(
                    scepProfileSelector,
                    multipleResourceCustomAttributes,
                    Resource.ScepProfiles,
                    'customAttributes',
                    '__attributes__customScepProfile__',
                );

                const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
                const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

                const newDefaultValues: FormValues = {
                    name: scepProfileSelector.name || '',
                    description: scepProfileSelector.description || '',
                    renewalThreshold: (scepProfileSelector.renewThreshold || 0).toString(),
                    includeCaCertificate: scepProfileSelector.includeCaCertificate || false,
                    includeCaCertificateChain: scepProfileSelector.includeCaCertificateChain || false,
                    enableIntune: scepProfileSelector.enableIntune ?? false,
                    intuneTenant: scepProfileSelector.intuneTenant ?? '',
                    intuneApplicationId: scepProfileSelector.intuneApplicationId ?? '',
                    intuneApplicationKey: '',
                    challengePassword: '',
                    raProfile:
                        optionsForRaProfiles.find((raProfile) => raProfile.value === scepProfileSelector.raProfile?.uuid)?.value || '',
                    certificate: scepProfileSelector.caCertificate ? scepProfileSelector.caCertificate.uuid : '',
                    owner: buildOwner(userOptions, scepProfileSelector.certificateAssociations?.ownerUuid)?.value || '',
                    groups: buildGroups(groupOptions, scepProfileSelector.certificateAssociations?.groupUuids) || [],
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
                reset({
                    name: '',
                    description: '',
                    renewalThreshold: '0',
                    includeCaCertificate: false,
                    includeCaCertificateChain: false,
                    enableIntune: false,
                    intuneTenant: '',
                    intuneApplicationId: '',
                    intuneApplicationKey: '',
                    challengePassword: '',
                    raProfile: '',
                    certificate: '',
                    owner: '',
                    groups: [],
                    deletedAttributes: [],
                });
                lastResetProfileIdRef.current = undefined;
                lastResetEditModeRef.current = editMode;
            }
        }
    }, [
        editMode,
        scepProfileSelector,
        id,
        reset,
        isFetchingDetail,
        optionsForRaProfiles,
        multipleResourceCustomAttributes,
        userOptions,
        groupOptions,
    ]);

    useRunOnSuccessfulFinish(isCreating, createScepProfileSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateScepProfileSucceeded, onSuccess);

    const allFormValues = useWatch({ control });
    const isEqual = useMemo(() => deepEqual(defaultValues, allFormValues), [defaultValues, allFormValues]);

    const selectedCertificate = certificates?.find((c) => c.uuid === watchedCertificate);
    const requiresChallengePassword = selectedCertificate?.publicKeyAlgorithm === KeyAlgorithm.Ecdsa;

    return (
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
                                    label="SCEP Profile Name"
                                    required
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
                            name="challengePassword"
                            control={control}
                            rules={requiresChallengePassword ? buildValidationRules([validateRequired()]) : buildValidationRules([])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="challengePassword"
                                    type="password"
                                    label="Challenge Password"
                                    required={requiresChallengePassword}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <div>
                            <p className="text-sm text-gray-500 mb-2">Minimum expiry days to allow renewal of certificate.</p>
                            <Controller
                                name="renewalThreshold"
                                control={control}
                                rules={buildValidationRules([validateInteger()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        {...field}
                                        id="renewalThreshold"
                                        type="number"
                                        label="Renewal Threshold"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

                        <Controller
                            name="includeCaCertificate"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="includeCaCertificate"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    secondaryLabel="Include CA Certificate"
                                />
                            )}
                        />

                        <Controller
                            name="includeCaCertificateChain"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="includeCaCertificateChain"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    secondaryLabel="Include CA Certificate Chain"
                                />
                            )}
                        />

                        <Controller
                            name="enableIntune"
                            control={control}
                            render={({ field }) => (
                                <Switch id="enableIntune" checked={field.value} onChange={field.onChange} secondaryLabel="Enable Intune" />
                            )}
                        />

                        <Controller
                            name="intuneTenant"
                            control={control}
                            rules={watchedEnableIntune ? buildValidationRules([validateRequired()]) : buildValidationRules([])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="intuneTenant"
                                    type="text"
                                    label="Intune Tenant"
                                    required={watchedEnableIntune}
                                    disabled={!watchedEnableIntune}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="intuneApplicationId"
                            control={control}
                            rules={watchedEnableIntune ? buildValidationRules([validateRequired()]) : buildValidationRules([])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="intuneApplicationId"
                                    type="text"
                                    label="Intune Application ID"
                                    required={watchedEnableIntune}
                                    disabled={!watchedEnableIntune}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="intuneApplicationKey"
                            control={control}
                            rules={watchedEnableIntune ? buildValidationRules([validateRequired()]) : buildValidationRules([])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="intuneApplicationKey"
                                    type="password"
                                    label="Intune Application Key"
                                    required={watchedEnableIntune}
                                    disabled={!watchedEnableIntune}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <CertificateField certificates={certificates} />

                        <Widget
                            title="RA Profile Configuration"
                            busy={isFetchingRaProfilesList || isFetchingIssuanceAttributes || isFetchingResourceCustomAttributes}
                        >
                            <div className="space-y-4">
                                <Controller
                                    name="raProfile"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="raProfileSelect"
                                            label="Default RA Profile"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                // Call onRaProfileChange directly when user changes the value
                                                onRaProfileChange(typeof value === 'string' ? value : value?.toString() || '');
                                            }}
                                            options={optionsForRaProfiles || []}
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
                                                !raProfile || !raProfileIssuanceAttrDescs || raProfileIssuanceAttrDescs.length === 0 ? (
                                                    <></>
                                                ) : (
                                                    <AttributeEditor
                                                        id="issuanceAttributes"
                                                        attributeDescriptors={raProfileIssuanceAttrDescs}
                                                        attributes={scepProfile?.issueCertificateAttributes}
                                                        groupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                                                        setGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
                                                    />
                                                ),
                                        },
                                        {
                                            title: 'Custom Attributes',
                                            content: (
                                                <AttributeEditor
                                                    id="customScepProfile"
                                                    attributeDescriptors={multipleResourceCustomAttributes[Resource.ScepProfiles] || []}
                                                    attributes={scepProfile?.customAttributes}
                                                />
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        </Widget>

                        <CertificateAssociationsFormWidget
                            userOptions={userOptions}
                            groupOptions={groupOptions}
                            setUserOptions={setUserOptions}
                            setGroupOptions={setGroupOptions}
                            renderCustomAttributes={renderCertificateAssociatedAttributesEditor}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting}
                                disabled={isEqual || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
