import type React from 'react';
import * as ReactHookForm from 'react-hook-form';
import { AttributeFieldSelect } from './AttributeFieldSelect';
import type { DataAttributeModel } from 'types/attributes';

export type AttributeFieldSelectTestWrapperProps = Readonly<{
    name: string;
    descriptor: DataAttributeModel;
    options?: { label: string; value: string | number }[];
    busy?: boolean;
    deleteButton?: React.ReactNode;
    addNewAttributeValue?: { label: string; value: string; disabled?: boolean };
    defaultValues?: Record<string, unknown>;
}>;

export function AttributeFieldSelectTestWrapper({
    name,
    descriptor,
    options = [],
    busy = false,
    deleteButton,
    addNewAttributeValue,
    defaultValues = {},
}: AttributeFieldSelectTestWrapperProps) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [name]: undefined,
            ...defaultValues,
        },
    });

    const onSelectChangeMulti = (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
        if (Array.isArray(newValue) && newValue.some((v: any) => v.value === '__add_new__')) {
            const filtered = newValue.filter((v: any) => v.value !== '__add_new__');
            fieldOnChange(filtered.length > 0 ? filtered : undefined);
            return;
        }
        fieldOnChange(newValue);
    };
    const onSelectChangeSingle = (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
        if (newValue === '__add_new__') return; // simulate production: modal opens, field unchanged
        fieldOnChange(newValue);
    };

    return (
        <ReactHookForm.FormProvider {...methods}>
            <AttributeFieldSelect
                name={name}
                descriptor={descriptor}
                options={options}
                busy={busy}
                deleteButton={deleteButton}
                addNewAttributeValue={addNewAttributeValue}
                onSelectChangeMulti={onSelectChangeMulti}
                onSelectChangeSingle={onSelectChangeSingle}
            />
        </ReactHookForm.FormProvider>
    );
}
