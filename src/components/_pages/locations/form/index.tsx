import AttributeEditor from 'components/Attributes/AttributeEditor';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import TextInput from 'components/TextInput';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as entityActions, selectors as entitySelectors } from 'ducks/entities';

import { actions as locationActions, selectors as locationSelectors } from 'ducks/locations';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { LocationResponseModel } from 'types/locations';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { EntityType } from 'ducks/filters';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { selectors as pagingSelectors } from '../../../../ducks/paging';
import { Resource } from '../../../../types/openapi';
import TabLayout from '../../../Layout/TabLayout';

type LocationFormProps = Readonly<{
    locationId?: string;
    entityId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
    entity: string;
}

export default function LocationForm({ locationId, entityId: propEntityId, onCancel, onSuccess }: LocationFormProps) {
    const dispatch = useDispatch();

    const { entityId: routeEntityId, id: routeId } = useParams();
    const id = locationId || routeId;
    const entityId = propEntityId || routeEntityId;

    const editMode = useMemo(() => !!(id && entityId), [entityId, id]);

    const entities = useSelector(entitySelectors.entities);
    const locationAttributeDescriptors = useSelector(entitySelectors.locationAttributeDescriptors);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);

    const locationSelector = useSelector(locationSelectors.location);

    const isFetchingLocationDetail = useSelector(locationSelectors.isFetchingDetail);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const isCreating = useSelector(locationSelectors.isCreating);
    const createLocationSucceeded = useSelector(locationSelectors.createLocationSucceeded);
    const isUpdating = useSelector(locationSelectors.isUpdating);
    const updateLocationSucceeded = useSelector(locationSelectors.updateLocationSucceeded);

    const isFetchingLocationAttributeDescriptors = useSelector(entitySelectors.isFetchingLocationAttributeDescriptors);
    const isFetchingEntities = useSelector(pagingSelectors.isFetchingList(EntityType.ENTITY));

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [init, setInit] = useState(true);

    const [location, setLocation] = useState<LocationResponseModel>();

    const isBusy = useMemo(
        () =>
            isFetchingLocationDetail ||
            isCreating ||
            isUpdating ||
            isFetchingEntities ||
            isFetchingLocationAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [
            isFetchingLocationDetail,
            isCreating,
            isUpdating,
            isFetchingEntities,
            isFetchingLocationAttributeDescriptors,
            isFetchingResourceCustomAttributes,
        ],
    );

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Locations));

        if (init) {
            dispatch(entityActions.listEntities({}));
            setInit(false);
        }
    }, [dispatch, init]);

    const previousIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (editMode && id && entityId) {
            // Fetch if id changed or if we don't have the correct location loaded
            if (previousIdRef.current !== id || locationSelector?.uuid !== id) {
                dispatch(locationActions.getLocationDetail({ entityUuid: entityId, uuid: id }));
                previousIdRef.current = id;
            }
        } else {
            previousIdRef.current = undefined;
        }
    }, [dispatch, editMode, entityId, id, locationSelector]);

    useEffect(() => {
        if (editMode && locationSelector?.uuid === id) {
            setLocation(locationSelector);
        }
    }, [locationSelector, editMode, id]);

    useEffect(() => {
        if (editMode && location?.uuid === id && entities && entities.length > 0) {
            dispatch(entityActions.listLocationAttributeDescriptors({ entityUuid: location!.entityInstanceUuid }));
        }
    }, [dispatch, editMode, location, id, entities]);

    const onEntityChange = useCallback(
        (value: string) => {
            if (!value) return;
            dispatch(connectorActions.clearCallbackData());
            setGroupAttributesCallbackAttributes([]);
            dispatch(entityActions.listLocationAttributeDescriptors({ entityUuid: value }));
        },
        [dispatch],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: editMode ? location?.name || '' : '',
            description: editMode ? location?.description || '' : '',
            entity: editMode ? location?.entityInstanceUuid || '' : '',
        }),
        [editMode, location],
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

    const watchedEntity = useWatch({
        control,
        name: 'entity',
    });

    // Reset form values when location is loaded in edit mode
    useEffect(() => {
        if (editMode && id && location?.uuid === id && !isFetchingLocationDetail) {
            const newDefaultValues: FormValues = {
                name: location.name || '',
                description: location.description || '',
                entity: location.entityInstanceUuid || '',
            };
            reset(newDefaultValues, { keepDefaultValues: false });
        } else if (!editMode) {
            // Reset form when switching to create mode
            reset({
                name: '',
                description: '',
                entity: '',
            });
        }
    }, [editMode, location, id, reset, isFetchingLocationDetail]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (editMode) {
                dispatch(
                    locationActions.editLocation({
                        uuid: id!,
                        entityUuid: values.entity,
                        editLocationRequest: {
                            description: values.description || '',
                            enabled: location!.enabled,
                            attributes: collectFormAttributes(
                                'location',
                                [...(locationAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customLocation', resourceCustomAttributes, values),
                        },
                    }),
                );
            } else {
                dispatch(
                    locationActions.addLocation({
                        entityUuid: values.entity,
                        addLocationRequest: {
                            name: values.name,
                            description: values.description || '',
                            enabled: true,
                            attributes: collectFormAttributes(
                                'location',
                                [...(locationAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                                values,
                            ),
                            customAttributes: collectFormAttributes('customLocation', resourceCustomAttributes, values),
                        },
                    }),
                );
            }
        },
        [dispatch, editMode, location, locationAttributeDescriptors, id, groupAttributesCallbackAttributes, resourceCustomAttributes],
    );

    const submitTitle = useMemo(() => (editMode ? 'Save' : 'Create'), [editMode]);

    const inProgressTitle = useMemo(() => (editMode ? 'Saving...' : 'Creating...'), [editMode]);

    const optionsForEntities = useMemo(
        () =>
            entities?.map((entity) => ({
                label: entity.name,
                value: entity.uuid,
            })),
        [entities],
    );

    const title = useMemo(() => (editMode ? `Edit Location: ${location?.name}` : 'Add Location'), [editMode, location]);

    const renderCustomAttributesEditor = useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor id="customLocation" attributeDescriptors={resourceCustomAttributes} attributes={location?.customAttributes} />
        );
    }, [isBusy, location, resourceCustomAttributes]);

    useRunOnSuccessfulFinish(isCreating, createLocationSucceeded, onSuccess);
    useRunOnSuccessfulFinish(isUpdating, updateLocationSucceeded, onSuccess);

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
                                    placeholder="Enter the Location Name"
                                    disabled={editMode}
                                    label="Location Name"
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
                                <TextInput
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onBlur={field.onBlur}
                                    id="description"
                                    type="text"
                                    placeholder="Enter the location description"
                                    label="Location Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="entity"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="entitySelect"
                                        label="Entity"
                                        value={field.value || ''}
                                        onChange={(value) => {
                                            onEntityChange(value as string);
                                            const formValues = getValues();
                                            Object.keys(formValues).forEach((key) => {
                                                if (key.startsWith('__attributes__location__')) {
                                                    setValue(key as any, undefined);
                                                }
                                            });
                                            setValue('storeKind' as any, undefined);
                                            field.onChange(value);
                                        }}
                                        options={optionsForEntities || []}
                                        placeholder="Select Entity"
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

                        <TabLayout
                            noBorder
                            onlyActiveTabContent={false}
                            tabs={[
                                {
                                    title: 'Connector Attributes',
                                    content:
                                        watchedEntity && locationAttributeDescriptors && locationAttributeDescriptors.length > 0 ? (
                                            <AttributeEditor
                                                id="location"
                                                callbackParentUuid={location?.entityInstanceUuid ?? watchedEntity}
                                                callbackResource={Resource.Locations}
                                                attributeDescriptors={locationAttributeDescriptors}
                                                attributes={location?.attributes}
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
