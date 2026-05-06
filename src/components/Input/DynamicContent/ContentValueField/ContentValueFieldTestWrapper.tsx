import React from 'react';
import * as ReactHookForm from 'react-hook-form';
import ContentValueField from './index';
import type { BaseAttributeContentModel, CustomAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

const defaultProperties: CustomAttributeModel['properties'] = {
    label: 'Test',
    visible: true,
    required: false,
    readOnly: false,
    list: false,
    multiSelect: false,
    extensibleList: false,
};

export type ContentValueFieldTestWrapperProps = Readonly<{
    id?: string;
    descriptor: CustomAttributeModel;
    initialContent?: BaseAttributeContentModel[];
    onSubmit?: (attributeUuid: string, content: BaseAttributeContentModel[]) => void;
}>;

export function buildDescriptor(overrides: Partial<CustomAttributeModel> = {}): CustomAttributeModel {
    const base: CustomAttributeModel = {
        uuid: 'test-uuid',
        name: 'testAttr',
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        content: [],
        properties: defaultProperties,
    };
    return {
        ...base,
        ...overrides,
        properties: { ...defaultProperties, ...overrides.properties },
    };
}

function ContentValueFieldTestWrapper({ id, descriptor, initialContent, onSubmit = () => {} }: ContentValueFieldTestWrapperProps) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [descriptor.name]: undefined,
        },
        mode: 'onTouched',
    });
    return (
        <ReactHookForm.FormProvider {...methods}>
            <ContentValueField id={id} descriptor={descriptor} initialContent={initialContent} onSubmit={onSubmit} />
        </ReactHookForm.FormProvider>
    );
}

export default ContentValueFieldTestWrapper;
