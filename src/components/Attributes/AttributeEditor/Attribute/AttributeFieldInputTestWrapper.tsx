import type React from 'react';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import * as ReactHookForm from 'react-hook-form';
import { createMockStore } from 'utils/test-helpers';
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
    // AttributeFieldInput renders the redux-backed request-attribute mapping badge, which reads the
    // oids slice, so the field needs a store even though these tests don't exercise the badge itself.
    const store = useMemo(() => createMockStore(), []);
    return (
        <Provider store={store}>
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
        </Provider>
    );
}
