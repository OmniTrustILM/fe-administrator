import Widget from 'components/Widget';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo } from 'react';
import { useAreDefaultValuesSame, useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import ProgressButton from 'components/ProgressButton';
import { selectors as enumSelectors, getEnumDescription, getEnumLabel } from 'ducks/enums';
import Select from 'components/Select';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { ConditionType, PlatformEnum, Resource } from 'types/openapi';
import type { ConditionItemModel } from 'types/rules';
import { useRuleEvaluatorResourceOptions } from 'utils/rules';
import { validateAlphaNumericWithSpecialChars, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import ConditionFormFilter from '../../../ConditionFormFilter';

export interface ConditionFormValues {
    name: string;
    resource: string;
    description: string;
    type: string;
    items: ConditionItemModel[];
}

interface ConditionFormProps {
    onCancel?: () => void;
    onSuccess?: () => void;
}

const ConditionForm = ({ onCancel, onSuccess }: ConditionFormProps = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isCreatingCondition = useSelector(rulesSelectors.isCreatingCondition);
    const createConditionSucceeded = useSelector(rulesSelectors.createConditionSucceeded);
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));
    const { resourceOptionsWithRuleEvaluator, isFetchingResourcesList } = useRuleEvaluatorResourceOptions({ includeAny: false });

    const isBusy = useMemo(() => isCreatingCondition || isFetchingResourcesList, [isCreatingCondition, isFetchingResourcesList]);

    useEffect(() => {
        return () => {
            dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        };
    }, [dispatch]);

    useRunOnSuccessfulFinish(isCreatingCondition, createConditionSucceeded, onSuccess);

    const defaultValues: ConditionFormValues = useMemo(() => {
        return {
            name: '',
            resource: Resource.None,
            description: '',
            type: '',
            items: [],
        };
    }, []);

    const methods = useForm<ConditionFormValues>({
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

    const submitTitle = 'Create';
    const inProgressTitle = 'Creating...';

    const typeOptions = useMemo(() => {
        return [{ value: ConditionType.CheckField, label: getEnumLabel(conditionTypeEnum, ConditionType.CheckField) }];
    }, [conditionTypeEnum]);

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            navigate('../rules?tab=conditions');
        }
    }, [navigate, onCancel]);

    const onSubmit = useCallback(
        (values: ConditionFormValues) => {
            if (values.resource === Resource.None || !values.type) return;
            dispatch(
                rulesActions.createCondition({
                    conditionRequestModel: {
                        items: values.items,
                        type: values.type as ConditionType,
                        name: values.name,
                        resource: values.resource as Resource,
                        description: values.description,
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
                                    label="Condition Name"
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
                                name="type"
                                control={control}
                                rules={buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Select
                                            id="typeSelect"
                                            label="Condition Type"
                                            value={field.value || ''}
                                            onChange={(value) => {
                                                field.onChange(value);
                                            }}
                                            options={typeOptions.map((opt) => ({
                                                value: opt.value,
                                                label: opt.label,
                                                description: getEnumDescription(conditionTypeEnum, opt.value),
                                            }))}
                                            placeholder="Select Condition Type"
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
                        </div>

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
                                                setValue('items', []);
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

                        <ConditionFormFilter formType="conditionItem" resource={watchedResource as Resource} />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={submitTitle}
                                inProgressTitle={inProgressTitle}
                                inProgress={isSubmitting}
                                disabled={
                                    areDefaultValuesSame(formValues) ||
                                    formValues.resource === Resource.None ||
                                    isSubmitting ||
                                    !isValid ||
                                    isBusy ||
                                    !(formValues.items?.length ?? 0)
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

export default ConditionForm;
