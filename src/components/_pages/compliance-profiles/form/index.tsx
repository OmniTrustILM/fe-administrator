import ProgressButton from 'components/ProgressButton';

import Widget from 'components/Widget';

import { actions, selectors } from 'ducks/compliance-profiles';
import { useCallback, useEffect, useMemo } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import Container from 'components/Container';
import { validateAlphaNumericWithSpecialChars, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';
import { Resource } from '../../../../types/openapi';
import { collectFormAttributes } from '../../../../utils/attributes/attributes';
import AttributeEditor from '../../../Attributes/AttributeEditor';
import TabLayout from '../../../Layout/TabLayout';
import Label from 'components/Label';
import TextInput from 'components/TextInput';

type ComplianceProfileFormProps = Readonly<{
    complianceProfileId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

interface FormValues {
    name: string;
    description: string;
}

function ComplianceProfileForm({ complianceProfileId, onCancel, onSuccess }: ComplianceProfileFormProps) {
    const dispatch = useDispatch();

    const isCreating = useSelector(selectors.isCreating);
    const createComplianceProfileSucceeded = useSelector(selectors.createComplianceProfileSucceeded);
    const resourceCustomAttributes = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    useEffect(() => {
        dispatch(customAttributesActions.listResourceCustomAttributes(Resource.ComplianceProfiles));
    }, [dispatch]);

    const isBusy = useMemo(() => isCreating || isFetchingResourceCustomAttributes, [isCreating, isFetchingResourceCustomAttributes]);

    const onSubmit = useCallback(
        (values: FormValues) => {
            dispatch(
                actions.createComplianceProfile({
                    name: values.name,
                    description: values.description,
                    customAttributes: collectFormAttributes('customCompliance', resourceCustomAttributes, values),
                }),
            );
        },
        [dispatch, resourceCustomAttributes],
    );

    const defaultValues: FormValues = useMemo(
        () => ({
            name: '',
            description: '',
        }),
        [],
    );

    const methods = useForm<FormValues>({
        defaultValues,
        mode: 'onChange',
    });

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
    } = methods;

    useRunOnSuccessfulFinish(isCreating, createComplianceProfileSucceeded, onSuccess);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Widget noBorder busy={isBusy}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name" required>
                                Profile Name
                            </Label>
                            <Controller
                                name="name"
                                control={control}
                                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithSpecialChars()])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        id="name"
                                        placeholder="Compliance Profile Name"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Profile Description</Label>
                            <Controller
                                name="description"
                                control={control}
                                rules={buildValidationRules([validateLength(0, 300)])}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        id="description"
                                        placeholder="Compliance Profile Description"
                                        invalid={fieldState.error && fieldState.isTouched}
                                        error={getFieldErrorMessage(fieldState)}
                                    />
                                )}
                            />
                        </div>

                        <TabLayout
                            noBorder
                            tabs={[
                                {
                                    title: 'Custom Attributes',
                                    content: <AttributeEditor id="customCompliance" attributeDescriptors={resourceCustomAttributes} />,
                                },
                            ]}
                        />

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={'Create'}
                                inProgressTitle={'Creating...'}
                                inProgress={isSubmitting}
                                disabled={!isDirty || isSubmitting || !isValid}
                                type="submit"
                            />
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}

export default ComplianceProfileForm;
