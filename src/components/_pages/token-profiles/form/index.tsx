import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';
import { actions as connectorActions } from 'ducks/connectors';

import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { actions as tokensActions, selectors as tokensSelectors } from 'ducks/tokens';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { TokenProfileDetailResponseModel } from 'types/token-profiles';

import { collectFormAttributes } from 'utils/attributes/attributes';

import Switch from 'components/Switch';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { KeyUsage, PlatformEnum, Resource } from '../../../../types/openapi';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';

type TokenProfileFormProps = Readonly<{
    tokenProfileId?: string;
    tokenId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
    usesGlobalModal?: boolean;
}>;

interface FormValues {
    name: string;
    description: string;
    token: string;
    usages: { value: KeyUsage; label: string }[];
    enabled: boolean;
}

export default function TokenProfileForm({
    tokenProfileId,
    tokenId: propTokenId,
    onCancel,
    onSuccess,
    usesGlobalModal = false,
}: TokenProfileFormProps) {
    const dispatch = useDispatch();

    const { id: routeId, tokenId: routeTokenId } = useParams();
    const id = tokenProfileId || routeId;
    const tokenId = propTokenId || routeTokenId;

    const editMode = useMemo(() => !!id, [id]);

    const tokenProfileSelector = useSelector(tokenProfilesSelectors.tokenProfile);

    const tokens = useSelector(tokensSelectors.tokens);
    const tokenProfileAttributeDescriptors = useSelector(tokensSelectors.tokenProfileAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));
    const isFetchingTokenProfileAttributes = useSelector(tokensSelectors.isFetchingTokenProfileAttributesDescriptors);

    const isFetchingDetail = useSelector(tokenProfilesSelectors.isFetchingDetail);
    const isCreating = useSelector(tokenProfilesSelectors.isCreating);
    const isUpdating = useSelector(tokenProfilesSelectors.isUpdating);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [tokenProfile, setTokenProfile] = useState<TokenProfileDetailResponseModel>();

    const isBusy = useMemo(
        () => isFetchingDetail || isCreating || isUpdating || isFetchingTokenProfileAttributes || isFetchingResourceCustomAttributes,
        [isCreating, isFetchingDetail, isUpdating, isFetchingTokenProfileAttributes, isFetchingResourceCustomAttributes],
    );

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        dispatch(tokensActions.listTokens());
        dispatch(tokensActions.clearTokenProfileAttributesDescriptors());
        dispatch(connectorActions.clearCallbackData());
    }, [dispatch]);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.TokenProfiles));
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id && tokenId) {
            // Fetch if id changed or if we don't have the correct profile loaded
            if (previousIdRef.current !== id || tokenProfileSelector?.uuid !== id) {
                dispatch(tokenProfilesActions.getTokenProfileDetail({ tokenInstanceUuid: tokenId, uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, tokenId, tokenProfileSelector]);

    useEffect(() => {
        if (editMode && tokenProfileSelector?.uuid === id) {
            setTokenProfile(tokenProfileSelector);
            dispatch(tokensActions.getTokenProfileAttributesDescriptors({ tokenUuid: tokenProfileSelector.tokenInstanceUuid }));
        }
    }, [dispatch, editMode, id, tokenProfileSelector]);

    const optionsForTokens = useMemo(
        () =>
            tokens.map((token) => ({
                value: token.uuid,
                label: token.name,
            })),
        [tokens],
    );

    const defaultValues: FormValues = useMemo(() => {
        const token = tokenProfile ? optionsForTokens.find((option) => option.value === tokenProfile.tokenInstanceUuid) : undefined;
        return {
            name: editMode ? tokenProfile?.name || '' : '',
            description: editMode ? tokenProfile?.description || '' : '',
            token: editMode ? token?.value || '' : '',
            usages: editMode ? tokenProfile?.usages?.map((usage) => ({ value: usage, label: usage })) || [] : [],
            enabled: true,
        };
    }, [editMode, optionsForTokens, tokenProfile]);

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

    const watchedToken = useWatch({
        control,
        name: 'token',
    });

    // Reset form values when tokenProfile is loaded in edit mode
    useEffect(() => {
        if (editMode && id && tokenProfile?.uuid === id && !isFetchingDetail) {
            const newDefaultValues: FormValues = {
                name: tokenProfile.name || '',
                description: tokenProfile.description || '',
                token: tokenProfile.tokenInstanceUuid || tokenId || '',
                usages:
                    tokenProfile.usages?.map((usage) => ({
                        value: usage,
                        label: getEnumLabel(keyUsageEnum, usage),
                    })) || [],
                enabled: tokenProfile.enabled ?? true,
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                description: '',
                token: tokenId || '',
                usages: [],
                enabled: true,
            });
        }
    }, [editMode, tokenProfile, id, reset, isFetchingDetail, tokenId, keyUsageEnum]);

    const onTokenChange = useCallback(
        (tokenUuid: string) => {
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            const formValues = getValues();
            Object.keys(formValues).forEach((key) => {
                if (key.startsWith('__attributes__token-profile__')) {
                    setValue(key as any, undefined);
                }
            });
            dispatch(tokensActions.clearTokenProfileAttributesDescriptors());
            dispatch(tokensActions.getTokenProfileAttributesDescriptors({ tokenUuid }));
        },
        [dispatch, getValues, setValue],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    tokenProfilesActions.updateTokenProfile({
                        profileUuid: id!,
                        tokenInstanceUuid: values.token,
                        redirect: usesGlobalModal ? undefined : `../../../tokenprofiles/detail/${values.token}/${id}`,
                        usesGlobalModal,
                        tokenProfileEditRequest: {
                            enabled: tokenProfile!.enabled,
                            description: values.description,
                            attributes: collectFormAttributes(
                                'token-profile',
                                [...(tokenProfileAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customTokenProfile', resourceCustomAttributes, values),
                            usage: values.usages.map((item) => item.value),
                        },
                    }),
                );
            } else {
                dispatch(
                    tokenProfilesActions.createTokenProfile({
                        tokenInstanceUuid: values.token,
                        tokenProfileAddRequest: {
                            name: values.name,
                            description: values.description,
                            enabled: values.enabled,
                            attributes: collectFormAttributes(
                                'token-profile',
                                [...(tokenProfileAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customTokenProfile', resourceCustomAttributes, values),
                            usage: values.usages.map((item) => item.value),
                        },
                        usesGlobalModal,
                    }),
                );
            }
        },
        [
            dispatch,
            editMode,
            id,
            tokenProfile,
            tokenProfileAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceCustomAttributes,
            usesGlobalModal,
        ],
    );

    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor
                id="customTokenProfile"
                attributeDescriptors={resourceCustomAttributes}
                attributes={tokenProfile?.customAttributes}
            />
        );
    }, [isBusy, resourceCustomAttributes, tokenProfile]);

    const keyUsageOptions = useMemo(() => {
        const options: { value: KeyUsage; label: string }[] = [];
        for (const key in KeyUsage) {
            options.push({
                value: KeyUsage[key as keyof typeof KeyUsage],
                label: getEnumLabel(keyUsageEnum, KeyUsage[key as keyof typeof KeyUsage]),
            });
        }
        return options;
    }, [keyUsageEnum]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="name"
                                    type="text"
                                    label="Token Profile Name"
                                    required
                                    placeholder="Enter Token Profile Name"
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
                                    placeholder="Enter Description / Comment"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        {!editMode && (
                            <Controller
                                name="enabled"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center gap-x-2">
                                        <Switch
                                            id="enabledSwitch"
                                            secondaryLabel="Enable Token Profile"
                                            checked={field.value}
                                            onChange={field.onChange}
                                        />
                                    </div>
                                )}
                            />
                        )}

                        <div>
                            <Controller
                                name="token"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="tokenSelect"
                                            label="Select Token"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                onTokenChange(typeof value === 'string' ? value : value?.toString() || '');
                                            }}
                                            options={optionsForTokens}
                                            placeholder="Select to change Token if needed"
                                            placement="bottom"
                                            required
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

                        <div>
                            <Controller
                                name="usages"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="usagesSelect"
                                            label="Key Usages"
                                            isMulti
                                            value={field.value || []}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={keyUsageOptions}
                                            placeholder="Select Key Usages"
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

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content: tokenProfileAttributeDescriptors ? (
                                        <AttributeEditor
                                            id="token-profile"
                                            callbackParentUuid={tokenProfile?.tokenInstanceUuid || watchedToken}
                                            callbackResource={Resource.TokenProfiles}
                                            attributeDescriptors={tokenProfileAttributeDescriptors}
                                            attributes={tokenProfile?.attributes}
                                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                        />
                                    ) : (
                                        <></>
                                    ),
                                },
                                {
                                    title: 'Custom Attributes',
                                    content: renderCustomAttributesEditor,
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (onCancel) {
                                        onCancel();
                                    } else {
                                        dispatch(userInterfaceActions.resetState());
                                    }
                                }}
                                disabled={isSubmitting}
                                type="button"
                            >
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
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
