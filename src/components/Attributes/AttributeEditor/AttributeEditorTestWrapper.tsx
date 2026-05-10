import type React from 'react';
import { useMemo } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import AttributeEditor from './index';
import type { AttributeDescriptorModel, AttributeResponseModel } from 'types/attributes';

export type AttributeEditorTestWrapperProps = {
    id: string;
    attributeDescriptors: AttributeDescriptorModel[];
    attributes?: AttributeResponseModel[];
    groupAttributesCallbackAttributes?: AttributeDescriptorModel[];
    setGroupAttributesCallbackAttributes?: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    connectorUuid?: string;
    functionGroupCode?: string;
    kind?: string;
    withRemoveAction?: boolean;
    preloadedState?: Record<string, unknown>;
};

/** Build form defaultValues so Data/Custom fields exist on first paint (before AttributeEditor effects run) */
function buildAttributeDefaultValues(
    id: string,
    attributeDescriptors: AttributeDescriptorModel[],
    attributes: AttributeResponseModel[],
): Record<string, unknown> {
    const key = `__attributes__${id}__`;
    const inner: Record<string, unknown> = {};
    for (const d of attributeDescriptors) {
        const attr = attributes.find((a) => a.name === d.name);
        const value = attr?.content?.[0]?.data ?? attr?.content?.[0]?.reference ?? '';
        inner[d.name] = value;
    }
    if (Object.keys(inner).length === 0) return {};
    return { [key]: inner };
}

export function AttributeEditorTestWrapper({
    id,
    attributeDescriptors,
    attributes = [],
    groupAttributesCallbackAttributes = [],
    setGroupAttributesCallbackAttributes,
    connectorUuid,
    functionGroupCode,
    kind,
    withRemoveAction = true,
    preloadedState,
}: Readonly<AttributeEditorTestWrapperProps>) {
    const store = useMemo(() => createMockStore(preloadedState), [preloadedState]);
    const defaultValues = useMemo(
        () => ({ ...buildAttributeDefaultValues(id, attributeDescriptors, attributes) }),
        [id, attributeDescriptors, attributes],
    );
    const methods = ReactHookForm.useForm({
        defaultValues,
    });
    return (
        <Provider store={store}>
            <MemoryRouter>
                <ReactHookForm.FormProvider {...methods}>
                    <AttributeEditor
                        id={id}
                        attributeDescriptors={attributeDescriptors}
                        attributes={attributes}
                        groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                        setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes ?? (() => {})}
                        connectorUuid={connectorUuid}
                        functionGroupCode={functionGroupCode as any}
                        kind={kind}
                        withRemoveAction={withRemoveAction}
                    />
                </ReactHookForm.FormProvider>
            </MemoryRouter>
        </Provider>
    );
}
