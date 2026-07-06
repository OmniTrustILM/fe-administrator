import Widget from 'components/Widget';
import { selectors as rulesSelectors, actions as rulesActions } from 'ducks/rules';
import { useCallback, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import ConditionFormFilter from 'components/ConditionFormFilter';
import ProgressButton from 'components/ProgressButton';
import TextInput from 'components/TextInput';
import { selectors as enumSelectors, getEnumDescription, getEnumLabel } from 'ducks/enums';
import { ExecutionType, PlatformEnum, Resource } from 'types/openapi';
import type { ExecutionItemRequestModel } from 'types/rules';
import { useAreDefaultValuesSame } from 'utils/common-hooks';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { SendNotificationExecutionItems } from 'components/_pages/executions/SendNotificationExecutionItems';

export interface ExecutionFormValues {
    name: string;
    resource: Resource;
    description: string;
    items: ExecutionItemRequestModel[];
    notificationProfileItems: { value: string; label: string }[];
    type: ExecutionType | '';
}

const ExecutionForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const title = 'Create Execution';
    const isCreatingExecution = useSelector(rulesSelectors.isCreatingExecution);
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions();
    const isBusy = useMemo(() => isCreatingExecution || isFetchingResourcesList, [isCreatingExecution, isFetchingResourcesList]);
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const executionTypeOptions = useMemo(() => {
        return [
            {
                value: ExecutionType.SetField,
                label: getEnumLabel(executionTypeEnum, ExecutionType.SetField),
                description: getEnumDescription(executionTypeEnum, ExecutionType.SetField),
            },
            {
                value: ExecutionType.SendNotification,
                label: getEnumLabel(executionTypeEnum, ExecutionType.SendNotification),
                description: getEnumDescription(executionTypeEnum, ExecutionType.SendNotification),
            },
        ];
    }, [executionTypeEnum]);

    const defaultValues: ExecutionFormValues = useMemo(() => {
        return {
            name: '',
            resource: Resource.None,
            description: '',
            items: [],
            notificationProfileItems: [],
            type: '',
        };
    }, []);

    const submitTitle = 'Create';
    const inProgressTitle = 'Creating...';

    const onCancel = useCallback(() => {
        navigate('../actions/1');
    }, [navigate]);

    const methods = useForm<ExecutionFormValues>({
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
    const watchedType = useWatch({
        control,
        name: 'type',
    });

    const watchedResource = useWatch({
        control,
        name: 'resource',
    });

    const onSubmit = useCallback(
        (values: ExecutionFormValues) => {
            switch (values.type) {
                case ExecutionType.SetField:
                    if (values.resource === Resource.None || !values.type) return;
                    dispatch(
                        rulesActions.createExecution({
                            executionRequestModel: {
                                items: values.items,
                                type: values.type,
                                name: values.name,
                                description: values.description,
                                resource: values.resource,
                            },
                        }),
                    );
                    break;
                case ExecutionType.SendNotification:
                    dispatch(
                        rulesActions.createExecution({
                            executionRequestModel: {
                                items:
                                    values.notificationProfileItems?.map((el) => ({
                                        notificationProfileUuid: el.value,
                                    })) ?? [],
                                type: values.type,
                                name: values.name,
                                description: values.description,
                                resource: values.resource,
                            },
                        }),
                    );
                    break;
            }
        },
        [dispatch],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

    return (
        <>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Actions)} Inventory`, href: '/actions/1' },
                    { label: title, href: '' },
                ]}
            />
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Widget title={title} busy={isBusy}>
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
                                        label="Execution Name"
                                        required
                                        placeholder="Enter the Execution Name"
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

                            <Controller
                                name="type"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="typeSelect"
                                            label="Execution Type"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                setValue('resource', Resource.Any);
                                            }}
                                            options={executionTypeOptions}
                                            placeholder="Select Execution Type"
                                            isClearable
                                            placement="bottom"
                                            showOptionDescriptionInDropdown
                                            showSelectedDescriptionAsHelp
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
                                name="resource"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="resourceSelect"
                                            label="Resource"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                setValue('items', []);
                                            }}
                                            options={resourceOptionsWithRuleEvaluator || []}
                                            placeholder="Select Resource"
                                            minWidth={180}
                                            disabled={watchedType === ExecutionType.SendNotification}
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

                            {watchedType === ExecutionType.SetField && watchedResource && (
                                <ConditionFormFilter formType="executionItem" resource={watchedResource} />
                            )}

                            {watchedType === ExecutionType.SendNotification && (
                                <Controller
                                    name="notificationProfileItems"
                                    control={control}
                                    render={({ field }) => (
                                        <SendNotificationExecutionItems
                                            mode="form"
                                            notificationProfileItems={field.value}
                                            onNotificationProfileItemsChange={(newItems) => {
                                                field.onChange(newItems);
                                            }}
                                        />
                                    )}
                                />
                            )}

                            <Container className="flex-row justify-end" gap={4}>
                                <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                    Cancel
                                </Button>
                                <ProgressButton
                                    title={submitTitle}
                                    inProgressTitle={inProgressTitle}
                                    inProgress={isSubmitting}
                                    disabled={
                                        areDefaultValuesSame(formValues) ||
                                        (formValues.resource === Resource.None && formValues.type !== ExecutionType.SendNotification) ||
                                        isSubmitting ||
                                        !isValid ||
                                        isBusy ||
                                        (!formValues.items?.length && !formValues.notificationProfileItems?.length)
                                    }
                                    type="submit"
                                />
                            </Container>
                        </div>
                    </Widget>
                </form>
            </FormProvider>
        </>
    );
};

export default ExecutionForm;
