import type React from 'react';
import * as ReactHookForm from 'react-hook-form';
import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import GlobalModal from 'components/GlobalModal';
import { Attribute } from './index';
import type { DataAttributeModel, InfoAttributeModel, CustomAttributeModel } from 'types/attributes';
import type { AttributeSelectOption } from 'utils/attributes/attributes';

export type AttributeTestWrapperProps = {
    name: string;
    descriptor: DataAttributeModel | InfoAttributeModel | CustomAttributeModel | undefined;
    options?: AttributeSelectOption[];
    busy?: boolean;
    userInteractedRef?: React.RefObject<boolean>;
    deleteButton?: React.ReactNode;
    defaultValues?: Record<string, unknown>;
    /** Preloaded store state (e.g. userInterface.initiateAttributeCallback) */
    preloadedState?: Record<string, unknown>;
};

export function AttributeTestWrapper({
    name,
    descriptor,
    options,
    busy = false,
    userInteractedRef,
    deleteButton,
    defaultValues = {},
    preloadedState,
}: Readonly<AttributeTestWrapperProps>) {
    const store = createMockStore(preloadedState);
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [name]: undefined,
            ...defaultValues,
        },
    });
    return (
        <Provider store={store}>
            <GlobalModal />
            <ReactHookForm.FormProvider {...methods}>
                <Attribute
                    name={name}
                    descriptor={descriptor}
                    options={options}
                    busy={busy}
                    userInteractedRef={userInteractedRef}
                    deleteButton={deleteButton}
                />
            </ReactHookForm.FormProvider>
        </Provider>
    );
}
