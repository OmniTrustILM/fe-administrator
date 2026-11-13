import type React from 'react';
import { useEffect, useState } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { AttributeFieldSelect } from './AttributeFieldSelect';
import type { DataAttributeModel } from 'types/attributes';

export type AttributeFieldSelectTestWrapperProps = {
    name: string;
    descriptor: DataAttributeModel;
    options?: { label: string; value: string | number }[];
    busy?: boolean;
    deleteButton?: React.ReactNode;
    addNewAttributeValue?: { label: string; value: string; disabled?: boolean };
    defaultValues?: Record<string, unknown>;
    mode?: ReactHookForm.Mode;
    validateOnMount?: boolean;
    withNextField?: boolean;
};

export function AttributeFieldSelectTestWrapper({
    name,
    descriptor,
    options = [],
    busy = false,
    deleteButton,
    addNewAttributeValue,
    defaultValues = {},
    mode,
    validateOnMount = false,
    withNextField = false,
}: Readonly<AttributeFieldSelectTestWrapperProps>) {
    const methods = ReactHookForm.useForm({
        mode,
        defaultValues: {
            [name]: undefined,
            ...defaultValues,
        },
    });
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (validateOnMount) void methods.trigger(name);
    }, [validateOnMount, methods, name]);

    const onSelectChangeMulti = (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
        const selected: unknown[] = Array.isArray(newValue) ? newValue : [];
        const toRawValue = (v: unknown) => (v && typeof v === 'object' && 'value' in v ? (v as { value: unknown }).value : v);
        if (selected.some((v) => toRawValue(v) === '__add_new__')) {
            const filtered = selected.filter((v) => toRawValue(v) !== '__add_new__').map(toRawValue);
            fieldOnChange(filtered.length > 0 ? filtered : undefined);
            return;
        }
        const rawValues = selected.map(toRawValue);
        fieldOnChange(rawValues.length > 0 ? rawValues : undefined);
    };
    const onSelectChangeSingle = (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
        if (newValue === '__add_new__') return; // simulate production: modal opens, field unchanged
        fieldOnChange(newValue);
    };

    const field = (
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
    );

    return (
        <ReactHookForm.FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(() => setSubmitted(true))}>
                {field}
                {withNextField && <input aria-label="Next field" />}
                <button type="submit" data-testid="submit-form">
                    Submit
                </button>
                <span data-testid="submit-count">{methods.formState.submitCount}</span>
                {submitted && <span data-testid="submit-success">submitted</span>}
            </form>
        </ReactHookForm.FormProvider>
    );
}
