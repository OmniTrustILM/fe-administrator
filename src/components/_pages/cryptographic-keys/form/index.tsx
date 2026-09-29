import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import RetryCallout from 'components/RetryCallout';
import ImportWizard from 'components/_pages/certificates/ImportWizard';

import Widget from 'components/Widget';
import type { AppState } from 'ducks';
import { selectors as authSelectors } from 'ducks/auth';
import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';

import { selectors as certificatesSelectors } from 'ducks/certificates';
import { actions as cryptographicKeysActions, selectors as cryptographicKeysSelectors } from 'ducks/cryptographic-keys';
import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, type Path, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import { actions as userInterfaceActions } from '../../../../ducks/user-interface';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { selectors as enumSelectors, getEnumLabel, getEnumDescription } from 'ducks/enums';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { type KeyRequestType, PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import Container from 'components/Container';
import Button from 'components/Button';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { hasResourceAction } from 'utils/permissions';

const EXPORTABLE_HINT_FOR_REQUEST =
    'Required to download the certificate with its private key (PKCS12) after issuance. Cannot be enabled later.';
const EXPORTABLE_HINT =
    'Can be exported later by users holding the key export permission. Off by default, and cannot be switched on later.';
const GENERATE_TAB = 0;

type CryptographicKeyFormProps = Readonly<{
    usesGlobalModal?: boolean;
    keyId?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}>;

interface SelectChangeValue {
    value: string;
    label: string;
}
interface FormValues {
    name: string;
    description: string;
    tokenProfile: string | undefined;
    type?: string;
    selectedGroups: SelectChangeValue[];
    owner?: string;
    exportable?: boolean;
}

export default function CryptographicKeyForm({ keyId, onSuccess, onCancel, usesGlobalModal = false }: CryptographicKeyFormProps) {
    const dispatch = useDispatch();
    const store = useStore<AppState>();

    const { id: routeId, tokenId } = useParams();
    const id = keyId ?? (usesGlobalModal ? undefined : routeId);

    const editMode = useMemo(() => !!id, [id]);

    const keyDetail = useSelector(cryptographicKeysSelectors.cryptographicKey);

    const groups = useSelector(groupSelectors.certificateGroups);
    const users = useSelector(userSelectors.users);
    const auth = useSelector(authSelectors.profile);
    const keyRequestTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyRequestType));
    const supportedKeyRequestTypes = useSelector(cryptographicKeysSelectors.supportedKeyRequestTypes);
    const isFetchingSupportedKeyRequestTypes = useSelector(cryptographicKeysSelectors.isFetchingSupportedKeyRequestTypes);

    const tokenProfiles = useSelector(tokenProfilesSelectors.tokenProfiles);
    const cryptographicKeyAttributeDescriptors = useSelector(cryptographicKeysSelectors.keyAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isFetchingCryptographicKeyAttributes = useSelector(tokenProfilesSelectors.isFetchingAttributes);

    const isFetchingDetail = useSelector(cryptographicKeysSelectors.isFetchingDetail);
    const isCreating = useSelector(cryptographicKeysSelectors.isCreating);
    const isUpdating = useSelector(cryptographicKeysSelectors.isUpdating);
    const createCryptographicKeySucceeded = useSelector(cryptographicKeysSelectors.createCryptographicKeySucceeded);
    const updateCryptographicKeySucceeded = useSelector(cryptographicKeysSelectors.updateCryptographicKeySucceeded);
    const isImporting = useSelector(certificatesSelectors.isImporting);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [tokenProfile, setTokenProfile] = useState<TokenProfileResponseModel>();
    const [activeTab, setActiveTab] = useState(GENERATE_TAB);
    const shownTab = useRef(activeTab);

    useEffect(() => {
        if (!editMode && tokenProfile) {
            dispatch(
                cryptographicKeysActions.listSupportedKeyRequestTypes({
                    tokenInstanceUuid: tokenProfile.tokenInstanceUuid,
                    tokenProfileUuid: tokenProfile.uuid,
                }),
            );
        }
        return () => {
            dispatch(cryptographicKeysActions.clearSupportedKeyRequestTypes());
        };
    }, [dispatch, editMode, tokenProfile]);

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingCryptographicKeyAttributes || isFetchingResourceCustomAttributes,
        [isCreating, isFetchingDetail, isUpdating, isFetchingCryptographicKeyAttributes, isFetchingResourceCustomAttributes],
    );

    useEffect(() => {
        dispatch(cryptographicKeysActions.clearKeyAttributeDescriptors());
        setGroupAttributesCallbackAttributes([]);
        dispatch(tokenProfilesActions.listTokenProfiles({}));
        dispatch(connectorActions.clearCallbackData());
        dispatch(groupActions.listGroups());
        if (editMode && id) {
            dispatch(userActions.list());
            dispatch(cryptographicKeysActions.getCryptographicKeyDetail({ uuid: id }));
        }
    }, [dispatch, editMode, id, tokenId]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Keys));
    }, [dispatch]);

    const loadProfileDetail = useCallback(
        (profile: TokenProfileResponseModel) =>
            dispatch(
                tokenProfilesActions.getTokenProfileDetail({
                    tokenInstanceUuid: profile.tokenInstanceUuid,
                    uuid: profile.uuid,
                    skipWidgetLock: true,
                }),
            ),
        [dispatch],
    );

    const onTokenProfileChange = useCallback(
        (tokenProfileUuid: string | undefined) => {
            if (!tokenProfileUuid) return;
            dispatch(cryptographicKeysActions.clearKeyAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);

            if (!tokenProfiles) return;
            const provider = tokenProfiles.find((p) => p.uuid === tokenProfileUuid);

            if (!provider) return;
            setTokenProfile(provider);
            if (!editMode) loadProfileDetail(provider);
        },
        [dispatch, editMode, tokenProfiles, loadProfileDetail],
    );

    // The Import material tab loads its own profile's detail into the one detail this form reads, so Generate new asks
    // again for its profile's when it is shown. The store is read here rather than depended on, so that a request that
    // keeps failing is sent once per showing, never in a loop. A request for another profile empties the detail, so a
    // request running while it holds this profile's is for this profile.
    useEffect(() => {
        if (shownTab.current === activeTab) return;
        shownTab.current = activeTab;
        if (activeTab !== GENERATE_TAB || !tokenProfile) return;
        const state = store.getState();
        const loading =
            tokenProfilesSelectors.isFetchingDetail(state) && tokenProfilesSelectors.tokenProfile(state)?.uuid === tokenProfile.uuid;
        if (!loading && !tokenProfilesSelectors.loadedTokenProfile(tokenProfile.uuid)(state)) loadProfileDetail(tokenProfile);
    }, [activeTab, tokenProfile, store, loadProfileDetail]);

    const optionsForKeys = useMemo(
        () =>
            tokenProfiles
                .filter((token) => token.enabled)
                .map((token) => ({
                    value: token.uuid,
                    label: token.name,
                })),
        [tokenProfiles],
    );

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

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? keyDetail?.name || '' : '',
            description: editMode ? keyDetail?.description || '' : '',
            tokenProfile: editMode ? keyDetail?.tokenProfileUuid || undefined : undefined,
            selectedGroups: editMode ? (keyDetail?.groups?.map((group) => ({ value: group.uuid, label: group.name })) ?? []) : [],
            owner: editMode ? keyDetail?.ownerUuid || undefined : undefined,
            type: undefined,
            exportable: false,
        }),
        [editMode, keyDetail],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        setValue,
        getValues,
        reset,
    } = methods;

    const watchedTokenProfileUuid = useWatch({
        control,
        name: 'tokenProfile',
    });

    const watchedType = useWatch({
        control,
        name: 'type',
    });

    const tokenProfileDetail = useSelector(tokenProfilesSelectors.loadedTokenProfile(watchedTokenProfileUuid));
    const profileDetailError = useSelector(tokenProfilesSelectors.detailError);
    // Exportable cannot be switched on later, so Create waits while the chosen profile's detail, which offers it, loads.
    const awaitingProfileDetail = useSelector(tokenProfilesSelectors.isFetchingDetail) && !editMode;

    const showExportable = !!watchedType && !!tokenProfileDetail?.keyTransfer?.exportableKeyTypes?.[watchedType]?.length;

    useEffect(() => {
        if (!showExportable) setValue('exportable', false);
    }, [showExportable, setValue]);

    const onKeyTypeChange = useCallback(
        (type: KeyRequestType) => {
            if (editMode) return;
            if (!tokenProfile) return;
            if (!type) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            setValue('exportable', false);
            // Clear attributes that start with __attributes__cryptographicKey__
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith('__attributes__cryptographicKey__')) {
                    setValue(key as Path<FormValues>, undefined);
                }
            });
            dispatch(cryptographicKeysActions.clearKeyAttributeDescriptors());
            dispatch(
                cryptographicKeysActions.listAttributeDescriptors({
                    tokenInstanceUuid: tokenProfile.tokenInstanceUuid,
                    tokenProfileUuid: tokenProfile.uuid,
                    keyRequestType: type,
                }),
            );
        },
        [dispatch, editMode, tokenProfile, getValues, setValue],
    );

    const onCancelClick = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            dispatch(userInterfaceActions.resetState());
        }
    }, [dispatch, onCancel]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    cryptographicKeysActions.updateCryptographicKey({
                        profileUuid: id!,
                        cryptographicKeyEditRequest: {
                            description: values.description || '',
                            tokenProfileUuid: values.tokenProfile || undefined,
                            ownerUuid: values.owner || undefined,
                            groupUuids: values?.selectedGroups?.length ? values?.selectedGroups?.map((group) => group.value) : [],
                            customAttributes: collectFormAttributes('customCryptographicKey', resourceCustomAttributes, values),
                            name: values.name,
                        },
                    }),
                );
            } else {
                const selectedTokenProfile = tokenProfiles.find((p) => p.uuid === values.tokenProfile);
                if (!selectedTokenProfile || !values.type) return;

                dispatch(
                    cryptographicKeysActions.createCryptographicKey({
                        tokenInstanceUuid: selectedTokenProfile.tokenInstanceUuid,
                        tokenProfileUuid: selectedTokenProfile.uuid,
                        type: values.type as KeyRequestType,
                        cryptographicKeyAddRequest: {
                            groupUuids: values?.selectedGroups?.length ? values?.selectedGroups?.map((group) => group.value) : [],
                            name: values.name,
                            description: values.description || '',
                            attributes: collectFormAttributes(
                                'cryptographicKey',
                                [...(cryptographicKeyAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customCryptographicKey', resourceCustomAttributes, values),
                            exportable: showExportable && !!values.exportable,
                        },
                        usesGlobalModal: usesGlobalModal,
                    }),
                );
            }
        },
        [
            dispatch,
            editMode,
            id,
            cryptographicKeyAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceCustomAttributes,
            tokenProfiles,
            usesGlobalModal,
            showExportable,
        ],
    );

    const handleCreateSuccess = useCallback(() => {
        if (!editMode) onSuccess?.();
    }, [editMode, onSuccess]);

    const handleUpdateSuccess = useCallback(() => {
        if (editMode) onSuccess?.();
    }, [editMode, onSuccess]);

    useRunOnSuccessfulFinish(isCreating, createCryptographicKeySucceeded, handleCreateSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateCryptographicKeySucceeded, handleUpdateSuccess);

    const optionsForType = () => {
        const options: { value: string; label: string; description?: string }[] = [];
        for (const type of supportedKeyRequestTypes) {
            options.push({
                value: type,
                label: getEnumLabel(keyRequestTypeEnum, type),
                description: getEnumDescription(keyRequestTypeEnum, type),
            });
        }
        return options;
    };

    const attributeTabs = (tokenProfileUuid: string | undefined) => {
        if (editMode) {
            return [
                {
                    title: 'Custom Attributes',
                    content: (
                        <AttributeEditor
                            id="customCryptographicKey"
                            attributeDescriptors={resourceCustomAttributes}
                            attributes={keyDetail?.customAttributes}
                        />
                    ),
                },
            ];
        }
        return [
            {
                title: 'Connector Attributes',
                content: cryptographicKeyAttributeDescriptors ? (
                    <AttributeEditor
                        id="cryptographicKey"
                        callbackParentUuid={tokenProfileUuid || ''}
                        callbackResource={Resource.Keys}
                        attributeDescriptors={cryptographicKeyAttributeDescriptors || []}
                        groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                        setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                    />
                ) : (
                    <></>
                ),
            },
            {
                title: 'Custom Attributes',
                content: (
                    <AttributeEditor
                        id="customCryptographicKey"
                        attributeDescriptors={resourceCustomAttributes}
                        attributes={keyDetail?.customAttributes}
                    />
                ),
            },
        ];
    };

    // Reset form values when keyDetail is loaded in edit mode
    useEffect(() => {
        if (editMode && keyDetail && keyDetail.uuid === id) {
            const newDefaultValues: FormValues = {
                name: keyDetail.name || '',
                description: keyDetail.description || '',
                tokenProfile: keyDetail.tokenProfileUuid || undefined,
                selectedGroups: keyDetail.groups?.length ? keyDetail.groups.map((group) => ({ value: group.uuid, label: group.name })) : [],
                owner: keyDetail.ownerUuid || undefined,
                type: undefined,
                exportable: false,
            };
            reset(newDefaultValues);

            // Set token profile state if available
            if (keyDetail.tokenProfileUuid && tokenProfiles.length > 0) {
                const profile = tokenProfiles.find((p) => p.uuid === keyDetail.tokenProfileUuid);
                if (profile) {
                    setTokenProfile(profile);
                }
            }
        }
    }, [editMode, keyDetail, id, reset, tokenProfiles]);

    // Clear attributes when token profile changes
    useEffect(() => {
        if (watchedTokenProfileUuid) {
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith('__attributes__cryptographicKey__')) {
                    setValue(key as Path<FormValues>, undefined);
                }
            });
            setValue('type', undefined);
            setValue('exportable', false);
            onTokenProfileChange(watchedTokenProfileUuid);
        }
    }, [watchedTokenProfileUuid, setValue, getValues, onTokenProfileChange]);

    const generateNewForm = (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                    name="name"
                    control={control}
                    rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...field}
                            id="name"
                            type="text"
                            label="Key Name"
                            required
                            placeholder="Enter Key Name"
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
                            rows={4}
                            placeholder="Enter Description / Comment"
                            invalid={fieldState.error && fieldState.isTouched}
                            error={getFieldErrorMessage(fieldState)}
                        />
                    )}
                />

                {editMode ? (
                    <Controller
                        name="owner"
                        control={control}
                        rules={buildValidationRules([validateAlphaNumericWithSpecialChars()])}
                        render={({ field, fieldState }) => (
                            <>
                                <Select
                                    id="ownerSelect"
                                    label="Owner"
                                    value={field.value || ''}
                                    onChange={(value) => {
                                        field.onChange(value);
                                    }}
                                    options={optionsForUsers}
                                    placeholder="Select Owner"
                                    placement="bottom"
                                    isDisabled={false}
                                />
                                {fieldState.error && fieldState.isTouched && (
                                    <p className="mt-1 text-sm text-danger">
                                        {typeof fieldState.error === 'string'
                                            ? fieldState.error
                                            : fieldState.error?.message || 'Invalid value'}
                                    </p>
                                )}
                            </>
                        )}
                    />
                ) : (
                    <TextInput
                        id="owner"
                        type="text"
                        label="Owner"
                        placeholder="Enter Key Owner"
                        disabled
                        value={auth?.username || ''}
                        onChange={() => {}}
                    />
                )}

                <Controller
                    name="selectedGroups"
                    control={control}
                    render={({ field, fieldState }) => (
                        <>
                            <Select
                                id="selectedGroupsSelect"
                                label="Groups"
                                value={field.value || []}
                                onChange={(value) => {
                                    field.onChange(value);
                                }}
                                options={optionsForGroups}
                                placeholder="Select Groups"
                                isMulti
                                placement="bottom"
                            />
                            {fieldState.error && fieldState.isTouched && (
                                <p className="mt-1 text-sm text-danger">
                                    {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message || 'Invalid value'}
                                </p>
                            )}
                        </>
                    )}
                />

                <Controller
                    name="tokenProfile"
                    control={control}
                    rules={editMode ? undefined : buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <>
                            <div>
                                <label htmlFor="tokenProfileSelect" className="block text-sm font-medium mb-2 text-content">
                                    Token Profile {!editMode && <span className="text-danger">*</span>}
                                </label>
                                <Select
                                    id="tokenProfileSelect"
                                    value={field.value || ''}
                                    onChange={(value) => {
                                        if (value === field.value) return;

                                        const formValues = getValues();
                                        Object.keys(formValues).forEach((key) => {
                                            if (key.startsWith('__attributes__cryptographicKey__')) {
                                                setValue(key as Path<FormValues>, undefined);
                                            }
                                        });
                                        setValue('type', undefined);
                                        dispatch(cryptographicKeysActions.clearSupportedKeyRequestTypes());
                                        setTokenProfile(undefined);
                                        field.onChange(value);
                                    }}
                                    options={optionsForKeys}
                                    placeholder="Select Token Profile"
                                    placement="bottom"
                                    isDisabled={editMode}
                                />
                            </div>
                            {fieldState.error && fieldState.isTouched && (
                                <p className="mt-1 text-sm text-danger">
                                    {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message || 'Invalid value'}
                                </p>
                            )}
                        </>
                    )}
                />

                {tokenProfile && !editMode && (
                    <Controller
                        name="type"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <>
                                <div>
                                    <label htmlFor="typeSelect" className="block text-sm font-medium mb-2 text-content">
                                        Select Key Type <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        id="typeSelect"
                                        value={field.value || ''}
                                        onChange={(value) => {
                                            onKeyTypeChange(value as KeyRequestType);
                                            field.onChange(value);
                                        }}
                                        options={optionsForType()}
                                        isDisabled={isFetchingSupportedKeyRequestTypes}
                                        placeholder="Select to change Key Type"
                                        placement="bottom"
                                        showOptionDescriptionInDropdown
                                        showSelectedDescriptionAsHelp
                                    />
                                </div>
                                {fieldState.error && fieldState.isTouched && (
                                    <p className="mt-1 text-sm text-danger">
                                        {typeof fieldState.error === 'string'
                                            ? fieldState.error
                                            : fieldState.error?.message || 'Invalid value'}
                                    </p>
                                )}
                            </>
                        )}
                    />
                )}

                {!editMode && tokenProfile && profileDetailError && (
                    <RetryCallout message={profileDetailError} onRetry={() => loadProfileDetail(tokenProfile)} />
                )}

                {showExportable && (
                    <Controller
                        name="exportable"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <Switch
                                    id="exportable"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    secondaryLabel="Exportable"
                                    ariaDescribedBy="exportable-hint"
                                />
                                <p id="exportable-hint" className="ml-16 text-sm text-content-muted">
                                    {usesGlobalModal ? EXPORTABLE_HINT_FOR_REQUEST : EXPORTABLE_HINT}
                                </p>
                            </div>
                        )}
                    />
                )}

                <TabLayout tabs={attributeTabs(watchedTokenProfileUuid)} noBorder onlyActiveTabContent={false} />

                <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                    <Button variant="outline" onClick={onCancelClick} disabled={isSubmitting} type="button">
                        Cancel
                    </Button>
                    <ProgressButton
                        title={editMode ? 'Update' : 'Create'}
                        inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                        inProgress={isSubmitting}
                        disabled={!isDirty || isSubmitting || !isValid || awaitingProfileDetail}
                        type="submit"
                    />
                </Container>
            </form>
        </FormProvider>
    );

    const offersImport = !editMode && !usesGlobalModal && hasResourceAction(auth, Resource.Keys, ResourceAction.ImportKey);

    return (
        <Widget noBorder busy={isBusy}>
            {offersImport ? (
                <TabLayout
                    noBorder
                    onTabChange={setActiveTab}
                    tabs={[
                        // Leaving the import while it runs would drop its results, so the other tab waits for it.
                        { title: 'Generate new', content: generateNewForm, disabled: isImporting },
                        {
                            title: 'Import material',
                            content: (
                                <ImportWizard
                                    presetTokenProfileUuid={tokenProfile?.uuid}
                                    showCertificateCustomAttributes={false}
                                    onCancel={onCancelClick}
                                    onDone={handleCreateSuccess}
                                />
                            ),
                        },
                    ]}
                />
            ) : (
                generateNewForm
            )}
        </Widget>
    );
}
