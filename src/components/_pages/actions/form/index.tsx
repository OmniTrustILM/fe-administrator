import Widget from 'components/Widget';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import type { Resource } from 'types/openapi';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

export interface ActionFormValues {
    name: string;
    resource: string;
    description: string;
    executionsUuids: { value: string; label: string }[];
}

interface ActionsFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const ActionsForm = ({ onCancel, onSuccess }: ActionsFormProps = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const executions = useSelector(rulesSelectors.executions);
    const isCreatingAction = useSelector(rulesSelectors.isCreatingAction);
    const createActionSucceeded = useSelector(rulesSelectors.createActionSucceeded);
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions();

    const isBusy = useMemo(() => isCreatingAction || isFetchingResourcesList, [isCreatingAction, isFetchingResourcesList]);

    const executionsOptions = useMemo(() => {
        if (executions === undefined) return [];
        return executions.map((execution) => {
            return { value: execution.uuid, label: execution.name };
        });
    }, [executions]);

    const defaultValues: ActionFormValues = useMemo(() => {
        return {
            name: '',
            resource: '',
            description: '',
            executionsUuids: [],
        };
    }, []);

    const methods = useForm<ActionFormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid },
        setValue,
    } = methods;

    const watchedResource = useWatch({
        control,
        name: 'resource',
    });

    const formValues = useWatch({ control });

    useEffect(() => {
        if (!watchedResource) return;
        dispatch(
            rulesActions.listExecutions({
                resource: watchedResource as Resource,
            }),
        );
    }, [dispatch, watchedResource]);

    useEffect(() => {
        return () => {
            dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        };
    }, [dispatch]);

    useRunOnSuccessfulFinish(isCreatingAction, createActionSucceeded, onSuccess);

    const submitTitle = 'Create';
    const inProgressTitle = 'Creating...';

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            navigate('../actions');
        }
    }, [navigate, onCancel]);

    const onSubmit = useCallback(
        (values: ActionFormValues) => {
            if (!values.resource) return;
            dispatch(
                rulesActions.createAction({
                    action: {
                        description: values.description,
                        name: values.name,
                        resource: values.resource as Resource,
                        executionsUuids: values.executionsUuids.map((execution) => execution.value),
                    },
                }),
            );
        },
        [dispatch],
    );

    const areDefaultValuesSame = useAreDefaultValuesSame(defaultValues as unknown as Record<string, unknown>);

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
                                    label="Action Name"
                                    required
                                    placeholder="Enter the Action Name"
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
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                                if (value) {
                                                    setValue('executionsUuids', []);
                                                    dispatch(
                                                        filterActions.setCurrentFilters({
                                                            currentFilters: [],
                                                            entity: EntityType.CONDITIONS,
                                                        }),
                                                    );
                                                }
                                            }}
                                            options={
                                                resourceOptionsWithRuleEvaluator?.map((opt) => ({
                                                    value: opt.value,
                                                    label: opt.label,
                                                })) || []
                                            }
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

                        <Controller
                            name="executionsUuids"
                            control={control}
                            rules={buildValidationRules([validateRequired()])}
                            render={({ field, fieldState }) => (
                                <>
                                    <Select
                                        id="executionsSelect"
                                        label="Executions"
                                        isMulti
                                        value={field.value || []}
                                        onChange={(value) => {
                                            field.onChange(value);
                                        }}
                                        options={executionsOptions}
                                        placeholder="Select Executions"
                                        isClearable
                                        isDisabled={!watchedResource}
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

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={
                                    areDefaultValuesSame(formValues as ActionFormValues) ||
                                    isSubmitting ||
                                    !isValid ||
                                    isBusy ||
                                    (formValues.executionsUuids?.length ?? 0) === 0
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

export default ActionsForm;
