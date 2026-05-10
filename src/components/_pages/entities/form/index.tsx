import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';

import { actions as alertActions } from 'ducks/alerts';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as entityActions, selectors as entitySelectors } from 'ducks/entities';
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
import type { EntityResponseModel } from 'types/entities';
import { FunctionGroupCode, Resource } from 'types/openapi';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import TabLayout from '../../../Layout/TabLayout';

type EntityFormProps = Readonly<{
    entityId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    entityProvider: string;
    storeKind: string;
}

export default function EntityForm({ entityId, onCancel, onSuccess }: EntityFormProps) {
    const dispatch = useDispatch();

    const { id: routeId } = useParams();
    const id = entityId || routeId;

    const editMode = useMemo(() => !!id, [id]);

    const entitySelector = useSelector(entitySelectors.entity);
    const entityProviders = useSelector(entitySelectors.entityProviders);
    const entityProviderAttributeDescriptors = useSelector(entitySelectors.entityProviderAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isFetchingEntityDetail = useSelector(entitySelectors.isFetchingDetail);
    const isFetchingEntityProviders = useSelector(entitySelectors.isFetchingEntityProviders);
    const isFetchingAttributeDescriptors = useSelector(entitySelectors.isFetchingEntityProviderAttributeDescriptors);
    const isCreating = useSelector(entitySelectors.isCreating);
    const createEntitySucceeded = useSelector(entitySelectors.createEntitySucceeded);
    const isUpdating = useSelector(entitySelectors.isUpdating);
    const updateEntitySucceeded = useSelector(entitySelectors.updateEntitySucceeded);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [entity, setEntity] = useState<EntityResponseModel>();
    const [entityProvider, setEntityProvider] = useState<ConnectorResponseModel>();

    const isBusy = useMemo(
        () =>
            isFetchingEntityDetail ||
            isFetchingEntityProviders ||
            isCreating ||
            isUpdating ||
            isFetchingAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingEntityDetail,
            isFetchingEntityProviders,
            isCreating,
            isUpdating,
            isFetchingAttributeDescriptors,
            isFetchingResourceCustomAttributes,
        ],
    );

    useEffect(() => {
        dispatch(connectorActions.clearCallbackData());
        dispatch(entityActions.listEntityProviders());
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Entities));
    }, [dispatch]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id) {
            // Fetch if id changed or if we don't have the correct entity loaded
            if (previousIdRef.current !== id || entitySelector?.uuid !== id) {
                dispatch(entityActions.getEntityDetail({ uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, id, entitySelector]);

    useEffect(() => {
        if (editMode && entitySelector?.uuid === id) {
            setEntity(entitySelector);
        }
    }, [dispatch, editMode, id, entitySelector, entityProviders, isFetchingEntityProviders]);

    useEffect(() => {
        if (!entityProvider && editMode && entitySelector?.uuid === id && entityProviders && entityProviders.length > 0) {
            if (!entitySelector!.connectorUuid) {
                dispatch(alertActions.error('Entity provider was probably deleted'));
                return;
            }

            const provider = entityProviders.find((p) => p.uuid === entitySelector!.connectorUuid);

            if (provider) {
                setEntityProvider(provider);
                dispatch(
                    entityActions.getEntityProviderAttributesDescriptors({
                        uuid: entitySelector!.connectorUuid,
                        kind: entitySelector!.kind,
                    }),
                );
            } else {
                dispatch(alertActions.error('Entity provider not found'));
            }
        }
    }, [entityProvider, dispatch, editMode, id, entitySelector, entityProviders, isFetchingEntityProviders]);

    const onEntityProviderChange = useCallback(
        (value: string) => {
            dispatch(entityActions.clearEntityProviderAttributeDescriptors());
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);

            if (!value || !entityProviders) return;
            const provider = entityProviders.find((p) => p.uuid === value);

            if (!provider) return;
            setEntityProvider(provider);
        },
        [dispatch, entityProviders],
    );

    const onKindChange = useCallback(
        (value: string) => {
            if (!value || !entityProvider) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            dispatch(entityActions.getEntityProviderAttributesDescriptors({ uuid: entityProvider.uuid, kind: value }));
        },
        [dispatch, entityProvider],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? entity?.name || '' : '',
            entityProvider: editMode ? entity?.connectorUuid || '' : '',
            storeKind: editMode ? entity?.kind || '' : '',
        }),
        [editMode, entity],
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

    const watchedStoreKind = useWatch({
        control,
        name: 'storeKind',
    });

    // Reset form values when entity is loaded in edit mode
    useEffect(() => {
        if (editMode && id && entity?.uuid === id && !isFetchingEntityDetail) {
            const newDefaultValues: FormValues = {
                name: entity.name || '',
                entityProvider: entity.connectorUuid || '',
                storeKind: entity.kind || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                entityProvider: '',
                storeKind: '',
            });
        }
    }, [editMode, entity, id, reset, isFetchingEntityDetail]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    entityActions.updateEntity({
                        uuid: id!,
                        attributes: collectFormAttributes(
                            'entity',
                            [...(entityProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        customAttributes: collectFormAttributes('customEntity', resourceCustomAttributes, values),
                    }),
                );
            } else {
                dispatch(
                    entityActions.addEntity({
                        name: values.name,
                        connectorUuid: values.entityProvider,
                        kind: values.storeKind,
                        attributes: collectFormAttributes(
                            'entity',
                            [...(entityProviderAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                        customAttributes: collectFormAttributes('customEntity', resourceCustomAttributes, values),
                    }),
                );
            }
        },
        [editMode, dispatch, id, entityProviderAttributeDescriptors, groupAttributesCallbackAttributes, resourceCustomAttributes],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const optionsForEntityProviders = useMemo(
        () =>
            entityProviders?.map((provider) => ({
                label: provider.name,
                value: provider.uuid,
            })),
        [entityProviders],
    );

    const optionsForKinds = useMemo(
        () =>
            entityProvider?.functionGroups
                .find((fg) => fg.functionGroupCode === FunctionGroupCode.EntityProvider)
                ?.kinds.map((kind) => ({
                    label: kind,
                    value: kind,
                })) ?? [],
        [entityProvider],
    );

    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return <AttributeEditor id="customEntity" attributeDescriptors={resourceCustomAttributes} attributes={entity?.customAttributes} />;
    }, [isBusy, entity, resourceCustomAttributes]);

    useRunOnSuccessfulFinish(isCreating, createEntitySucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateEntitySucceeded, onSuccess);

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
                                    placeholder="Enter the Entity Name"
                                    disabled={editMode}
                                    label="Entity Name"
                                    required
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        {editMode ? (
                            <TextInput
                                id="entityProvider"
                                type="text"
                                label="Entity Provider"
                                value={entity?.connectorName || ''}
                                disabled={true}
                                onChange={() => {}}
                            />
                        ) : (
                            <div>
                                <Controller
                                    name="entityProvider"
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="entityProviderSelect"
                                                label="Entity Provider"
                                                value={field.value || ''}
                                                onChange={(value) => {
                                                    onEntityProviderChange(value as string);
                                                    const formValues = getValues();
                                                    Object.keys(formValues).forEach((key) => {
                                                        if (key.startsWith('__attributes__entity__')) {
                                                            setValue(key as any, undefined);
                                                        }
                                                    });
                                                    setValue('storeKind' as any, undefined);
                                                    field.onChange(value);
                                                }}
                                                options={optionsForEntityProviders || []}
                                                placeholder="Select Entity Provider"
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
                                                    onKindChange(value as string);
                                                    field.onChange(value);
                                                }}
                                                options={optionsForKinds || []}
                                                placeholder="Select Kind"
                                                placement="bottom"
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">Required Field</p>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                        ) : null}

                        {editMode && entity?.kind ? (
                            <TextInput id="storeKind" type="text" label="Kind" value={entity.kind} disabled onChange={() => {}} />
                        ) : null}

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content:
                                        entityProvider &&
                                        watchedStoreKind &&
                                        entityProviderAttributeDescriptors &&
                                        entityProviderAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="entity"
                                                attributeDescriptors={entityProviderAttributeDescriptors}
                                                attributes={entity?.attributes}
                                                connectorUuid={entityProvider.uuid}
                                                functionGroupCode={FunctionGroupCode.EntityProvider}
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
                                    content: renderCustomAttributesEditor,
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
