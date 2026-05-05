import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';
import { selectors as authSelectors } from 'ducks/auth';
import { actions as groupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';

import { actions as cryptographicKeysActions, selectors as cryptographicKeysSelectors } from 'ducks/cryptographic-keys';
import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import { actions as userInterfaceActions } from '../../../../ducks/user-interface';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { KeyRequestType, PlatformEnum, Resource } from '../../../../types/openapi';
import Container from 'components/Container';
import Button from 'components/Button';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

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
}

export default function CryptographicKeyForm({ keyId, onSuccess, onCancel, usesGlobalModal = false }: CryptographicKeyFormProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id: routeId, tokenId } = useParams();
    const id = keyId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const keyDetail = useSelector(cryptographicKeysSelectors.cryptographicKey);

    const groups = useSelector(groupSelectors.certificateGroups);
    const users = useSelector(userSelectors.users);
    const auth = useSelector(authSelectors.profile);
    const keyRequestTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyRequestType));

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

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [tokenProfile, setTokenProfile] = useState<TokenProfileResponseModel>();

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
        },
        [dispatch, tokenProfiles],
    );

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

    const onKeyTypeChange = useCallback(
        (type: KeyRequestType) => {
            if (editMode) return;
            if (!tokenProfile) return;
            if (!type) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            // Clear attributes that start with __attributes__cryptographicKey__
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith('__attributes__cryptographicKey__')) {
                    (setValue as any)(key, undefined);
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
        const options: { value: string; label: string }[] = [];
        for (const key in KeyRequestType) {
            options.push({
                value: KeyRequestType[key as keyof typeof KeyRequestType],
                label: getEnumLabel(keyRequestTypeEnum, KeyRequestType[key as keyof typeof KeyRequestType]),
            });
        }
        return options;
    };

    const attributeTabs = (tokenProfileUuid: string | undefined) => {
        if (!editMode) {
            return [
                {
                    title: 'Connector Attributes',
                    content: cryptographicKeyAttributeDescriptors ? (
                        <AttributeEditor
                            id="cryptographicKey"
                            callbackParentUuid={keyDetail?.tokenProfileUuid || tokenProfileUuid || ''}
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
        } else {
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
                    (setValue as any)(key, undefined);
                }
            });
            setValue('type', undefined);
            onTokenProfileChange(watchedTokenProfileUuid);
        }
    }, [watchedTokenProfileUuid, setValue, getValues, onTokenProfileChange]);

    return (
        <Widget noBorder busy={isBusy}>
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
                                        <p className="mt-1 text-sm text-red-600">
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
                                    <p className="mt-1 text-sm text-red-600">
                                        {typeof fieldState.error === 'string'
                                            ? fieldState.error
                                            : fieldState.error?.message || 'Invalid value'}
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
                                    <label
                                        htmlFor="tokenProfileSelect"
                                        className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                    >
                                        Token Profile {!editMode && <span className="text-red-500">*</span>}
                                    </label>
                                    <Select
                                        id="tokenProfileSelect"
                                        value={field.value || ''}
                                        onChange={(value) => {
                                            const formValues = getValues();
                                            Object.keys(formValues).forEach((key) => {
                                                if (key.startsWith('__attributes__cryptographicKey__')) {
                                                    (setValue as any)(key, undefined);
                                                }
                                            });
                                            setValue('type', undefined);
                                            field.onChange(value);
                                        }}
                                        options={optionsForKeys}
                                        placeholder="Select Token Profile"
                                        placement="bottom"
                                        isDisabled={editMode}
                                    />
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

                    {tokenProfile && !editMode && (
                        <Controller
                            name="type"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <div>
                                        <label
                                            htmlFor="typeSelect"
                                            className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                        >
                                            Select Key Type <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            id="typeSelect"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                onKeyTypeChange(value as KeyRequestType);
                                                field.onChange(value);
                                            }}
                                            options={optionsForType()}
                                            placeholder="Select to change Key Type"
                                            placement="bottom"
                                        />
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
                            disabled={!isDirty || isSubmitting || !isValid}
                            type="submit"
                        />
                    </Container>
                </form>
            </FormProvider>
        </Widget>
    );
}
