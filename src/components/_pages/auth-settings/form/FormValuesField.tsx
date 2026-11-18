import MultipleValueTextInput from 'components/Input/MultipleValueTextInput';
import Label from 'components/Label';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from './form-model';

type ValuesFieldName = { [K in keyof FormValues]: string[] extends FormValues[K] ? K : never }[keyof FormValues];

type Props = {
    name: ValuesFieldName;
    label: string;
    description: string;
    placeholder: string;
    addPlaceholder: string;
    storedValues?: string[];
};

export default function FormValuesField({ name, label, description, placeholder, addPlaceholder, storedValues }: Readonly<Props>) {
    const { control } = useFormContext<FormValues>();

    return (
        <div>
            <Label htmlFor={name}>{label}</Label>
            <p className="text-sm text-content-subtle mb-2">{description}</p>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <MultipleValueTextInput
                        id={name}
                        selectedValues={field.value || []}
                        onValuesChange={field.onChange}
                        placeholder={placeholder}
                        addPlaceholder={addPlaceholder}
                        initialOptions={storedValues?.map((value) => ({ label: value, value })) || []}
                    />
                )}
            />
        </div>
    );
}
