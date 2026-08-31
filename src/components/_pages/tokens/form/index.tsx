import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';

import { actions as alertActions } from 'ducks/alerts';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as tokenActions, getTokenAttributesQueryKey, selectors as tokenSelectors } from 'ducks/tokens';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import type { AttributeDescriptorModel } from 'types/attributes';
import { ConnectorInterface, ConnectorVersion, FunctionGroupCode, Resource } from 'types/openapi';

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
    __attributes__token__?: Record<string, unknown>;
    deletedAttributes_token?: string[];
}

export default function TokenForm({ tokenId, onCancel, onSuccess }: TokenFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = tokenId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const tokenDetail = useSelector(tokenSelectors.token);
    const tokenProviders = useSelector(tokenSelectors.tokenProviders);
    const tokenProviderAttributeDescriptors = useSelector(tokenSelectors.tokenProviderAttributeDescriptors);
    const tokenProviderAttributesQueryKey = useSelector(tokenSelectors.tokenProviderAttributesQueryKey);
    const hasTokenProviderAttributeDescriptors = useSelector(tokenSelectors.hasTokenProviderAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const hasResourceCustomAttributes = useSelector(customAttributesSelectors.hasResourceCustomAttributes);

    const isFetchingTokenDetail = useSelector(tokenSelectors.isFetchingDetail);
    const isFetchingTokenProviders = useSelector(tokenSelectors.isFetchingTokenProviders);
    const isFetchingAttributeDescriptors = useSelector(tokenSelectors.isFetchingTokenProviderAttributeDescriptors);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isCreating = useSelector(tokenSelectors.isCreating);
    const isUpdating = useSelector(tokenSelectors.isUpdating);
    const createTokenSucceeded = useSelector(tokenSelectors.createTokenSucceeded);
    const updateTokenSucceeded = useSelector(tokenSelectors.updateTokenSucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [hydratedFormKey, setHydratedFormKey] = useState<string>();
    const hydratedFormKeyRef = useRef<string | undefined>(undefined);

    const token = editMode && tokenDetail?.uuid === id ? tokenDetail : undefined;

    const methods = useForm<FormValues>({
        defaultValues: {
            name: '',
            tokenProvider: '',
            storeKind: '',
        },
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isDirty, isSubmitting, isValid },
        setValue,
        reset,
        unregister,
    } = methods;

    const watchedTokenProviderUuid = useWatch({
        control,
        name: 'tokenProvider',
    });

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    const tokenProviderUuid = editMode ? token?.connectorUuid : watchedTokenProviderUuid;
    const tokenProvider = useMemo(
        () => tokenProviders?.find((provider) => provider.uuid === tokenProviderUuid),
        [tokenProviderUuid, tokenProviders],
    );

    const isV2TokenProvider = tokenProvider?.version === ConnectorVersion.V2;
    const selectedKind = editMode ? token?.kind : watchedStoreKind;
    const tokenAttributesQuery = useMemo(() => {
        if (!tokenProvider || (!isV2TokenProvider && !selectedKind)) return undefined;
        return {
            connectorUuid: tokenProvider.uuid,
            ...(isV2TokenProvider ? {} : { kind: selectedKind }),
        };
    }, [isV2TokenProvider, selectedKind, tokenProvider]);
    const tokenAttributesQueryKey = tokenAttributesQuery ? getTokenAttributesQueryKey(tokenAttributesQuery) : undefined;
    const tokenAttributeSchemaReady =
        !!tokenAttributesQueryKey && tokenProviderAttributesQueryKey === tokenAttributesQueryKey && hasTokenProviderAttributeDescriptors;
    const expectedHydrationKey =
        editMode && id && tokenAttributesQueryKey && tokenProvider
            ? `${id}:${tokenProvider.uuid}:${isV2TokenProvider ? '' : (selectedKind ?? '')}`
            : undefined;
    const isFormHydrated = !editMode || (!!expectedHydrationKey && hydratedFormKey === expectedHydrationKey);

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
        dispatch(tokenActions.ensureTokenProviders());
        dispatch(customAttributesActions.ensureResourceCustomAttributes(Resource.Tokens));
        return () => {
            dispatch(connectorActions.clearCallbackData());
        };
    }, [dispatch]);

    useEffect(() => {
        if (editMode && id) dispatch(tokenActions.ensureTokenDetail({ uuid: id }));
    }, [dispatch, editMode, id]);

    useEffect(() => {
        if (editMode) return;

        reset({
            name: '',
            tokenProvider: '',
            storeKind: '',
        });
        hydratedFormKeyRef.current = undefined;
        setHydratedFormKey(undefined);
    }, [editMode, reset]);

    useEffect(() => {
        if (!editMode || !token || tokenProviders === undefined) return;
        if (!token.connectorUuid) {
            dispatch(alertActions.error('Cryptography provider was probably deleted'));
            return;
        }
        if (!tokenProvider) dispatch(alertActions.error('Cryptography provider not found'));
    }, [dispatch, editMode, token, tokenProvider, tokenProviders]);

    useEffect(() => {
        if (
            tokenAttributesQuery &&
            (tokenProviderAttributesQueryKey !== tokenAttributesQueryKey || !hasTokenProviderAttributeDescriptors)
        ) {
            dispatch(tokenActions.ensureTokenProviderAttributesDescriptors(tokenAttributesQuery));
        }
    }, [dispatch, hasTokenProviderAttributeDescriptors, tokenAttributesQuery, tokenAttributesQueryKey, tokenProviderAttributesQueryKey]);

    useEffect(() => {
        if (!editMode || !token || !tokenProvider || !expectedHydrationKey || !tokenAttributeSchemaReady) return;
        if (hydratedFormKeyRef.current === expectedHydrationKey) return;

        reset(
            {
                name: token.name || '',
                tokenProvider: token.connectorUuid || '',
                storeKind: token.kind || '',
            },
            { keepDefaultValues: false },
        );
        hydratedFormKeyRef.current = expectedHydrationKey;
        setHydratedFormKey(expectedHydrationKey);
    }, [editMode, expectedHydrationKey, reset, token, tokenAttributeSchemaReady, tokenProvider]);

    const optionsForTokenProviders = useMemo(
        () =>
            tokenProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [tokenProviders],
    );

    const optionsForKinds = useMemo(() => {
        if (tokenProvider?.version === ConnectorVersion.V2) return [];
        return (
            tokenProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.CryptographyProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? []
        );
    }, [tokenProvider]);

    const cryptographyInterfaceUuid = isV2TokenProvider
        ? tokenProvider.interfaces?.find((connectorInterface) => connectorInterface.code === ConnectorInterface.Cryptography)?.uuid
        : undefined;

    const onTokenProviderChange = useCallback(
        (_value: string) => {
            dispatch(tokenActions.clearTokenProviderAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            unregister('__attributes__token__');
            unregister('deletedAttributes_token');
            setValue('storeKind', '');
        },
        [dispatch, setValue, unregister],
    );

    const onKindChange = useCallback(
        (_value: string) => {
            dispatch(tokenActions.clearTokenProviderAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            unregister('__attributes__token__');
            unregister('deletedAttributes_token');
        },
        [dispatch, unregister],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                if (!tokenDetail?.name || !tokenDetail.connectorUuid || (!isV2TokenProvider && !tokenDetail.kind)) {
                    dispatch(alertActions.error('Token detail is incomplete. Please reload the page and try again.'));
                    return;
                }
                dispatch(
                    tokenActions.updateToken({
                        uuid: id!,
                        updateToken: {
                            name: tokenDetail.name,
                            connectorUuid: tokenDetail.connectorUuid,
                            ...(isV2TokenProvider ? {} : { kind: tokenDetail.kind }),
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
                        ...(isV2TokenProvider ? {} : { kind: values.storeKind }),
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
            isV2TokenProvider,
        ],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const renderCustomAttributeEditor = useMemo(() => {
        if (isBusy || !hasResourceCustomAttributes || !isFormHydrated) return <></>;
        return <AttributeEditor id="customToken" attributeDescriptors={resourceCustomAttributes} attributes={token?.customAttributes} />;
    }, [hasResourceCustomAttributes, isBusy, isFormHydrated, resourceCustomAttributes, token?.customAttributes]);

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
                                                    const connectorUuid = typeof value === 'string' ? value : '';
                                                    field.onChange(connectorUuid);
                                                    onTokenProviderChange(connectorUuid);
                                                }}
                                                options={optionsForTokenProviders || []}
                                                placeholder="Select Cryptography Provider"
                                                placement="bottom"
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
                                                    const kind = typeof value === 'string' ? value : '';
                                                    field.onChange(kind);
                                                    onKindChange(kind);
                                                }}
                                                options={optionsForKinds || []}
                                                placeholder="Select Kind"
                                                placement="bottom"
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
                                        (isV2TokenProvider || watchedStoreKind) &&
                                        isFormHydrated &&
                                        tokenAttributeSchemaReady &&
                                        tokenProviderAttributeDescriptors &&
                                        tokenProviderAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="token"
                                                attributeDescriptors={tokenProviderAttributeDescriptors}
                                                attributes={editMode ? tokenDetail?.attributes : undefined}
                                                connectorUuid={tokenProvider.uuid}
                                                connectorVersion={tokenProvider.version}
                                                functionGroupCode={isV2TokenProvider ? undefined : FunctionGroupCode.CryptographyProvider}
                                                kind={isV2TokenProvider ? undefined : watchedStoreKind}
                                                interfaceUuid={cryptographyInterfaceUuid}
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
