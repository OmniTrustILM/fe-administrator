import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Callout from 'components/Callout';
import CertificateAssociationsFormWidget from 'components/CertificateAssociationsFormWidget/CertificateAssociationsFormWidget';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextArea from 'components/TextArea';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';

import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as cryptographicKeysActions, selectors as cryptographicKeysSelectors } from 'ducks/cryptographic-keys';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as estProfileActions, selectors as estProfileSelectors } from 'ducks/est-profiles';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { actions as secretsActions, selectors as secretsSelectors } from 'ducks/secrets';
import { actions as tokenProfileActions, selectors as tokenProfileSelectors } from 'ducks/token-profiles';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel, CustomAttributeModel } from 'types/attributes';
import type { EstProfileDetailModel, EstProfileEditRequestModel, EstProfileRequestModel } from 'types/est-profiles';
import { EstAuthenticationPolicy, KeyRequestType, PlatformEnum, Resource } from 'types/openapi';
import { collectFormAttributes, mapProfileAttribute, transformAttributes } from 'utils/attributes/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import {
    buildEstProfileCreateRequest,
    buildEstProfileEditRequest,
    canExportKeyPair,
    EST_TRUSTED_CA_FILTERS,
    hasCustomResponseTiming,
    type EstProfileFormValues,
    type EstProfileRequestExtras,
    estProfileFormValues,
    showsBasicCredentialSecrets,
    showsTrustedCaCertificates,
    validateEstProfile,
} from 'utils/est-profile';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import useAttributeEditor from 'utils/widget';
import AdvancedOptions from './AdvancedOptions';
import BasicAuthSecretsField from './BasicAuthSecretsField';
import TrustedCaCertificatesField from './TrustedCaCertificatesField';

type Option = { value: string; label: string };

type FormValues = EstProfileFormValues & {
    owner: string;
    groups: Option[];
    deletedAttributes: string[];
} & Record<`__attributes__${string}`, unknown>;

type EstProfileFormProps = Readonly<{
    estProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

const ISSUANCE_ATTRIBUTES = 'issuanceAttributes';
const KEY_ATTRIBUTES = 'keyRecoveryKeyAttributes';
const CUSTOM_ATTRIBUTES = 'customEstProfile';
const ASSOCIATED_ATTRIBUTES = 'certificateAssociatedAttributes';
const CA_SEARCH_PAGE_SIZE = 1000;
const CUSTOM_ATTRIBUTE_RESOURCES = [Resource.EstProfiles, Resource.Certificates];

function formDefaults(
    profile: EstProfileDetailModel | undefined,
    customAttributes: Record<string, CustomAttributeModel[]>,
    groupOptions: Option[],
): FormValues {
    return {
        ...estProfileFormValues(profile),
        owner: profile?.certificateAssociations?.ownerUuid ?? '',
        // A bound group missing from the options (failed or partial lookup) stays selected so saving does not unbind it.
        groups: (profile?.certificateAssociations?.groupUuids ?? []).map(
            (uuid) => groupOptions.find((group) => group.value === uuid) ?? { value: uuid, label: uuid },
        ),
        deletedAttributes: [],
        ...transformAttributes(
            mapProfileAttribute(
                profile,
                customAttributes,
                Resource.Certificates,
                'certificateAssociations.customAttributes',
                `__attributes__${ASSOCIATED_ATTRIBUTES}__`,
            ) ?? [],
        ),
        ...transformAttributes(
            mapProfileAttribute(
                profile,
                customAttributes,
                Resource.EstProfiles,
                'customAttributes',
                `__attributes__${CUSTOM_ATTRIBUTES}__`,
            ) ?? [],
        ),
    };
}

// Loads what the form starts from, so the form itself is filled once and never reset under the operator.
export default function EstProfileForm({ estProfileId, onCancel, onSuccess }: EstProfileFormProps) {
    const dispatch = useDispatch();
    const editMode = !!estProfileId;

    const estProfile = useSelector(estProfileSelectors.estProfile);
    const isFetchingDetail = useSelector(estProfileSelectors.isFetchingDetail);
    const groups = useSelector(groupsSelectors.certificateGroups);
    const isFetchingGroups = useSelector(groupsSelectors.isFetchingList);
    const customAttributesSelector = useMemo(
        () => customAttributesSelectors.multipleResourceCustomAttributes(CUSTOM_ATTRIBUTE_RESOURCES),
        [],
    );
    const customAttributes = useSelector(customAttributesSelector);
    // The multi-resource load sets no fetching flag; it stores every resource it was asked for, failed ones as empty.
    const customAttributesLoaded = CUSTOM_ATTRIBUTE_RESOURCES.every((resource) => resource in customAttributes);
    // A failed lookup is stored as empty, so stored attributes without any descriptor mean the load failed.
    const customAttributesUsable =
        !editMode ||
        ((!estProfile?.customAttributes?.length || !!customAttributes[Resource.EstProfiles]?.length) &&
            (!estProfile?.certificateAssociations?.customAttributes?.length || !!customAttributes[Resource.Certificates]?.length));
    // Set once the loads below are dispatched, so the fetching flags read here are never the ones from before them.
    const [requested, setRequested] = useState(false);

    const loadCustomAttributes = useCallback(
        () =>
            dispatch(
                customAttributesActions.loadMultipleResourceCustomAttributes(
                    CUSTOM_ATTRIBUTE_RESOURCES.map((resource) => ({ resource, customAttributes: [] })),
                ),
            ),
        [dispatch],
    );

    useEffect(() => {
        loadCustomAttributes();
        dispatch(groupsActions.listGroups());
        if (estProfileId) dispatch(estProfileActions.getEstProfile({ uuid: estProfileId }));
        setRequested(true);
    }, [dispatch, estProfileId, loadCustomAttributes]);

    const fetched =
        requested && !isFetchingGroups && customAttributesLoaded && (!editMode || (!isFetchingDetail && estProfile?.uuid === estProfileId));
    const loaded = fetched && customAttributesUsable;
    // Kept once set: the form body reloads groups itself, and unmounting it then would restart its own loads forever.
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if (loaded) setReady(true);
    }, [loaded]);

    if (!ready) {
        if (fetched && !customAttributesUsable) {
            return (
                <Widget noBorder>
                    <Callout severity="danger" dataTestId="custom-attributes-load-error">
                        Custom attributes could not be loaded, so the profile cannot be edited without losing them.
                    </Callout>
                    <Button variant="outline" onClick={loadCustomAttributes} type="button">
                        Retry
                    </Button>
                </Widget>
            );
        }
        return <Widget noBorder busy />;
    }

    return (
        <EstProfileFormBody
            profile={editMode ? estProfile : undefined}
            defaults={formDefaults(
                editMode ? estProfile : undefined,
                customAttributes,
                groups.map((group) => ({ value: group.uuid, label: group.name })),
            )}
            customAttributes={customAttributes}
            onCancel={onCancel}
            onSuccess={onSuccess}
        />
    );
}

type BodyProps = Readonly<{
    profile?: EstProfileDetailModel;
    defaults: FormValues;
    customAttributes: Record<string, CustomAttributeModel[]>;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

function EstProfileFormBody({ profile, defaults, customAttributes, onCancel, onSuccess }: BodyProps) {
    const dispatch = useDispatch();
    const editMode = !!profile;

    const isCreating = useSelector(estProfileSelectors.isCreating);
    const isUpdating = useSelector(estProfileSelectors.isUpdating);
    const createSucceeded = useSelector(estProfileSelectors.createEstProfileSucceeded);
    const updateSucceeded = useSelector(estProfileSelectors.updateEstProfileSucceeded);
    const policyEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.EstAuthenticationPolicy));

    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const issuanceDescriptors = useSelector(raProfileSelectors.issuanceAttributes);
    const isFetchingRaProfiles = useSelector(raProfileSelectors.isFetchingList);
    const isFetchingIssuanceAttributes = useSelector(raProfileSelectors.isFetchingIssuanceAttributes);

    const secrets = useSelector(secretsSelectors.secretOptions);
    const isFetchingSecrets = useSelector(secretsSelectors.isFetchingSecretOptions);
    const secretsListError = useSelector(secretsSelectors.secretOptionsError);
    const caCertificates = useSelector(certificateSelectors.certificates);
    const isFetchingCaCertificates = useSelector(pagingSelectors.isFetchingList(EntityType.CERTIFICATE));

    const tokenProfiles = useSelector(tokenProfileSelectors.tokenProfiles);
    const isFetchingTokenProfiles = useSelector(tokenProfileSelectors.isFetchingList);
    const keyDescriptors = useSelector(cryptographicKeysSelectors.keyAttributeDescriptors);
    const isFetchingKeyAttributes = useSelector(cryptographicKeysSelectors.isFetchingAttributes);

    const [issueCallbackAttributes, setIssueCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [keyCallbackAttributes, setKeyCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [userOptions, setUserOptions] = useState<Option[]>([]);
    const [groupOptions, setGroupOptions] = useState<Option[]>([]);

    const methods = useForm<FormValues>({ defaultValues: defaults, mode: 'onChange' });
    const {
        control,
        handleSubmit,
        getValues,
        setValue,
        formState: { isSubmitting, isValid },
    } = methods;
    const values = useWatch({ control }) as FormValues;

    const errors = useMemo(() => validateEstProfile(values, { creating: !editMode }), [values, editMode]);

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
        dispatch(secretsActions.listSecretOptions());
        dispatch(tokenProfileActions.listTokenProfiles({ enabled: true }));
        dispatch(
            certificateActions.listCertificates({ itemsPerPage: CA_SEARCH_PAGE_SIZE, pageNumber: 1, filters: [...EST_TRUSTED_CA_FILTERS] }),
        );
    }, [dispatch]);

    // The profile's RA Profile is listed only for an operator who may read it; the profile carries it either way.
    const raProfile = useMemo(
        () =>
            raProfiles.find((candidate) => candidate.uuid === values.raProfileUuid) ??
            (profile?.raProfile?.uuid === values.raProfileUuid ? profile?.raProfile : undefined),
        [raProfiles, values.raProfileUuid, profile],
    );

    useEffect(() => {
        if (raProfile?.authorityInstanceUuid) {
            dispatch(
                raProfileActions.listIssuanceAttributeDescriptors({ authorityUuid: raProfile.authorityInstanceUuid, uuid: raProfile.uuid }),
            );
        } else {
            dispatch(raProfileActions.clearIssuanceAttributesDescriptors());
        }
    }, [dispatch, raProfile?.authorityInstanceUuid, raProfile?.uuid]);

    const keyRecoveryOn = values.serverKeyGeneration && values.keyRecovery;
    const tokenProfile = useMemo(
        () => tokenProfiles.find((candidate) => candidate.uuid === values.keyRecoveryTokenProfileUuid),
        [tokenProfiles, values.keyRecoveryTokenProfileUuid],
    );
    const loadedTokenProfileSelector = useMemo(() => tokenProfileSelectors.loadedTokenProfile(tokenProfile?.uuid), [tokenProfile?.uuid]);
    const tokenProfileDetail = useSelector(loadedTokenProfileSelector);
    const tokenProfileCannotExport = keyRecoveryOn && !!tokenProfileDetail && !canExportKeyPair(tokenProfileDetail);

    useEffect(() => {
        dispatch(cryptographicKeysActions.clearKeyAttributeDescriptors());
        if (!keyRecoveryOn || !tokenProfile) return;
        const target = { tokenInstanceUuid: tokenProfile.tokenInstanceUuid, uuid: tokenProfile.uuid };
        dispatch(tokenProfileActions.getTokenProfileDetail({ ...target, skipWidgetLock: true }));
        dispatch(
            cryptographicKeysActions.listAttributeDescriptors({
                tokenInstanceUuid: target.tokenInstanceUuid,
                tokenProfileUuid: target.uuid,
                keyRequestType: KeyRequestType.KeyPair,
            }),
        );
    }, [dispatch, keyRecoveryOn, tokenProfile]);

    const clearAttributeValues = useCallback(
        (id: string) => {
            for (const key of Object.keys(getValues())) {
                if (key.startsWith(`__attributes__${id}__`)) setValue(key as `__attributes__${string}`, undefined);
            }
        },
        [getValues, setValue],
    );

    const onRaProfileChange = useCallback(() => {
        dispatch(connectorActions.clearCallbackData());
        setIssueCallbackAttributes([]);
        clearAttributeValues(ISSUANCE_ATTRIBUTES);
    }, [dispatch, clearAttributeValues]);

    const onTokenProfileChange = useCallback(() => {
        dispatch(connectorActions.clearCallbackData());
        setKeyCallbackAttributes([]);
        clearAttributeValues(KEY_ATTRIBUTES);
    }, [dispatch, clearAttributeValues]);

    const onSubmit = useCallback(
        (submitted: FormValues) => {
            const extras = {
                issueCertificateAttributes: collectFormAttributes(
                    ISSUANCE_ATTRIBUTES,
                    [...(issuanceDescriptors ?? []), ...issueCallbackAttributes],
                    submitted,
                ),
                keyRecoveryKeyAttributes: collectFormAttributes(
                    KEY_ATTRIBUTES,
                    [...(keyDescriptors ?? []), ...keyCallbackAttributes],
                    submitted,
                ),
                customAttributes: collectFormAttributes(CUSTOM_ATTRIBUTES, customAttributes[Resource.EstProfiles], submitted),
                certificateAssociations: {
                    ownerUuid: submitted.owner || undefined,
                    groupUuids: (submitted.groups ?? []).map((group) => group.value),
                    customAttributes: collectFormAttributes(ASSOCIATED_ATTRIBUTES, customAttributes[Resource.Certificates], submitted),
                },
            } as EstProfileRequestExtras;
            if (profile) {
                const updateEstRequest = buildEstProfileEditRequest(submitted, extras) as EstProfileEditRequestModel;
                dispatch(estProfileActions.updateEstProfile({ uuid: profile.uuid, updateEstRequest }));
            } else {
                dispatch(estProfileActions.createEstProfile(buildEstProfileCreateRequest(submitted, extras) as EstProfileRequestModel));
            }
        },
        [dispatch, profile, issuanceDescriptors, issueCallbackAttributes, keyDescriptors, keyCallbackAttributes, customAttributes],
    );

    const renderCustomAttributeEditor = useAttributeEditor({
        isLoading: false,
        id: CUSTOM_ATTRIBUTES,
        resourceKey: Resource.EstProfiles,
        attributes: profile?.customAttributes,
        multipleResourceCustomAttributes: customAttributes,
        withRemoveAction: true,
    });

    const renderAssociatedAttributeEditor = useAttributeEditor({
        isLoading: false,
        id: ASSOCIATED_ATTRIBUTES,
        resourceKey: Resource.Certificates,
        attributes: profile?.certificateAssociations?.customAttributes,
        multipleResourceCustomAttributes: customAttributes,
        withRemoveAction: true,
    });

    useRunOnSuccessfulFinish(isCreating, createSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateSucceeded, onSuccess);

    const raProfileOptions = useMemo(() => raProfiles.map((candidate) => ({ value: candidate.uuid, label: candidate.name })), [raProfiles]);
    const policyOptions = useMemo(
        () => Object.values(EstAuthenticationPolicy).map((policy) => ({ value: policy, label: getEnumLabel(policyEnum, policy) })),
        [policyEnum],
    );
    const tokenProfileOptions = useMemo(
        () =>
            tokenProfiles.map((candidate) => ({ value: candidate.uuid, label: candidate.name, description: candidate.tokenInstanceName })),
        [tokenProfiles],
    );

    // Bound attributes apply only while the RA Profile or token profile they were set for is still selected.
    const issueAttributes = values.raProfileUuid === profile?.raProfile?.uuid ? profile?.issueCertificateAttributes : undefined;
    const keyAttributes =
        values.keyRecoveryTokenProfileUuid === profile?.keyRecoveryTokenProfile?.uuid ? profile?.keyRecoveryKeyAttributes : undefined;

    const isSaving = isSubmitting || isCreating || isUpdating;
    // Attribute editors render only once their descriptors arrive; key descriptors wait for the token profile list.
    const isLoadingAttributes = isFetchingTokenProfiles || isFetchingIssuanceAttributes || isFetchingKeyAttributes;
    // Bound key attributes without any descriptor mean the descriptor load failed; saving would drop them.
    const keyDescriptorsMissing =
        !!keyRecoveryOn && !!keyAttributes?.length && !isFetchingKeyAttributes && !(keyDescriptors && keyDescriptors.length > 0);
    const hasErrors = Object.keys(errors).length > 0 || tokenProfileCannotExport || keyDescriptorsMissing;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules(editMode ? [] : [validateRequired(), validateAlphaNumericWithoutAccents()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    id="name"
                                    type="text"
                                    placeholder="EST Profile Name"
                                    label="EST Profile Name"
                                    disabled={editMode}
                                    required
                                    invalid={(fieldState.error && fieldState.isTouched) || !!errors.name}
                                    error={getFieldErrorMessage(fieldState) ?? errors.name}
                                />
                            )}
                        />
                        <p className="text-sm text-content-subtle">
                            The name is the profile's label in EST URLs and cannot be changed later.
                        </p>
                        <Controller
                            name="description"
                            control={control}
                            rules={buildValidationRules([validateLength(0, 300)])}
                            render={({ field, fieldState }) => (
                                <TextArea
                                    value={field.value}
                                    onChange={field.onChange}
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
                        <Controller
                            name="systemDefault"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    id="systemDefault"
                                    label="System default: serve requests sent without a label"
                                    checked={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />

                        <Widget title="Client Authentication" noBorder busy={isFetchingSecrets || isFetchingCaCertificates}>
                            <div className="space-y-4">
                                <Controller
                                    name="authenticationPolicy"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="authenticationPolicy"
                                            label="Authentication Policy"
                                            required
                                            value={field.value ?? null}
                                            onChange={(value) => field.onChange(value ?? undefined)}
                                            options={policyOptions}
                                            placeholder="Select how clients authenticate"
                                        />
                                    )}
                                />
                                {showsBasicCredentialSecrets(values.authenticationPolicy) && (
                                    <Controller
                                        name="basicCredentialSecretUuids"
                                        control={control}
                                        render={({ field }) => (
                                            <BasicAuthSecretsField
                                                value={field.value}
                                                onChange={field.onChange}
                                                secrets={secrets}
                                                bound={profile?.basicCredentialSecrets}
                                                listError={secretsListError}
                                                error={errors.basicCredentialSecretUuids}
                                            />
                                        )}
                                    />
                                )}
                                {showsTrustedCaCertificates(values.authenticationPolicy) && (
                                    <Controller
                                        name="trustedCaCertificateUuids"
                                        control={control}
                                        render={({ field }) => (
                                            <TrustedCaCertificatesField
                                                value={field.value}
                                                onChange={field.onChange}
                                                caCertificates={caCertificates}
                                                bound={profile?.trustedCaCertificates}
                                                error={errors.trustedCaCertificateUuids}
                                            />
                                        )}
                                    />
                                )}
                            </div>
                        </Widget>

                        <Widget title="Reenrollment" noBorder>
                            <div className="space-y-4">
                                <Controller
                                    name="allowRenewal"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="allowRenewal"
                                            label="Allow renewal with the current key"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <Controller
                                    name="allowRekey"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="allowRekey"
                                            label="Allow rekey with a new key"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                <Controller
                                    name="renewalThreshold"
                                    control={control}
                                    render={({ field }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            id="renewalThreshold"
                                            type="number"
                                            label="Renewal threshold (days before expiry)"
                                            placeholder="Empty or 0 allows reenrollment from half of the certificate validity"
                                            invalid={!!errors.renewalThreshold}
                                            error={errors.renewalThreshold}
                                        />
                                    )}
                                />
                            </div>
                        </Widget>

                        <Widget title="Server Key Generation" noBorder busy={isFetchingTokenProfiles || isFetchingKeyAttributes}>
                            <div className="space-y-4">
                                <Controller
                                    name="serverKeyGeneration"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="serverKeyGeneration"
                                            label="Allow server-side key generation"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                {values.serverKeyGeneration && (
                                    <>
                                        <Callout severity="warning" dataTestId="server-key-generation-warning">
                                            The server generates the client's private key and sends it in the response. Allow it only for
                                            clients that cannot generate keys themselves.
                                        </Callout>
                                        <Controller
                                            name="keyRecovery"
                                            control={control}
                                            render={({ field }) => (
                                                <Switch
                                                    id="keyRecovery"
                                                    label="Keep generated keys for recovery"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </>
                                )}
                                {keyRecoveryOn && (
                                    <>
                                        <Callout severity="warning" dataTestId="key-recovery-warning">
                                            Every generated private key is kept on the token profile below, linked to its certificate.
                                            Anyone who can export keys from that token can recover them.
                                        </Callout>
                                        <Controller
                                            name="keyRecoveryTokenProfileUuid"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    id="keyRecoveryTokenProfile"
                                                    label="Key Recovery Token Profile"
                                                    required
                                                    value={field.value || null}
                                                    onChange={(value) => {
                                                        field.onChange(typeof value === 'string' ? value : '');
                                                        onTokenProfileChange();
                                                    }}
                                                    options={tokenProfileOptions}
                                                    placeholder="Select a token profile that can export key pairs"
                                                    error={
                                                        tokenProfileCannotExport
                                                            ? 'This token profile cannot export key pairs.'
                                                            : errors.keyRecoveryTokenProfileUuid
                                                    }
                                                    showOptionDescriptionInDropdown
                                                />
                                            )}
                                        />
                                        {tokenProfile && (
                                            <>
                                                <p className="text-sm text-content-subtle" data-testid="key-recovery-naming-hint">
                                                    Leave per-key name, alias or label fields empty; the connector names each key.
                                                </p>
                                                {keyDescriptorsMissing && (
                                                    <Callout severity="danger" dataTestId="key-descriptors-load-error">
                                                        The key attributes could not be loaded. Reselect the token profile to retry.
                                                    </Callout>
                                                )}
                                                {keyDescriptors && keyDescriptors.length > 0 && (
                                                    <AttributeEditor
                                                        key={tokenProfile.uuid}
                                                        id={KEY_ATTRIBUTES}
                                                        callbackParentUuid={tokenProfile.uuid}
                                                        callbackResource={Resource.Keys}
                                                        attributeDescriptors={keyDescriptors}
                                                        attributes={keyAttributes}
                                                        groupAttributesCallbackAttributes={keyCallbackAttributes}
                                                        setGroupAttributesCallbackAttributes={setKeyCallbackAttributes}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </Widget>

                        <Widget title="RA Profile Configuration" busy={isFetchingRaProfiles || isFetchingIssuanceAttributes}>
                            <div className="space-y-4">
                                <Controller
                                    name="raProfileUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="raProfileSelect"
                                            label="Default RA Profile"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(typeof value === 'string' ? value : '');
                                                onRaProfileChange();
                                            }}
                                            options={raProfileOptions}
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
                                                raProfile && issuanceDescriptors && issuanceDescriptors.length > 0 ? (
                                                    <AttributeEditor
                                                        key={raProfile.uuid}
                                                        id={ISSUANCE_ATTRIBUTES}
                                                        attributeDescriptors={issuanceDescriptors}
                                                        attributes={issueAttributes}
                                                        groupAttributesCallbackAttributes={issueCallbackAttributes}
                                                        setGroupAttributesCallbackAttributes={setIssueCallbackAttributes}
                                                    />
                                                ) : (
                                                    <></>
                                                ),
                                        },
                                        { title: 'Custom Attributes', content: renderCustomAttributeEditor },
                                    ]}
                                />
                            </div>
                        </Widget>

                        <CertificateAssociationsFormWidget
                            renderCustomAttributes={renderAssociatedAttributeEditor}
                            userOptions={userOptions}
                            groupOptions={groupOptions}
                            setUserOptions={setUserOptions}
                            setGroupOptions={setGroupOptions}
                        />

                        <AdvancedOptions
                            errors={errors}
                            serverKeyGeneration={values.serverKeyGeneration}
                            initiallyExpanded={editMode && hasCustomResponseTiming(defaults)}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSaving} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSaving}
                                disabled={isSaving || !isValid || hasErrors || isLoadingAttributes}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
