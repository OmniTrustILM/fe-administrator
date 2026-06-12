import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';

import { actions as alertActions } from 'ducks/alerts';
import { actions as authorityActions, selectors as authoritySelectors } from 'ducks/authorities';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { AuthorityResponseModel } from 'types/authorities';
import type { ConnectorResponseModel } from 'types/connectors';
import { FunctionGroupCode, PlatformEnum, Resource } from 'types/openapi';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

type AuthorityFormProps = {
    authorityId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
};

interface FormValues {
    name: string;
    authorityProvider: string;
    storeKind: string;
}

export default function AuthorityForm({ authorityId, onCancel, onSuccess }: Readonly<AuthorityFormProps>) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id: routeId } = useParams();
    const id = authorityId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const authoritySelector = useSelector(authoritySelectors.authority);
    const authorityProviders = useSelector(authoritySelectors.authorityProviders);
    const authorityProviderAttributeDescriptors = useSelector(authoritySelectors.authorityProviderAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const isFetchingAuthorityDetail = useSelector(authoritySelectors.isFetchingDetail);
    const isFetchingAuthorityProviders = useSelector(authoritySelectors.isFetchingAuthorityProviders);
    const isFetchingAttributeDescriptors = useSelector(authoritySelectors.isFetchingAuthorityProviderAttributeDescriptors);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isCreating = useSelector(authoritySelectors.isCreating);
    const isUpdating = useSelector(authoritySelectors.isUpdating);
    const createAuthoritySucceeded = useSelector(authoritySelectors.createAuthoritySucceeded);
    const updateAuthoritySucceeded = useSelector(authoritySelectors.updateAuthoritySucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [authority, setAuthority] = useState<AuthorityResponseModel>();
    const [authorityProvider, setAuthorityProvider] = useState<ConnectorResponseModel>();

    const isBusy = useMemo(
        () =>
            isFetchingAuthorityDetail ||
            isFetchingAuthorityProviders ||
            isCreating ||
            isUpdating ||
            isFetchingAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingAuthorityDetail,
            isFetchingAuthorityProviders,
            isCreating,
            isUpdating,
            isFetchingAttributeDescriptors,
            isFetchingResourceCustomAttributes,
        ],
    );

    useEffect(() => {
        dispatch(authorityActions.resetState());
        dispatch(connectorActions.clearCallbackData());
        dispatch(authorityActions.listAuthorityProviders());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Authorities));
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);
    const fetchedDescriptorsRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct authority loaded
            if (previousIdRef.current !== id || authoritySelector?.uuid !== id) {
                dispatch(authorityActions.getAuthorityDetail({ uuid: id }));
                previousIdRef.current = id;
                fetchedDescriptorsRef.current = undefined;
            }
        } else {
            previousIdRef.current = undefined;
            fetchedDescriptorsRef.current = undefined;
        }
    }, [dispatch, editMode, id, authoritySelector]);

    useEffect(() => {
        if (editMode && authoritySelector?.uuid === id) {
            setAuthority(authoritySelector);
        }
    }, [authoritySelector, editMode, id]);

    useEffect(() => {
        if (
            editMode &&
            authoritySelector &&
            authoritySelector.uuid === id &&
            !isFetchingAuthorityDetail &&
            !isFetchingAuthorityProviders &&
            !isFetchingAttributeDescriptors &&
            authorityProviders &&
            authorityProviders.length > 0
        ) {
            if (!authoritySelector.connectorUuid) {
                dispatch(alertActions.error('Authority provider was probably deleted'));
                return;
            }

            const provider = authorityProviders.find((p) => p.uuid === authoritySelector.connectorUuid);

            if (provider) {
                if (authorityProvider?.uuid !== provider.uuid) {
                    setAuthorityProvider(provider);
                }
                const descriptorKey = `${authoritySelector.connectorUuid}-${authoritySelector.kind}`;
                if (
                    authoritySelector.kind &&
                    fetchedDescriptorsRef.current !== descriptorKey &&
                    (!authorityProviderAttributeDescriptors || authorityProviderAttributeDescriptors.length === 0)
                ) {
                    const functionGroup = provider.functionGroups[0].functionGroupCode;
                    fetchedDescriptorsRef.current = descriptorKey;
                    dispatch(
                        authorityActions.getAuthorityProviderAttributesDescriptors({
                            uuid: authoritySelector.connectorUuid,
                            kind: authoritySelector.kind,
                            functionGroup,
                        }),
                    );
                }
            } else {
                dispatch(alertActions.error('Authority provider not found'));
            }
        }
    }, [
        dispatch,
        editMode,
        authoritySelector,
        authorityProviders,
        isFetchingAuthorityProviders,
        isFetchingAuthorityDetail,
        isFetchingAttributeDescriptors,
        id,
        authorityProvider,
        authorityProviderAttributeDescriptors,
    ]);

    const optionsForAuthorityProviders = useMemo(
        () =>
            authorityProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [authorityProviders],
    );

    const optionsForKinds = useMemo(
        () =>
            authorityProvider?.functionGroups
                .find(
                    (fg) =>
                        fg.functionGroupCode === FunctionGroupCode.AuthorityProvider ||
                        fg.functionGroupCode === FunctionGroupCode.LegacyAuthorityProvider,
                )
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [],
        [authorityProvider],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? authority?.name || '' : '',
            authorityProvider: editMode ? authority?.connectorUuid || '' : '',
            storeKind: editMode ? authority?.kind || '' : '',
        }),
        [editMode, authority],
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

    const watchedAuthorityProvider = useWatch({
        control,
        name: 'authorityProvider',
    });

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    const onAuthorityProviderChange = useCallback(
        (value: string) => {
            if (!value) return;

            dispatch(authorityActions.clearAuthorityProviderAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);

            if (!authorityProviders) return;
            const provider = authorityProviders.find((p) => p.uuid === value);

            if (!provider) return;
            setAuthorityProvider(provider);
            setValue('storeKind', '');
        },
        [dispatch, authorityProviders, setValue],
    );

    useEffect(() => {
        if (watchedAuthorityProvider && !editMode) {
            onAuthorityProviderChange(watchedAuthorityProvider);
        }
    }, [watchedAuthorityProvider, onAuthorityProviderChange, editMode]);

    const onKindChange = useCallback(
        (value: string) => {
            if (!value || !authorityProvider) return;

            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            const functionGroup = authorityProvider.functionGroups[0].functionGroupCode;
            dispatch(
                authorityActions.getAuthorityProviderAttributesDescriptors({
                    uuid: authorityProvider.uuid,
                    kind: value,
                    functionGroup,
                }),
            );
        },
        [dispatch, authorityProvider],
    );

    useEffect(() => {
        if (watchedStoreKind && authorityProvider && !editMode) {
            onKindChange(watchedStoreKind);
        }
    }, [watchedStoreKind, authorityProvider, onKindChange, editMode]);

    // Reset form values when authority is loaded in edit mode
    useEffect(() => {
        if (editMode && id && authority?.uuid === id && !isFetchingAuthorityDetail) {
            const newDefaultValues: FormValues = {
                name: authority.name || '',
                authorityProvider: authority.connectorUuid || '',
                storeKind: authority.kind || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            reset({
                name: '',
                authorityProvider: '',
                storeKind: '',
            });
        }
    }, [editMode, authority, id, reset, isFetchingAuthorityDetail]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    authorityActions.updateAuthority({
                        uuid: id!,
                        updateAuthority: {
                            attributes: collectFormAttributes(
                                'authority',
                                [...(authorityProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customAuthority', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    authorityActions.createAuthority({
                        name: values.name,
                        connectorUuid: values.authorityProvider,
                        kind: values.storeKind,
                        attributes: collectFormAttributes(
                            'authority',
                            [...(authorityProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        customAttributes: collectFormAttributes('customAuthority', resourceCustomAttributes, values),
                    }),
                );
            }
        },
        [editMode, dispatch, id, authorityProviderAttributeDescriptors, groupAttributesCallbackAttributes, resourceCustomAttributes],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const renderCustomAttributeEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor
                id="customAuthority"
                attributeDescriptors={resourceCustomAttributes}
                attributes={authority?.customAttributes}
            />
        );
    }, [resourceCustomAttributes, authority, isBusy]);

    useRunOnSuccessfulFinish(isCreating, createAuthoritySucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateAuthoritySucceeded, onSuccess);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Authorities)} Inventory`, href: '/authorities' },
                    { label: editMode ? `Edit Authority` : 'Create Authority', href: '' },
                ]}
            />
            <Container>
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Widget busy={isBusy}>
                            <div className="space-y-4">
                                <Controller
                                    name="name"
                                    control={control}
                                    // In edit mode the name is read-only and cannot be changed by the user.
                                    // Disabling the field excludes it from RHF validation so an existing name that
                                    // violates the stricter frontend regex (e.g. a CA named "demo.ejbca.org") does not
                                    // poison `isValid` and permanently disable the Save button.
                                    disabled={editMode}
                                    rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                    render={({ field, fieldState }) => (
                                        <TextInput
                                            value={field.value}
                                            onChange={(value) => field.onChange(value)}
                                            onBlur={field.onBlur}
                                            id="name"
                                            type="text"
                                            placeholder="Enter the Certification Authority Name"
                                            disabled={editMode}
                                            label="Certification Authority Name"
                                            required
                                            invalid={fieldState.error && fieldState.isTouched}
                                            error={getFieldErrorMessage(fieldState)}
                                        />
                                    )}
                                />

                                {editMode ? (
                                    <TextInput
                                        id="authorityProvider"
                                        type="text"
                                        label="Authority Provider"
                                        value={authority?.connectorName || ''}
                                        disabled
                                        onChange={() => {}}
                                    />
                                ) : (
                                    <div>
                                        <Controller
                                            name="authorityProvider"
                                            control={control}
                                            rules={buildValidationRules([validateRequired()])}
                                            render={({ field, fieldState }) => (
                                                <>
                                                    <Select
                                                        id="authorityProviderSelect"
                                                        label="Authority Provider"
                                                        value={field.value || ''}
                                                        onChange={(value) => {
                                                            field.onChange(value);
                                                        }}
                                                        options={optionsForAuthorityProviders || []}
                                                        placeholder="Select Authority Provider"
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

                                {editMode && authority?.kind ? (
                                    <TextInput
                                        id="storeKind"
                                        type="text"
                                        label="Kind"
                                        value={authority?.kind || ''}
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
                                                authorityProvider &&
                                                watchedStoreKind &&
                                                authorityProviderAttributeDescriptors &&
                                                authorityProviderAttributeDescriptors.length > 0 ? (
                                                    <AttributeEditor
                                                        id="authority"
                                                        attributeDescriptors={authorityProviderAttributeDescriptors}
                                                        attributes={authority?.attributes}
                                                        connectorUuid={authorityProvider.uuid}
                                                        functionGroupCode={FunctionGroupCode.AuthorityProvider}
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
                                    <Button
                                        variant="outline"
                                        onClick={onCancel || (() => navigate(-1))}
                                        disabled={isSubmitting}
                                        type="button"
                                    >
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
            </Container>
        </div>
    );
}
