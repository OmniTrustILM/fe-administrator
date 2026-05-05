import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { type ComplianceRuleListDto, type ConditionItemRequestDto, Resource } from 'types/openapi';
import Select from 'components/Select';
import Button from 'components/Button';
import { useComplianceProfileResourceOptions } from 'utils/rules';
import { composeValidators, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import ProgressButton from 'components/ProgressButton';
import { EntityType, actions as filterActions } from 'ducks/filters';
import { useDispatch, useSelector } from 'react-redux';
import ConditionFormFilter from 'components/ConditionFormFilter';
import { actions as complianceActions, selectors as complianceSelectors } from 'ducks/compliance-profiles';
import cn from 'classnames';
import TextInput from 'components/TextInput';
import Container from 'components/Container';

type Props = Readonly<{
    rule?: ComplianceRuleListDto;
    onCancel: () => void;
}>;

type FormValues = {
    name: string;
    description: string;
    resource: Resource;
    items: ConditionItemRequestDto[];
};

export default function InternalRuleForm({ rule, onCancel }: Props) {
    const dispatch = useDispatch();

    const { resourceOptionsWithComplianceProfile, isFetchingResourcesList } = useComplianceProfileResourceOptions();
    const isCreatingComplienceInternalRule = useSelector(complianceSelectors.isCreatingComplienceInternalRule);
    const isUpdatingComplienceInternalRule = useSelector(complianceSelectors.isUpdatingComplienceInternalRule);
    const isBusy = useMemo(
        () => isFetchingResourcesList || isCreatingComplienceInternalRule || isUpdatingComplienceInternalRule,
        [isFetchingResourcesList, isCreatingComplienceInternalRule, isUpdatingComplienceInternalRule],
    );

    const defaultValues: FormValues = useMemo(() => {
        if (rule) {
            return {
                name: rule.name,
                description: rule.description || '',
                resource: rule.resource,
                items: rule.conditionItems || [],
            };
        }
        return { name: '', description: '', resource: Resource.None, items: [] };
    }, [rule]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            if (rule) {
                dispatch(
                    complianceActions.updateComplienceInternalRule({
                        internalRuleUuid: rule.uuid,
                        complianceInternalRuleRequestDto: {
                            name: values.name,
                            description: values.description,
                            resource: values.resource,
                            conditionItems: values.items,
                        },
                    }),
                );
            } else {
                dispatch(
                    complianceActions.createComplianceInternalRule({
                        complianceInternalRuleRequestDto: {
                            name: values.name,
                            description: values.description,
                            resource: values.resource,
                            conditionItems: values.items,
                        },
                    }),
                );
            }

            onCancel();
        },
        [dispatch, onCancel, rule],
    );

    useEffect(() => {
        if (rule) {
            dispatch(
                filterActions.setCurrentFilters({
                    currentFilters: rule.conditionItems?.length
                        ? rule.conditionItems?.map((item) => ({
                              fieldSource: item.fieldSource,
                              fieldIdentifier: item.fieldIdentifier,
                              condition: item.operator,
                              value: item.value,
                          }))
                        : [],
                    entity: EntityType.CONDITIONS,
                }),
            );
        }
    }, [dispatch, rule]);

    useEffect(() => {
        return () => {
            dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
        };
    }, [dispatch]);

    const methods = useForm<FormValues>({
        mode: 'onTouched',
        defaultValues,
    });

    const { control, handleSubmit, setValue, formState } = methods;
    const watchedResource = useWatch({ control, name: 'resource' });
    const watchedItems = useWatch({ control, name: 'items' });

    const selectOptions = useMemo(
        () =>
            resourceOptionsWithComplianceProfile.map((opt) => ({
                value: opt.value,
                label: opt.label,
            })),
        [resourceOptionsWithComplianceProfile],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <Controller
                        name="name"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <TextInput
                                id="name"
                                type="text"
                                label="Internal Rule Name"
                                placeholder="Enter the Rule Name"
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                onBlur={field.onBlur}
                                required
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />
                    <Controller
                        name="description"
                        control={control}
                        rules={buildValidationRules([composeValidators(validateLength(0, 300))])}
                        render={({ field, fieldState }) => (
                            <TextInput
                                id="description"
                                type="text"
                                label="Description"
                                placeholder="Enter Description / Comment"
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                onBlur={field.onBlur}
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />
                    <Controller
                        name="resource"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <Select
                                id="resourceSelect"
                                options={selectOptions}
                                value={field.value}
                                onChange={(value) => {
                                    const newValue = (value as Resource) || Resource.None;
                                    field.onChange(newValue);
                                    setValue('items', []);
                                    dispatch(filterActions.setCurrentFilters({ currentFilters: [], entity: EntityType.CONDITIONS }));
                                }}
                                placeholder="Select Resource"
                                minWidth={180}
                                isClearable
                                className={cn({
                                    'border-red-500': fieldState.error && fieldState.isTouched,
                                })}
                                label="Resource"
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />

                    <ConditionFormFilter formType="conditionItem" resource={watchedResource} />

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" color="primary" onClick={onCancel} disabled={formState.isSubmitting} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            title={rule ? 'Update' : 'Create'}
                            inProgressTitle={rule ? 'Updating...' : 'Creating...'}
                            inProgress={formState.isSubmitting}
                            disabled={
                                watchedResource === Resource.None ||
                                formState.isSubmitting ||
                                !formState.isValid ||
                                isBusy ||
                                !watchedItems?.length
                            }
                        />
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
