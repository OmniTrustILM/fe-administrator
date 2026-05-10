import Widget from 'components/Widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';

import { actions as resourceActions, selectors as resourceSelectors } from 'ducks/resource';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import ProgressButton from 'components/ProgressButton';
import Switch from 'components/Switch';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import { PlatformEnum, Resource, type ResourceEvent, TriggerType } from 'types/openapi';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import TextInput from 'components/TextInput';

export interface TriggerFormValues {
    name: string;
    description: string;
    resource: string;
    triggerType: string;
    event: string;
    actionsUuids: { value: string; label: string }[];
    rulesUuids: { value: string; label: string }[];
    ignoreTrigger: boolean;
}

interface TriggerFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const TriggerForm = ({ onCancel, onSuccess }: TriggerFormProps = {}) => {
    const dispatch = useDispatch();

    const actionsList = useSelector(rulesSelectors.actionsList);
    const allResourceEvents = useSelector(resourceSelectors.allResourceEvents);
    const rules = useSelector(rulesSelectors.rules);
    const isCreatingTrigger = useSelector(rulesSelectors.isCreatingTrigger);
    const createTriggerSucceeded = useSelector(rulesSelectors.createTriggerSucceeded);

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceEventEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const ruleTriggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));

    const isBusy = useMemo(() => isCreatingTrigger, [isCreatingTrigger]);

    const getResourceEventNameOptions = useCallback(
        (resource?: Resource) => {
            if (allResourceEvents === undefined) return [];
            return allResourceEvents
                .filter((el) => resource === undefined || el.producedResource === resource)
                .map((event) => {
                    return { value: event, label: getEnumLabel(resourceEventEnum, event.event) };
                });
        },
        [allResourceEvents, resourceEventEnum],
    );

    useEffect(() => {
        dispatch(resourceActions.listAllResourceEvents());
    }, [dispatch]);

    const resourceOptions = useMemo(() => {
        if (allResourceEvents === undefined) return [];
        const resourcesSet = new Set(allResourceEvents.map((event) => event.producedResource).filter(Boolean));
        return [...resourcesSet].map((resource) => ({
            label: getEnumLabel(resourceEnum, resource as Resource),
            value: resource as Resource,
        }));
    }, [allResourceEvents, resourceEnum]);

    const actionsOptions = useMemo(() => {
        if (actionsList === undefined) return [];
        return actionsList.map((action) => {
            return { value: action.uuid, label: action.name };
        });
    }, [actionsList]);

    const rulesOptions = useMemo(() => {
        if (rules === undefined) return [];
        return rules.map((rule) => {
            return { value: rule.uuid, label: rule.name };
        });
    }, [rules]);

    const ruleTriggerTypeOptions = useMemo(() => {
        return [{ value: TriggerType.Event, label: getEnumLabel(ruleTriggerTypeEnum, TriggerType.Event) }];
    }, [ruleTriggerTypeEnum]);

    const fetchActions = useCallback(
        (resource: Resource) => {
            dispatch(rulesActions.listActions({ resource: resource }));
        },
        [dispatch],
    );

    const fetchRules = useCallback(
        (resource: Resource) => {
            dispatch(rulesActions.listRules({ resource: resource }));
        },
        [dispatch],
    );

    const defaultValues: TriggerFormValues = useMemo(() => {
        return {
            name: '',
            resource: Resource.None,
            description: '',
            actionsUuids: [],
            rulesUuids: [],
            triggerType: '',
            event: '',
            ignoreTrigger: false,
        };
    }, []);

    const methods = useForm<TriggerFormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
        setValue,
    } = methods;

    const formValues = useWatch({ control });
    const watchedResource = useWatch({
        control,
        name: 'resource',
    });

    const watchedTriggerType = useWatch({
        control,
        name: 'triggerType',
    });

    const watchedIgnoreTrigger = useWatch({
        control,
        name: 'ignoreTrigger',
    });

    useEffect(() => {
        if (!watchedResource || watchedResource === Resource.None) return;
        fetchActions(watchedResource as Resource);
        fetchRules(watchedResource as Resource);
    }, [dispatch, watchedResource, fetchActions, fetchRules]);

    const submitTitle = 'Create';
    const inProgressTitle = 'Creating...';

    const onSubmit = useCallback(
        (values: TriggerFormValues) => {
            if (!values.resource || values.resource === Resource.None) return;
            dispatch(
                rulesActions.createTrigger({
                    trigger: {
                        name: values.name,
                        description: values.description,
                        resource: values.resource as Resource,
                        ignoreTrigger: values.ignoreTrigger,
                        actionsUuids: values.actionsUuids.map((action) => action.value),
                        event: values.event ? (values.event as ResourceEvent) : undefined,
                        rulesUuids: values.rulesUuids.map((rule) => rule.value),
                        type: values.triggerType ? (values.triggerType as TriggerType) : undefined,
                    },
                }),
            );
        },
        [dispatch],
    );

    useRunOnSuccessfulFinish(isCreatingTrigger, createTriggerSucceeded, onSuccess);

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    const getEventOptions = useMemo(() => {
        return getResourceEventNameOptions(watchedResource as Resource).map((opt) => ({
            value: opt.value.event,
            label: opt.label,
        }));
    }, [watchedResource, getResourceEventNameOptions]);

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
                                    {...field}
                                    id="name"
                                    type="text"
                                    label="Trigger Name"
                                    required
                                    placeholder="Enter Trigger name"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="description"
                                    type="text"
                                    label="Description"
                                    placeholder="Enter the Description"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />

                        <div>
                            <Controller
                                name="resource"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="resourceSelect"
                                            label="Resource"
                                            value={field.value || Resource.None}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                setValue('event', '');
                                                setValue('actionsUuids', []);
                                                setValue('rulesUuids', []);
                                            }}
                                            options={resourceOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                                            placeholder="Select Resource"
                                            minWidth={180}
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

                        <div>
                            <Controller
                                name="triggerType"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="triggerTypeSelect"
                                            label="Type"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                setValue('event', '');
                                                setValue('actionsUuids', []);
                                                setValue('rulesUuids', []);
                                            }}
                                            options={ruleTriggerTypeOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                                            placeholder="Select Trigger Type"
                                            isClearable
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

                        {watchedTriggerType === TriggerType.Event && (
                            <div>
                                <Controller
                                    name="event"
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id="eventSelect"
                                                label="Event"
                                                value={field.value || ''}
                                                onChange={(value) => {
                                                    field.onChange(value);
                                                }}
                                                options={getEventOptions}
                                                placeholder="Select Event"
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

                        <div className="flex items-center gap-2">
                            <Controller
                                name="ignoreTrigger"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="ignoreTrigger"
                                        checked={field.value}
                                        onChange={(checked) => {
                                            field.onChange(checked);
                                            if (!checked) {
                                                setValue('actionsUuids', []);
                                            }
                                        }}
                                        label="Ignore Trigger"
                                    />
                                )}
                            />
                        </div>

                        {watchedResource && watchedResource !== Resource.None && (
                            <>
                                <Controller
                                    name="rulesUuids"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="ruleSelect"
                                            label="Rules"
                                            isMulti
                                            value={field.value || []}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={rulesOptions}
                                            placeholder="Select Rule"
                                            isClearable
                                            isDisabled={watchedResource === Resource.None || !watchedResource || !rulesOptions.length}
                                        />
                                    )}
                                />

                                <Controller
                                    name="actionsUuids"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            id="actionsSelect"
                                            label="Actions"
                                            isMulti
                                            value={field.value || []}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={actionsOptions}
                                            placeholder="Select Actions"
                                            isClearable
                                            isDisabled={watchedResource === Resource.None || !watchedResource || watchedIgnoreTrigger}
                                        />
                                    )}
                                />
                            </>
                        )}

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={
                                    areDefaultValuesSame(formValues as TriggerFormValues) ||
                                    formValues.resource === Resource.None ||
                                    isSubmitting ||
                                    !isValid ||
                                    isBusy ||
                                    (!formValues.ignoreTrigger && (formValues.actionsUuids?.length ?? 0) === 0)
                                }
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
};

export default TriggerForm;
