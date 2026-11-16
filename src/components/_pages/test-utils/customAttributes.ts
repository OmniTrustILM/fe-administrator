import type { CustomAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType, AttributeVersion } from 'types/openapi';

export const teamAttribute = {
    uuid: 'team',
    name: 'team',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    content: [{ data: 'PKI' }],
    properties: { label: 'Team', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

export const demoNoteAttribute = {
    uuid: 'demo-note',
    name: 'demoNote',
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Demo note', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

export function customAttributeValue(descriptor: CustomAttributeModel, data: string) {
    return {
        uuid: descriptor.uuid,
        name: descriptor.name,
        label: descriptor.properties.label,
        type: AttributeType.Custom,
        contentType: AttributeContentType.String,
        version: AttributeVersion.V2,
        content: [{ data }],
    };
}
