import AttributeEditor from 'components/Attributes/AttributeEditor';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { selectors as customAttributesSelectors, actions as customAttributesActions } from 'ducks/customAttributes';
import { actions as connectorActions } from 'ducks/connectors';
import { selectors as notificationSelectors, actions as notificationsActions } from 'ducks/notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import Button from 'components/Button';
import {
    type AttributeDescriptorModel,
    type AttributeMappingModel,
    type BaseAttributeContentModel,
    isCustomAttributeModel,
    isDataAttributeModel,
} from 'types/attributes';
import { type AttributeContentType, FunctionGroupCode } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import type { FieldValues, Path } from 'react-hook-form';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Container from 'components/Container';

interface FormValues {
    name: string;
    description: string;
    connectorUuid: string;
    kind: string;
    connectorName: string;
    attributes: Array<{ name: string; content: BaseAttributeContentModel[]; uuid: string; contentType: AttributeContentType }>;
    attributeMappings: AttributeMappingModel[];
}

interface NotificationInstanceFormProps {
    notificationInstanceId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}

const NotificationInstanceForm = ({ notificationInstanceId, onCancel, onSuccess }: NotificationInstanceFormProps = {}) => {
    const dispatch = useDispatch();
    const { id: routeId } = useParams();
    const id = notificationInstanceId || routeId;

    const notificationInstanceProviders = useSelector(notificationSelectors.notificationInstanceProviders);
    const notificationProviderAttributesDescriptors = useSelector(notificationSelectors.notificationProviderAttributesDescriptors);
    const [selectedNotificationInstanceProvider, setSelectedNotificationInstanceProvider] = useState<string | undefined>(undefined);
    const [selectedKind, setSelectedKind] = useState<string | undefined>(undefined);
    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const notificationDetails = useSelector(notificationSelectors.notificationInstanceDetail);
    const customAttributes = useSelector(customAttributesSelectors.customAttributes);
    const mappingAttributes = useSelector(notificationSelectors.mappingAttributes);
    const [selectedCustomAttributes, setSelectedCustomAttributes] = useState<{ value: string; label: string }[]>([]);
    const [attributeMappingValues, setAttributeMappingValues] = useState<AttributeMappingModel[]>([]);
    const isFetchingNotificationInstanceDetail = useSelector(notificationSelectors.isFetchingNotificationInstanceDetail);
    const isEditingNotificationInstance = useSelector(notificationSelectors.isEditingNotificationInstance);
    const isCreatingNotificationInstance = useSelector(notificationSelectors.isCreatingNotificationInstance);
    const createNotificationInstanceSucceeded = useSelector(notificationSelectors.createNotificationInstanceSucceeded);
    const updateNotificationInstanceSucceeded = useSelector(notificationSelectors.updateNotificationInstanceSucceeded);

    const editMode = useMemo(() => !!id, [id]);
    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const isBusy = useMemo(
        () => isCreatingNotificationInstance || isFetchingNotificationInstanceDetail,
        [isCreatingNotificationInstance, isFetchingNotificationInstanceDetail],
    );

    const clearNotificationInstanceDetail = useCallback(() => {
        dispatch(notificationsActions.clearNotificationInstanceDetail());
    }, [dispatch]);

    useEffect(() => {
        if (!id) {
            clearNotificationInstanceDetail();
        }
    }, [id, clearNotificationInstanceDetail]);

    useEffect(() => {
        if (!selectedNotificationInstanceProvider || !selectedKind) return;

        dispatch(
            notificationsActions.listMappingAttributes({
                connectorUuid: selectedNotificationInstanceProvider,
                kind: selectedKind,
            }),
        );
    }, [selectedKind, selectedNotificationInstanceProvider, dispatch]);

    useEffect(() => {
        if (notificationProviderAttributesDescriptors) return;
        dispatch(notificationsActions.listNotificationProviders());
    }, [notificationProviderAttributesDescriptors, dispatch]);

    useEffect(() => {
        if (!mappingAttributes?.length) return;
        dispatch(customAttributesActions.listCustomAttributes({}));
    }, [dispatch, mappingAttributes]);

    const getContentTypeOptions = useCallback(
        (contentType: AttributeContentType) => {
            const contentTypeCustomAttributes = customAttributes.filter((customAttribute) => customAttribute.contentType === contentType);
            return contentTypeCustomAttributes.map((contentTypeCustomAttribute) => ({
                label: contentTypeCustomAttribute.label || contentTypeCustomAttribute.name,
                value: contentTypeCustomAttribute.uuid,
            }));
        },
        [customAttributes],
    );

    useEffect(() => {
        if (id) {
            dispatch(notificationsActions.getNotificationInstance({ uuid: id }));
        } else {
            dispatch(notificationsActions.clearNotificationInstanceDetail());
        }
    }, [id, dispatch]);

    const defaultValues: FormValues = useMemo(() => {
        if (editMode && notificationDetails) {
            return {
                name: notificationDetails.name || '',
                description: notificationDetails.description || '',
                connectorUuid: notificationDetails.connectorUuid || '',
                kind: notificationDetails.kind || '',
                connectorName: notificationDetails.connectorName || '',
                attributes: notificationDetails.attributes.map((attribute) => ({
                    name: attribute.name,
                    content: attribute.content ?? [],
                    uuid: attribute.uuid ?? '',
                    contentType: attribute.contentType,
                })),
                attributeMappings: [],
            };
        } else {
            return {
                name: '',
                description: '',
                connectorUuid: '',
                kind: '',
                connectorName: '',
                attributes: [],
                attributeMappings: [],
            };
        }
    }, [editMode, notificationDetails]);

    const methods = useForm<FormValues>({
        mode: 'onTouched',
        defaultValues,
    });

    const { control, handleSubmit, setValue, formState, reset, getValues } = methods;

    useEffect(() => {
        const { __attributes__notification__: attrs } = getValues() as unknown as Record<string, unknown>;
        reset({ ...defaultValues, ...(attrs ? { __attributes__notification__: attrs } : {}) });
    }, [defaultValues, reset, getValues]);

    const allFormValues = useWatch({ control });

    const onSubmit = (values: FormValues) => {
        const allValues: FieldValues = allFormValues;
        const attributes = collectFormAttributes(
            'notification',
            [...(notificationProviderAttributesDescriptors ?? []), ...groupAttributesCallbackAttributes],
            allValues,
        );

        if (editMode && id) {
            dispatch(
                notificationsActions.editNotificationInstance({
                    notificationInstance: {
                        ...values,
                        attributes,
                        attributeMappings: attributeMappingValues,
                    },
                    uuid: id,
                }),
            );
        } else {
            dispatch(
                notificationsActions.createNotificationInstance({
                    ...values,
                    attributes,
                    attributeMappings: attributeMappingValues,
                }),
            );
        }
    };

    const handleCancel = useCallback(() => {
        clearNotificationInstanceDetail();
        onCancel?.();
    }, [clearNotificationInstanceDetail, onCancel]);

    useRunOnSuccessfulFinish(isCreatingNotificationInstance, createNotificationInstanceSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isEditingNotificationInstance, updateNotificationInstanceSucceeded, onSuccess);

    const optionsForNotificationProviders = useMemo(
        () =>
            notificationInstanceProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [notificationInstanceProviders],
    );

    const kindOptions = useMemo(() => {
        const selectedProvider = notificationInstanceProviders?.find((provider) => provider.uuid === selectedNotificationInstanceProvider);
        const kindOptions =
            selectedProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.NotificationProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [];

        return kindOptions;
    }, [selectedNotificationInstanceProvider, notificationInstanceProviders]);

    const clearAttributeEditorState = useCallback(() => {
        dispatch(connectorActions.clearCallbackData());
        setGroupAttributesCallbackAttributes([]);
        const values = allFormValues;
        Object.keys(values || {})
            .filter((k) => k.startsWith('__attributes__notification__.'))
            .forEach((k) => setValue(k as Path<FormValues>, undefined));
    }, [dispatch, allFormValues, setValue]);

    const onInstanceNotificationProviderChange = (changedValue: string | undefined) => {
        if (changedValue === selectedNotificationInstanceProvider) {
            return;
        }
        clearAttributeEditorState();
        setValue('connectorUuid', changedValue || '');
        setSelectedNotificationInstanceProvider(changedValue);
        setSelectedKind(undefined);
        setValue('kind', '');
    };

    const onNotificationInstanceKindChange = (changedValue: string | undefined) => {
        if (!changedValue) return;
        clearAttributeEditorState();
        setSelectedKind(changedValue);
        setValue('kind', changedValue);
    };

    useEffect(() => {
        if (!selectedNotificationInstanceProvider || !selectedKind) return;
        dispatch(
            notificationsActions.getNotificationAttributesDescriptors({
                kind: selectedKind,
                uuid: selectedNotificationInstanceProvider,
            }),
        );
    }, [selectedKind, selectedNotificationInstanceProvider, dispatch]);

    // On unmount, clear any leftover callback data to avoid leaking dynamic fields
    useEffect(() => {
        return () => {
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
        };
    }, [dispatch]);

    useEffect(() => {
        if (!editMode || !notificationDetails || !optionsForNotificationProviders || !kindOptions) return;

        const initialProvider = optionsForNotificationProviders.find((provider) => provider.value === notificationDetails.connectorUuid);
        if (!initialProvider) return;
        setSelectedNotificationInstanceProvider(initialProvider.value);

        const initialKind = kindOptions.find((kind) => kind.value === notificationDetails.kind);
        if (!initialKind) return;
        setSelectedKind(initialKind.value);

        if (notificationDetails?.attributeMappings) {
            setAttributeMappingValues(notificationDetails.attributeMappings);
            const selectedCustomAttributesFetched = notificationDetails.attributeMappings.map((attributeMapping) => {
                return {
                    value: attributeMapping.customAttributeUuid,
                    label: attributeMapping.customAttributeLabel,
                };
            });
            setSelectedCustomAttributes(selectedCustomAttributesFetched);
        }
    }, [notificationDetails, optionsForNotificationProviders, kindOptions, editMode]);

    const handleMappingAttributeChange = (
        event: { value: string; label: string } | undefined,
        i: number,
        mappingAttributeUuid: string,
        mappingAttributeName: string,
    ) => {
        if (!event) return;

        const newAttributeMappingValues = {
            customAttributeLabel: event.label,
            customAttributeUuid: event.value,
            mappingAttributeUuid,
            mappingAttributeName,
        };
        const newAttributeMappingValuesArray = [...attributeMappingValues];
        newAttributeMappingValuesArray[i] = newAttributeMappingValues;
        setAttributeMappingValues(newAttributeMappingValuesArray);
        const newSelectedCustomAttribute = [...selectedCustomAttributes];
        newSelectedCustomAttribute[i] = event;
        setSelectedCustomAttributes(newSelectedCustomAttribute);
    };

    const renderAttributeEditor = useCallback(
        (kind: string | undefined) => {
            if (!notificationProviderAttributesDescriptors || !selectedNotificationInstanceProvider || !kind) return <></>;

            return (
                <AttributeEditor
                    id="notification"
                    attributeDescriptors={notificationProviderAttributesDescriptors}
                    connectorUuid={selectedNotificationInstanceProvider}
                    functionGroupCode={FunctionGroupCode.NotificationProvider}
                    kind={kind}
                    attributes={editMode && notificationDetails?.attributes ? notificationDetails.attributes : undefined}
                    groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                    setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                />
            );
        },
        [
            notificationProviderAttributesDescriptors,
            editMode,
            groupAttributesCallbackAttributes,
            notificationDetails,
            selectedNotificationInstanceProvider,
        ],
    );

    const validateAttributes = useCallback(() => {
        if (!notificationProviderAttributesDescriptors || !selectedNotificationInstanceProvider || !selectedKind) {
            return true;
        }

        const attributeValues = ((allFormValues as Record<string, unknown>).__attributes__notification__ ?? {}) as Record<string, unknown>;

        const isAttributeValueEmpty = (fieldValue: unknown): boolean => {
            if (fieldValue === null || fieldValue === undefined) return true;
            if (Array.isArray(fieldValue)) return fieldValue.length === 0;
            if (typeof fieldValue === 'string') return fieldValue.trim() === '';
            if (typeof fieldValue === 'object') {
                if ('code' in fieldValue || 'language' in fieldValue) {
                    const codeVal = (fieldValue as { code?: unknown }).code;
                    const isCodeEmpty = codeVal === null || codeVal === undefined;
                    const isCodeStringEmpty = typeof codeVal === 'string' && codeVal.trim() === '';
                    return isCodeEmpty || isCodeStringEmpty;
                }
                if ('value' in fieldValue || 'label' in fieldValue) {
                    const v = (fieldValue as { value?: unknown }).value;
                    return v === null || v === undefined;
                }
                return Object.keys(fieldValue).length === 0;
            }
            return false;
        };

        const allDescriptors = [...notificationProviderAttributesDescriptors, ...groupAttributesCallbackAttributes];

        for (const descriptor of allDescriptors) {
            if ((isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) && descriptor.properties?.required) {
                const fieldValue = attributeValues[descriptor.name];
                if (isAttributeValueEmpty(fieldValue)) {
                    return false;
                }
            }
        }

        return true;
    }, [
        notificationProviderAttributesDescriptors,
        selectedNotificationInstanceProvider,
        selectedKind,
        groupAttributesCallbackAttributes,
        allFormValues,
    ]);

    const isValid = formState.isValid && validateAttributes();

    return (
        <Widget noBorder busy={isBusy} dataTestId="notification-instance-form">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <Controller
                            name="name"
                            control={control}
                            rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    disabled={editMode}
                                    id="name"
                                    type="text"
                                    label="Notification Instance Name"
                                    required
                                    placeholder="Notification Instance Name"
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
                                    placeholder="Enter Description / Comment"
                                    data-testid="notification-description"
                                    rows={3}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="connectorUuid"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="notificationInstanceProviderSelect"
                                        options={optionsForNotificationProviders || []}
                                        value={selectedNotificationInstanceProvider || ''}
                                        onChange={(value) => {
                                            const uuid = value as string | undefined;
                                            field.onChange(uuid || '');
                                            onInstanceNotificationProviderChange(uuid);
                                        }}
                                        placeholder="Select Notification Instance Provider"
                                        isClearable={true}
                                        disabled={editMode}
                                        label="Notification Instance Provider"
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

                        <Controller
                            name="kind"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="kindSelect"
                                        options={kindOptions || []}
                                        value={selectedKind || ''}
                                        onChange={(value) => {
                                            const kind = value as string | undefined;
                                            field.onChange(kind || '');
                                            onNotificationInstanceKindChange(kind);
                                        }}
                                        placeholder="Select Notification Instance Kind"
                                        isClearable={true}
                                        disabled={editMode}
                                        label="Notification Instance Kind"
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

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content: renderAttributeEditor(selectedKind),
                                },
                                {
                                    title: 'Attribute Mappings',
                                    content: mappingAttributes?.length ? (
                                        <Widget>
                                            {mappingAttributes.map((mappingAttribute, i) => {
                                                const displayLabel = mappingAttribute.properties?.label ?? mappingAttribute.name;
                                                return (
                                                    <div key={mappingAttribute.uuid} className="mb-4">
                                                        <Select
                                                            id={`attributeMappings[${i}].${mappingAttribute.name}`}
                                                            options={getContentTypeOptions(mappingAttribute.contentType)}
                                                            value={selectedCustomAttributes?.[i]?.value}
                                                            onChange={(value) => {
                                                                const option = getContentTypeOptions(mappingAttribute.contentType).find(
                                                                    (opt) => opt.value === value,
                                                                );
                                                                if (option) {
                                                                    handleMappingAttributeChange(
                                                                        option,
                                                                        i,
                                                                        mappingAttribute.uuid,
                                                                        mappingAttribute.name,
                                                                    );
                                                                }
                                                            }}
                                                            placeholder={`Select Custom Attribute for ${displayLabel}`}
                                                            label={`${displayLabel} (${mappingAttribute.contentType})`}
                                                        />
                                                        <p className="mt-1 text-sm text-gray-500">{mappingAttribute?.description}</p>
                                                    </div>
                                                );
                                            })}
                                        </Widget>
                                    ) : (
                                        <></>
                                    ),
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button
                                variant="outline"
                                color="secondary"
                                onClick={handleCancel}
                                disabled={formState.isSubmitting}
                                type="button"
                            >
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgress={formState.isSubmitting}
                                disabled={
                                    !isValid || isCreatingNotificationInstance || formState.isSubmitting || isEditingNotificationInstance
                                }
                            />
                        </Container>
                    </div>
                </form>
            </FormProvider>
        </Widget>
    );
};

export default NotificationInstanceForm;
