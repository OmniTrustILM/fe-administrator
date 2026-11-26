import { type CustomAttributeModel, type DataAttributeModel, type InfoAttributeModel, isDataAttributeModel } from 'types/attributes';
import { AttributeResource, AttributeValueTarget, FilterConditionOperator, SecretType } from 'types/openapi';
import type { AddNewAttributeType } from 'types/user-interface';

const SECRET_TYPE_PREFIX = 'SECRET_TYPE.';
const ALL_SECRET_TYPES: SecretType[] = Object.values(SecretType);

type FilterMapping = NonNullable<DataAttributeModel['attributeCallback']>['mappings'][number];

function mappedSecretTypes(mapping: FilterMapping): SecretType[] {
    const values: unknown[] = Array.isArray(mapping.value) ? mapping.value : [mapping.value];
    return ALL_SECRET_TYPES.filter((type) => values.includes(type));
}

// The part after the prefix is the filter's operator; only EQUALS and NOT_EQUALS narrow the types.
function typesMatching(mapping: FilterMapping): SecretType[] {
    const operator = mapping.to.slice(SECRET_TYPE_PREFIX.length);
    if (operator === FilterConditionOperator.Equals) return mappedSecretTypes(mapping);
    if (operator === FilterConditionOperator.NotEquals) {
        const excluded = mappedSecretTypes(mapping);
        return ALL_SECRET_TYPES.filter((type) => !excluded.includes(type));
    }
    return ALL_SECRET_TYPES;
}

// Empty when the filters leave no type a created secret could have.
export function allowedSecretTypes(descriptor: DataAttributeModel): SecretType[] {
    let allowed = ALL_SECRET_TYPES;
    for (const mapping of descriptor.attributeCallback?.mappings ?? []) {
        if (!mapping.to.startsWith(SECRET_TYPE_PREFIX) || !mapping.targets.includes(AttributeValueTarget.Filter)) continue;
        const matching = typesMatching(mapping);
        allowed = allowed.filter((type) => matching.includes(type));
    }
    return allowed;
}

type AddNewLookupDescriptor = DataAttributeModel | InfoAttributeModel | CustomAttributeModel;

export function findAddNewAttribute(descriptor: AddNewLookupDescriptor, list: AddNewAttributeType[]): AddNewAttributeType | undefined {
    const resource = 'resource' in descriptor.properties ? descriptor.properties.resource : undefined;
    const entry = list.find((item) => item.contentType === descriptor.contentType && (!item.resource || item.resource === resource));
    if (entry?.resource === AttributeResource.Secrets && isDataAttributeModel(descriptor) && allowedSecretTypes(descriptor).length === 0) {
        return undefined;
    }
    return entry;
}
