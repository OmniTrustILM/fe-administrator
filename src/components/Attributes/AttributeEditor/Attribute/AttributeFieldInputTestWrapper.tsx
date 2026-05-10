import type React from 'react';
import * as ReactHookForm from 'react-hook-form';
import { AttributeFieldInput } from './AttributeFieldInput';
import type { DataAttributeModel } from 'types/attributes';

export type AttributeFieldInputTestWrapperProps = {
    name: string;
    descriptor: DataAttributeModel;
    busy?: boolean;
    deleteButton?: React.ReactNode;
    defaultValues?: Record<string, unknown>;
};

export function AttributeFieldInputTestWrapper({
    name,
    descriptor,
    busy = false,
    deleteButton,
    defaultValues = {},
}: Readonly<AttributeFieldInputTestWrapperProps>) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [name]: undefined,
            ...defaultValues,
        },
        mode: 'onTouched',
    });
    return (
        <ReactHookForm.FormProvider {...methods}>
            <AttributeFieldInput name={name} descriptor={descriptor} busy={busy} deleteButton={deleteButton} />

            <button type="button" data-testid="outside-blur-target">
                Outside
            </button>

            <button
                type="button"
                data-testid="trigger-validation"
                onClick={() => {
                    methods.setValue(name, '', {
                        shouldTouch: true,
                        shouldValidate: true,
                    });
                }}
            >
                Trigger validation
            </button>
        </ReactHookForm.FormProvider>
    );
}
