import { AttributeContentType, AttributeType, AttributeVersion, type MetadataAttribute } from 'types/openapi';

export function keyPairMeta(keyId: string): MetadataAttribute[] {
    return [
        {
            uuid: 'key-id',
            name: 'keyId',
            version: 3,
            schemaVersion: AttributeVersion.V3,
            type: AttributeType.Meta,
            contentType: AttributeContentType.String,
            content: [{ data: keyId, contentType: AttributeContentType.String }],
            properties: { label: 'Key ID', visible: false },
        },
    ];
}
