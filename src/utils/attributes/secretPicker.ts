import type { CustomAttributeModel, DataAttributeModel, InfoAttributeModel } from 'types/attributes';
import { AttributeValueTarget, SecretType } from 'types/openapi';
import type { AddNewAttributeType } from 'types/user-interface';

const SECRET_TYPE_PREFIX = 'SECRET_TYPE.';
const ALL_SECRET_TYPES: SecretType[] = Object.values(SecretType);

export function allowedSecretTypes(descriptor: DataAttributeModel): SecretType[] {
    const allowed = new Set<SecretType>();
    for (const mapping of descriptor.attributeCallback?.mappings ?? []) {
        if (!mapping.to.startsWith(SECRET_TYPE_PREFIX) || !mapping.targets.includes(AttributeValueTarget.Filter)) continue;
        const values: unknown[] = Array.isArray(mapping.value) ? mapping.value : [mapping.value];
        for (const value of values) {
            if (ALL_SECRET_TYPES.includes(value as SecretType)) allowed.add(value as SecretType);
        }
    }
    return allowed.size > 0 ? [...allowed] : ALL_SECRET_TYPES;
}

type AddNewLookupDescriptor = DataAttributeModel | InfoAttributeModel | CustomAttributeModel;

export function findAddNewAttribute(descriptor: AddNewLookupDescriptor, list: AddNewAttributeType[]): AddNewAttributeType | undefined {
    const resource = 'resource' in descriptor.properties ? descriptor.properties.resource : undefined;
    return list.find((entry) => entry.contentType === descriptor.contentType && (!entry.resource || entry.resource === resource));
}
