import type { CustomAttributeModel } from 'types/attributes';
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
