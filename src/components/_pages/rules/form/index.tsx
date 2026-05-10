import Widget from 'components/Widget';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { Resource } from 'types/openapi';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';

export interface RuleFormValues {
    name: string;
    resource: string;
    description: string;
    conditionsUuids: { value: string; label: string }[];
}

interface RulesFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const RulesForm = ({ onCancel, onSuccess }: RulesFormProps = {}) => {
    const dispatch = useDispatch();

    const conditions = useSelector(rulesSelectors.conditions);
    const isCreatingRule = useSelector(rulesSelectors.isCreatingRule);
    const createRuleSucceeded = useSelector(rulesSelectors.createRuleSucceeded);
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions();

    const isBusy = useMemo(() => isCreatingRule || isFetchingResourcesList, [isCreatingRule, isFetchingResourcesList]);

    const conditionsOptions = useMemo(() => {
        if (conditions === undefined) return [];
        return conditions.map((condition) => {
            return { value: condition.uuid, label: condition.name };
        });
    }, [conditions]);

    const defaultValues: RuleFormValues = useMemo(() => {
        return {
            name: '',
            resource: Resource.None,
            description: '',
            conditionsUuids: [],
        };
    }, []);

    const methods = useForm<RuleFormValues>({
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

    useEffect(() => {
        if (!watchedResource || watchedResource === Resource.None) return;
        dispatch(rulesActions.listConditions({ resource: watchedResource as Resource }));
    }, [dispatch, watchedResource]);

    useEffect(() => {
        return () => {
            dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        };
    }, [dispatch]);

    useRunOnSuccessfulFinish(isCreatingRule, createRuleSucceeded, onSuccess);

    const submitTitle = 'Create';
    const inProgressTitle = 'Creating...';

    const onSubmit = useCallback(
        (values: RuleFormValues) => {
            if (values.resource === Resource.None) return;
            dispatch(
                rulesActions.createRule({
                    rule: {
                        description: values.description,
                        name: values.name,
                        resource: values.resource as Resource,
                        conditionsUuids: values.conditionsUuids.map((condition) => condition.value),
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
                <Widget busy={isBusy} noBorder>
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
                                    label="Rule Name"
                                    required
                                    placeholder="Enter the Condition Group Name"
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
                                                setValue('conditionsUuids', []);
                                                dispatch(
                                                    filterActions.setCurrentFilters({
                                                        currentFilters: [],
                                                        entity: EntityType.CONDITIONS,
                                                    }),
                                                );
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

                        <div>
                            <Controller
                                name="conditionsUuids"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="conditionsSelect"
                                            label="Conditions"
                                            isMulti
                                            value={field.value || []}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={conditionsOptions}
                                            placeholder="Select Conditions"
                                            isClearable
                                            isDisabled={watchedResource === Resource.None || !watchedResource}
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

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={
                                    areDefaultValuesSame(formValues as unknown as Record<string, unknown>) ||
                                    formValues.resource === Resource.None ||
                                    isSubmitting ||
                                    !isValid ||
                                    isBusy ||
                                    (formValues.conditionsUuids?.length ?? 0) === 0
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

export default RulesForm;
