import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';

import { actions as alertActions } from 'ducks/alerts';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as tokenActions, selectors as tokenSelectors } from 'ducks/tokens';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { ConnectorResponseModel } from 'types/connectors';
import { FunctionGroupCode, Resource } from 'types/openapi';
import type { TokenDetailResponseDto } from 'types/tokens';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

type TokenFormProps = Readonly<{
    tokenId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    tokenProvider: string;
    storeKind: string;
}

export default function TokenForm({ tokenId, onCancel, onSuccess }: TokenFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = tokenId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const tokenDetail = useSelector(tokenSelectors.token);
    const tokenProviders = useSelector(tokenSelectors.tokenProviders);
    const tokenProviderAttributeDescriptors = useSelector(tokenSelectors.tokenProviderAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const isFetchingTokenDetail = useSelector(tokenSelectors.isFetchingDetail);
    const isFetchingTokenProviders = useSelector(tokenSelectors.isFetchingTokenProviders);
    const isFetchingAttributeDescriptors = useSelector(tokenSelectors.isFetchingTokenProviderAttributeDescriptors);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isCreating = useSelector(tokenSelectors.isCreating);
    const isUpdating = useSelector(tokenSelectors.isUpdating);
    const createTokenSucceeded = useSelector(tokenSelectors.createTokenSucceeded);
    const updateTokenSucceeded = useSelector(tokenSelectors.updateTokenSucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [token, setToken] = useState<TokenDetailResponseDto>();
    const [tokenProvider, setTokenProvider] = useState<ConnectorResponseModel>();

    const isBusy = useMemo(
        () =>
            isFetchingTokenDetail ||
            isFetchingTokenProviders ||
            isCreating ||
            isUpdating ||
            isFetchingAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingTokenDetail,
            isFetchingTokenProviders,
            isCreating,
            isUpdating,
            isFetchingAttributeDescriptors,
            isFetchingResourceCustomAttributes,
        ],
    );

    useEffect(() => {
        dispatch(connectorActions.clearCallbackData());
        dispatch(tokenActions.listTokenProviders());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Tokens));
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct token loaded
            if (previousIdRef.current !== id || tokenDetail?.uuid !== id) {
                dispatch(tokenActions.getTokenDetail({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, tokenDetail]);

    useEffect(() => {
        if (editMode && tokenDetail?.uuid === id) {
            setToken(tokenDetail);
        }
    }, [tokenDetail, editMode, id]);

    useEffect(() => {
        if (!tokenProvider && editMode && tokenDetail?.uuid === id && tokenProviders && tokenProviders.length > 0) {
            if (!tokenDetail!.connectorUuid) {
                dispatch(alertActions.error('Cryptography provider was probably deleted'));
                return;
            }

            const provider = tokenProviders.find((p) => p.uuid === tokenDetail!.connectorUuid);

            if (provider) {
                setTokenProvider(provider);
                dispatch(
                    tokenActions.getTokenProviderAttributesDescriptors({ uuid: tokenDetail!.connectorUuid, kind: tokenDetail!.kind || '' }),
                );
            } else {
                dispatch(alertActions.error('Cryptography provider not found'));
            }
        }
    }, [tokenProvider, dispatch, editMode, tokenDetail, tokenProviders, isFetchingTokenProviders, id]);

    const optionsForTokenProviders = useMemo(
        () =>
            tokenProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [tokenProviders],
    );

    const optionsForKinds = useMemo(
        () =>
            tokenProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.CryptographyProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [],
        [tokenProvider],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? token?.name || '' : '',
            tokenProvider: editMode ? token?.connectorUuid || '' : '',
            storeKind: editMode ? tokenDetail?.kind || '' : '',
        }),
        [editMode, token, tokenDetail?.kind],
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
        reset,
    } = methods;

    const watchedTokenProvider = useWatch({
        control,
        name: 'tokenProvider',
    });

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    const onTokenProviderChange = useCallback(
        (value: string) => {
            if (!value) return;

            dispatch(tokenActions.clearTokenProviderAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);

            if (!tokenProviders) return;
            const provider = tokenProviders.find((p) => p.uuid === value);

            if (!provider) return;
            setTokenProvider(provider);
            setValue('storeKind', '');
        },
        [dispatch, tokenProviders, setValue],
    );

    useEffect(() => {
        if (watchedTokenProvider) {
            onTokenProviderChange(watchedTokenProvider);
        }
    }, [watchedTokenProvider, onTokenProviderChange]);

    const onKindChange = useCallback(
        (value: string) => {
            if (!value || !tokenProvider) return;

            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            dispatch(tokenActions.getTokenProviderAttributesDescriptors({ uuid: tokenProvider.uuid, kind: value }));
        },
        [dispatch, tokenProvider],
    );

    useEffect(() => {
        if (watchedStoreKind && tokenProvider) {
            onKindChange(watchedStoreKind);
        }
    }, [watchedStoreKind, tokenProvider, onKindChange]);

    // Reset form values when token is loaded in edit mode
    useEffect(() => {
        if (editMode && id && token?.uuid === id && !isFetchingTokenDetail) {
            const newDefaultValues: FormValues = {
                name: token.name || '',
                tokenProvider: token.connectorUuid || '',
                storeKind: token.kind || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                tokenProvider: '',
                storeKind: '',
            });
        }
    }, [editMode, token, id, reset, isFetchingTokenDetail]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                if (!tokenDetail?.name || !tokenDetail?.kind || !tokenDetail?.connectorUuid) {
                    dispatch(alertActions.error('Token detail is incomplete. Please reload the page and try again.'));
                    return;
                }
                dispatch(
                    tokenActions.updateToken({
                        uuid: id!,
                        updateToken: {
                            name: tokenDetail.name,
                            kind: tokenDetail.kind,
                            connectorUuid: tokenDetail.connectorUuid,
                            attributes: collectFormAttributes(
                                'token',
                                [...(tokenProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customToken', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    tokenActions.createToken({
                        name: values.name,
                        connectorUuid: values.tokenProvider,
                        kind: values.storeKind,
                        attributes: collectFormAttributes(
                            'token',
                            [...(tokenProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        customAttributes: collectFormAttributes('customToken', resourceCustomAttributes, values),
                    }),
                );
            }
        },
        [
            editMode,
            dispatch,
            id,
            tokenDetail,
            tokenProviderAttributeDescriptors,
            groupAttributesCallbackAttributes,
            resourceCustomAttributes,
        ],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const renderCustomAttributeEditor = useMemo(() => {
        if (isBusy) return <></>;
        return <AttributeEditor id="customToken" attributeDescriptors={resourceCustomAttributes} attributes={token?.customAttributes} />;
    }, [resourceCustomAttributes, token?.customAttributes, isBusy]);

    useRunOnSuccessfulFinish(isCreating, createTokenSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateTokenSucceeded, onSuccess);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="name"
                                    type="text"
                                    placeholder="Enter the Certification Token Name"
                                    disabled={editMode}
                                    label="Token Name"
                                    required
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        {editMode ? (
                            <TextInput
                                id="tokenProvider"
                                type="text"
                                label="Cryptography Provider"
                                value={token?.connectorName || ''}
                                disabled
                                onChange={() => {}}
                            />
                        ) : (
                            <div>
                                <Controller
                                    name="tokenProvider"
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="tokenProviderSelect"
                                                label="Cryptography Provider"
                                                value={field.value || ''}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={optionsForTokenProviders || []}
                                                placeholder="Select Cryptography Provider"
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
                        )}

                        {!editMode && optionsForKinds?.length ? (
                            <div>
                                <Controller
                                    name="storeKind"
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="storeKindSelect"
                                                label="Kind"
                                                value={field.value || ''}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={optionsForKinds || []}
                                                placeholder="Select Kind"
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
                        ) : null}

                        {editMode && tokenDetail?.kind ? (
                            <TextInput
                                id="storeKind"
                                type="text"
                                label="Kind"
                                value={tokenDetail?.kind || ''}
                                disabled
                                onChange={() => {}}
                            />
                        ) : null}

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content:
                                        tokenProvider &&
                                        watchedStoreKind &&
                                        tokenProviderAttributeDescriptors &&
                                        tokenProviderAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="token"
                                                attributeDescriptors={tokenProviderAttributeDescriptors}
                                                attributes={tokenDetail?.attributes}
                                                connectorUuid={tokenProvider.uuid}
                                                functionGroupCode={FunctionGroupCode.CryptographyProvider}
                                                kind={watchedStoreKind}
                                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                            />
                                        ) : (
                                            <></>
                                        ),
                                },
                                {
                                    title: 'Custom Attributes',
                                    content: renderCustomAttributeEditor,
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={(editMode ? !isDirty : false) || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
