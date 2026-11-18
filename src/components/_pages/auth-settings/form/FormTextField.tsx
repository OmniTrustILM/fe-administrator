import TextInput from 'components/TextInput';
import { Controller, useFormContext } from 'react-hook-form';
import { type FieldValidator, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import type { FormValues } from './form-model';

export type TextFieldName = { [K in keyof FormValues]: FormValues[K] extends string ? K : never }[keyof FormValues];

type Props = {
    name: TextFieldName;
    label: string;
    description: string;
    required?: boolean;
    validators?: FieldValidator[];
    deps?: TextFieldName[];
    type?: 'text' | 'password' | 'number';
    placeholder?: string;
};

export default function FormTextField({
    name,
    label,
    description,
    required = false,
    validators = [],
    deps,
    type = 'text',
    placeholder,
}: Readonly<Props>) {
    const { control } = useFormContext<FormValues>();
    const allValidators = required ? [validateRequired(), ...validators] : validators;

    return (
        <div>
            <p className="text-sm text-content-subtle mb-2">{description}</p>
            <Controller
                name={name}
                control={control}
                rules={{ ...(allValidators.length > 0 ? buildValidationRules(allValidators) : {}), deps }}
                render={({ field, fieldState }) => (
                    <TextInput
                        {...field}
                        id={name}
                        type={type}
                        label={label}
                        placeholder={placeholder}
                        required={required}
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />
        </div>
    );
}
