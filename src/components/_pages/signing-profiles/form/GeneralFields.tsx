import type { ReactElement } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import TextInput from 'components/TextInput';
import { SigningWorkflowType } from 'types/openapi';
import { validateAlphaNumericWithoutAccents, validateLength, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import OptionCards from './OptionCards';
import { type SigningProfileFormValues, workflowSpecificDefaults } from './signingProfileFormValues';

export const workflowTypeLabels: Record<SigningWorkflowType, string> = {
    [SigningWorkflowType.Timestamping]: 'Timestamping',
    [SigningWorkflowType.ContentSigning]: 'Content Signing',
    [SigningWorkflowType.RawSigning]: 'Raw Signing',
};

const workflowTypeOption = (workflowType: SigningWorkflowType) => ({ value: workflowType, label: workflowTypeLabels[workflowType] });

const workflowTypeOptions = [SigningWorkflowType.Timestamping, SigningWorkflowType.ContentSigning, SigningWorkflowType.RawSigning].map(
    workflowTypeOption,
);

export default function GeneralFields(): ReactElement {
    const { control, setValue } = useFormContext<SigningProfileFormValues>();
    const workflowType = useWatch({ control, name: 'workflowType' });

    const switchWorkflow = (next: SigningWorkflowType) => {
        setValue('workflowType', next, { shouldDirty: true });
        for (const [name, value] of Object.entries(workflowSpecificDefaults)) {
            setValue(name, value, { shouldDirty: true });
        }
    };

    return (
        <div className="space-y-4">
            <Controller
                name="name"
                control={control}
                rules={buildValidationRules([validateRequired(), validateAlphaNumericWithoutAccents(), validateLength(1, 255)])}
                render={({ field, fieldState }) => (
                    <TextInput
                        {...field}
                        id="signingProfileName"
                        type="text"
                        label="Signing Profile Name"
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
                        {...field}
                        id="description"
                        type="text"
                        label="Description"
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />
            <OptionCards
                name="workflowType"
                label="Signing Workflow Type"
                options={workflowTypeOptions}
                selected={workflowType}
                onSelect={switchWorkflow}
            />
        </div>
    );
}
