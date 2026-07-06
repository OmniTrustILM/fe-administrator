import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';

import { actions as acmeProfileActions, selectors as acmeProfileSelectors } from 'ducks/acme-profiles';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Checkbox from 'components/Checkbox';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import type { AcmeProfileAddRequestModel, AcmeProfileEditRequestModel, AcmeProfileResponseModel } from 'types/acme-profiles';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { RaProfileSimplifiedModel } from 'types/ra-profiles';

import {
    validateAlphaNumericWithoutAccents,
    validateCustomIp,
    validateUrlWithRoute,
    validateInteger,
    validateLength,
    validateRequired,
} from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { Resource } from '../../../../types/openapi';
import useAttributeEditor, { buildGroups, buildOwner } from 'utils/widget';
import CertificateAssociationsFormWidget from 'components/CertificateAssociationsFormWidget/CertificateAssociationsFormWidget';
import { collectFormAttributes, transformAttributes, mapProfileAttribute } from 'utils/attributes/attributes';
import { deepEqual } from 'utils/deep-equal';

type AcmeProfileFormProps = {
    acmeProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
};

type FormValues = {
    name: string;
    description: string;
    dnsIpAddress: string;
    dnsPort: string;
    retryInterval: string;
    orderValidity: string;
    termsUrl: string;
    webSite: string;
    termsChangeUrl: string;
    disableOrders: boolean;
    requireTermsOfService: boolean;
    requireContact: boolean;
    raProfile: string;
    owner: string;
    groups: { value: string; label: string }[];
    deletedAttributes: string[];
} & Record<`__attributes__${string}`, unknown>;

export default function AcmeProfileForm({ acmeProfileId, onCancel, onSuccess }: Readonly<AcmeProfileFormProps>) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = acmeProfileId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const acmeProfileSelector = useSelector(acmeProfileSelectors.acmeProfile);
    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const raProfileIssuanceAttrDescs = useSelector(raProfileSelectors.issuanceAttributes);
    const raProfileRevocationAttrDescs = useSelector(raProfileSelectors.revocationAttributes);
    const multipleResourceCustomAttributes = useSelector(
        customAttributesSelectors.multipleResourceCustomAttributes([Resource.AcmeProfiles, Resource.Certificates]),
    );

    const isFetchingDetail = useSelector(acmeProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(acmeProfileSelectors.isCreating);
    const isUpdating = useSelector(acmeProfileSelectors.isUpdating);
    const createAcmeProfileSucceeded = useSelector(acmeProfileSelectors.createAcmeProfileSucceeded);
    const updateAcmeProfileSucceeded = useSelector(acmeProfileSelectors.updateAcmeProfileSucceeded);

    const isFetchingRaProfilesList = useSelector(raProfileSelectors.isFetchingList);
    const isFetchingIssuanceAttributes = useSelector(raProfileSelectors.isFetchingIssuanceAttributes);
    const isFetchingRevocationAttributes = useSelector(raProfileSelectors.isFetchingRevocationAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const [issueGroupAttributesCallbackAttributes, setIssueGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [revokeGroupAttributesCallbackAttributes, setRevokeGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [acmeProfile, setAcmeProfile] = useState<AcmeProfileResponseModel>();
    const [raProfile, setRaProfile] = useState<RaProfileSimplifiedModel>();

    const isBusy = useMemo(() => isFetchingDetail || isCreating || isUpdating, [isFetchingDetail, isCreating, isUpdating]);

    const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([]);
    const [groupOptions, setGroupOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([
                { resource: Resource.AcmeProfiles, customAttributes: [] },
                { resource: Resource.Certificates, customAttributes: [] },
            ]),
        );
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || acmeProfileSelector?.uuid !== id) {
                dispatch(acmeProfileActions.getAcmeProfile({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }

        if (editMode && acmeProfileSelector && acmeProfileSelector.uuid === id) {
            setAcmeProfile(acmeProfileSelector);
            setRaProfile(acmeProfileSelector.raProfile);
        }
    }, [dispatch, id, editMode, acmeProfileSelector]);

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
    }, [dispatch]);

    useEffect(() => {
        if (raProfile?.authorityInstanceUuid) {
            dispatch(
                raProfileActions.listIssuanceAttributeDescriptors({ authorityUuid: raProfile.authorityInstanceUuid, uuid: raProfile.uuid }),
            );
            dispatch(
                raProfileActions.listRevocationAttributeDescriptors({
                    authorityUuid: raProfile.authorityInstanceUuid,
                    uuid: raProfile.uuid,
                }),
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

    const getValue = useCallback(
        <T,>(value: T | undefined | null, fallback: T): T => {
            return editMode ? (value ?? fallback) : fallback;
        },
        [editMode],
    );

    const defaultValues: FormValues = useMemo(() => {
        const initialAssociatedAttributes = mapProfileAttribute(
            acmeProfile,
            multipleResourceCustomAttributes,
            Resource.Certificates,
            'certificateAssociations.customAttributes',
            '__attributes__certificateAssociatedAttributes__',
        );

        const initialCustomAttributes = mapProfileAttribute(
            acmeProfile,
            multipleResourceCustomAttributes,
            Resource.AcmeProfiles,
            'customAttributes',
            '__attributes__customAcmeProfile__',
        );

        const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
        const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

        return {
            name: getValue(acmeProfile?.name, ''),
            description: getValue(acmeProfile?.description, ''),
            dnsIpAddress: getValue(acmeProfile?.dnsResolverIp, ''),
            dnsPort: getValue(acmeProfile?.dnsResolverPort, ''),
            retryInterval: getValue(acmeProfile?.retryInterval?.toString(), '30'),
            orderValidity: getValue(acmeProfile?.validity?.toString(), '36000'),
            termsUrl: getValue(acmeProfile?.termsOfServiceUrl, ''),
            webSite: getValue(acmeProfile?.websiteUrl, ''),
            termsChangeUrl: getValue(acmeProfile?.termsOfServiceChangeUrl, ''),
            disableOrders: getValue(acmeProfile?.termsOfServiceChangeDisable, false),
            requireTermsOfService: getValue(acmeProfile?.requireTermsOfService, false),
            requireContact: getValue(acmeProfile?.requireContact, false),
            raProfile:
                editMode && acmeProfile?.raProfile
                    ? optionsForRaProfiles.find((ra) => ra.value === acmeProfile.raProfile?.uuid)?.value || ''
                    : '',
            owner: editMode ? buildOwner(userOptions, acmeProfile?.certificateAssociations?.ownerUuid)?.value || '' : '',
            groups: editMode ? buildGroups(groupOptions, acmeProfile?.certificateAssociations?.groupUuids) : [],
            deletedAttributes: [],
            ...transformedInitialAssociatedAttributes,
            ...transformedInitialCustomAttributes,
        };
    }, [editMode, acmeProfile, optionsForRaProfiles, userOptions, groupOptions, getValue, multipleResourceCustomAttributes]);

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

    const onSubmit = useCallback(
        (values: FormValues) => {
            const request: AcmeProfileEditRequestModel | AcmeProfileAddRequestModel = {
                name: values.name,
                description: values.description,
                requireContact: values.requireContact,
                requireTermsOfService: values.requireTermsOfService,
                dnsResolverIp: values.dnsIpAddress,
                dnsResolverPort: values.dnsPort,
                retryInterval: Number.parseInt(values.retryInterval, 10),
                validity: Number.parseInt(values.orderValidity, 10),
                termsOfServiceUrl: values.termsUrl,
                websiteUrl: values.webSite,
                termsOfServiceChangeUrl: values.termsChangeUrl,
                termsOfServiceChangeDisable: values.disableOrders,
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
                customAttributes: collectFormAttributes(
                    'customAcmeProfile',
                    multipleResourceCustomAttributes[Resource.AcmeProfiles],
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
                request.raProfileUuid = values.raProfile;
            }
            if (editMode) {
                dispatch(acmeProfileActions.updateAcmeProfile({ uuid: id!, updateAcmeRequest: request }));
            } else {
                dispatch(acmeProfileActions.createAcmeProfile(request as AcmeProfileAddRequestModel));
            }
        },
        [
            dispatch,
            editMode,
            id,
            issueGroupAttributesCallbackAttributes,
            multipleResourceCustomAttributes,
            raProfileIssuanceAttrDescs,
            raProfileRevocationAttrDescs,
            revokeGroupAttributesCallbackAttributes,
        ],
    );

    const onRaProfileChange = useCallback(
        (value: string) => {
            dispatch(connectorActions.clearCallbackData());
            setIssueGroupAttributesCallbackAttributes([]);
            setRevokeGroupAttributesCallbackAttributes([]);

            if (!value) {
                setRaProfile(undefined);
                dispatch(raProfileActions.clearIssuanceAttributesDescriptors());
                dispatch(raProfileActions.clearRevocationAttributesDescriptors());
                const formValues = getValues();
                Object.keys(formValues).forEach((key) => {
                    if (key.startsWith('__attributes__issuanceAttributes__') || key.startsWith('__attributes__revocationAttributes__')) {
                        setValue(key as `__attributes__${string}`, undefined);
                    }
                });
                return;
            }

            setRaProfile(raProfiles.find((p) => p.uuid === value));

            if (acmeProfile) {
                setAcmeProfile({
                    ...acmeProfile,
                    issueCertificateAttributes: [],
                    revokeCertificateAttributes: [],
                });
            }
        },
        [dispatch, raProfiles, acmeProfile, getValues, setValue],
    );

    const renderCustomAttributeEditor = useAttributeEditor({
        isBusy,
        id: 'customAcmeProfile',
        resourceKey: Resource.AcmeProfiles,
        attributes: acmeProfile?.customAttributes,
        multipleResourceCustomAttributes,
        withRemoveAction: true,
    });

    const renderCertificateAssociatedAttributesEditor = useAttributeEditor({
        isBusy,
        id: 'certificateAssociatedAttributes',
        resourceKey: Resource.Certificates,
        attributes: acmeProfile?.certificateAssociations?.customAttributes,
        multipleResourceCustomAttributes,
        withRemoveAction: true,
    });

    const allFormValues = useWatch({ control });
    const isEqual = useMemo(() => deepEqual<unknown>(defaultValues, allFormValues), [defaultValues, allFormValues]);

    const isSaving = isSubmitting || isCreating || isUpdating;

    const lastResetProfileIdRef = useRef<string | undefined>(undefined);
    const lastResetEditModeRef = useRef<boolean | undefined>(undefined);

    // Reset form values when acmeProfile is loaded in edit mode
    useEffect(() => {
        if (editMode && id && acmeProfile?.uuid === id && !isFetchingDetail && optionsForRaProfiles.length > 0) {
            // Only reset if the profile ID changed or we haven't reset yet
            if (lastResetProfileIdRef.current !== id || lastResetEditModeRef.current !== editMode) {
                const initialAssociatedAttributes = mapProfileAttribute(
                    acmeProfile,
                    multipleResourceCustomAttributes,
                    Resource.Certificates,
                    'certificateAssociations.customAttributes',
                    '__attributes__certificateAssociatedAttributes__',
                );

                const initialCustomAttributes = mapProfileAttribute(
                    acmeProfile,
                    multipleResourceCustomAttributes,
                    Resource.AcmeProfiles,
                    'customAttributes',
                    '__attributes__customAcmeProfile__',
                );

                const transformedInitialAssociatedAttributes = transformAttributes(initialAssociatedAttributes ?? []);
                const transformedInitialCustomAttributes = transformAttributes(initialCustomAttributes ?? []);

                const newDefaultValues: FormValues = {
                    name: acmeProfile.name || '',
                    description: acmeProfile.description || '',
                    dnsIpAddress: acmeProfile.dnsResolverIp || '',
                    dnsPort: acmeProfile.dnsResolverPort || '',
                    retryInterval: acmeProfile.retryInterval?.toString() || '30',
                    orderValidity: acmeProfile.validity?.toString() || '36000',
                    termsUrl: acmeProfile.termsOfServiceUrl || '',
                    webSite: acmeProfile.websiteUrl || '',
                    termsChangeUrl: acmeProfile.termsOfServiceChangeUrl || '',
                    disableOrders: acmeProfile.termsOfServiceChangeDisable || false,
                    requireTermsOfService: acmeProfile.requireTermsOfService || false,
                    requireContact: acmeProfile.requireContact || false,
                    raProfile: optionsForRaProfiles.find((ra) => ra.value === acmeProfile.raProfile?.uuid)?.value || '',
                    owner: buildOwner(userOptions, acmeProfile.certificateAssociations?.ownerUuid)?.value || '',
                    groups: buildGroups(groupOptions, acmeProfile.certificateAssociations?.groupUuids) || [],
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
                    dnsIpAddress: '',
                    dnsPort: '',
                    retryInterval: '30',
                    orderValidity: '36000',
                    termsUrl: '',
                    webSite: '',
                    termsChangeUrl: '',
                    disableOrders: false,
                    requireTermsOfService: false,
                    requireContact: false,
                    raProfile: '',
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
        acmeProfile,
        id,
        reset,
        isFetchingDetail,
        optionsForRaProfiles,
        multipleResourceCustomAttributes,
        userOptions,
        groupOptions,
    ]);

    useRunOnSuccessfulFinish(isCreating, createAcmeProfileSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateAcmeProfileSucceeded, onSuccess);

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
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="name"
                                    type="text"
                                    placeholder="ACME Profile Name"
                                    disabled={editMode}
                                    label="ACME Profile Name"
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
                                <TextArea
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="description"
                                    rows={3}
                                    placeholder="Enter Description / Comment"
                                    label="Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Widget title="Challenge Configuration" noBorder>
                            <div className="space-y-4">
                                <Controller
                                    name="dnsIpAddress"
                                    control={control}
                                    rules={buildValidationRules([(value: string) => validateCustomIp(value)])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="dnsIpAddress"
                                            type="text"
                                            placeholder="Enter DNS Resolver IP address. If not provided system default will be used"
                                            label="DNS Resolver IP address"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                <Controller
                                    name="dnsPort"
                                    control={control}
                                    rules={buildValidationRules([validateInteger()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="dnsPort"
                                            type="number"
                                            placeholder="Enter DNS Resolver port number"
                                            label="DNS Resolver port number"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                                <Controller
                                    name="retryInterval"
                                    control={control}
                                    rules={buildValidationRules([validateInteger()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="retryInterval"
                                            type="number"
                                            placeholder="Enter Retry Interval"
                                            label="Retry Interval (In seconds)"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                                <Controller
                                    name="orderValidity"
                                    control={control}
                                    rules={buildValidationRules([validateInteger()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="orderValidity"
                                            type="number"
                                            placeholder="Enter Order Validity"
                                            label="Order Validity (In seconds)"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                            </div>
                        </Widget>

                        <Widget title="Terms of Service Configuration" noBorder>
                            <div className="space-y-4">
                                <Controller
                                    name="termsUrl"
                                    control={control}
                                    rules={buildValidationRules([(value: string) => validateUrlWithRoute(value)])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="termsUrl"
                                            type="text"
                                            placeholder="Enter Terms of Service URL"
                                            label="Terms of Service URL"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />
                                <Controller
                                    name="webSite"
                                    control={control}
                                    rules={buildValidationRules([(value: string) => validateUrlWithRoute(value)])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="websiteUrl"
                                            type="text"
                                            placeholder="Enter Website URL"
                                            label="Website URL"
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                {editMode && (
                                    <>
                                        <Controller
                                            name="termsChangeUrl"
                                            control={control}
                                            rules={buildValidationRules([(value: string) => validateUrlWithRoute(value)])}
                                            render={({ field, fieldState }) => (
                                                <TextInput
                                                    value={field.value}
                                                    onChange={(value) => field.onChange(value)}
                                                    onBlur={field.onBlur}
                                                    id="termsChangeUrl"
                                                    type="text"
                                                    placeholder="Enter Changes of Terms of Service URL"
                                                    label="Changes of Terms of Service URL"
                                                    invalid={fieldState.error && fieldState.isTouched}
                                                    error={getFieldErrorMessage(fieldState)}
                                                />
                                            )}
                                        />

                                        <Controller
                                            name="disableOrders"
                                            control={control}
                                            render={({ field }) => (
                                                <Checkbox
                                                    id="disableOrders"
                                                    checked={field.value ?? false}
                                                    onChange={field.onChange}
                                                    label="Disable new Orders (Changes in Terms of Service)"
                                                />
                                            )}
                                        />
                                    </>
                                )}

                                <Controller
                                    name="requireTermsOfService"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="requireTermsOfService"
                                            checked={field.value ?? false}
                                            onChange={field.onChange}
                                            label="Require agree on Terms Of Service for new account"
                                        />
                                    )}
                                />

                                <Controller
                                    name="requireContact"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="requireContact"
                                            checked={field.value ?? false}
                                            onChange={field.onChange}
                                            label="Require contact information for new Accounts"
                                        />
                                    )}
                                />
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
                                    name="raProfile"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="raProfileSelect"
                                            label="Default RA Profile"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                const next = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
                                                onRaProfileChange(next);
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
                                                        attributes={acmeProfile?.issueCertificateAttributes}
                                                        groupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                                                        setGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
                                                    />
                                                ),
                                        },
                                        {
                                            title: 'Revocation Attributes',
                                            content:
                                                !raProfile || !raProfileRevocationAttrDescs || raProfileRevocationAttrDescs.length === 0 ? (
                                                    <></>
                                                ) : (
                                                    <AttributeEditor
                                                        id="revocationAttributes"
                                                        attributeDescriptors={raProfileRevocationAttrDescs}
                                                        attributes={acmeProfile?.revokeCertificateAttributes}
                                                        groupAttributesCallbackAttributes={revokeGroupAttributesCallbackAttributes}
                                                        setGroupAttributesCallbackAttributes={setRevokeGroupAttributesCallbackAttributes}
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

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSaving} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSaving}
                                disabled={isSaving || !isValid || isEqual}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
