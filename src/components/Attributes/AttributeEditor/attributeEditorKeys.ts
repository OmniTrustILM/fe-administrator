export const getAttributeEditorAttributesKey = <TId extends string>(id: TId): `__attributes__${TId}__` => `__attributes__${id}__`;

export const getAttributeEditorAttributeKey = <TId extends string, TAttributeName extends string>(
    id: TId,
    attributeName: TAttributeName,
): `__attributes__${TId}__.${TAttributeName}` => `${getAttributeEditorAttributesKey(id)}.${attributeName}`;

export const getAttributeEditorDeletedAttributesKey = <TId extends string>(id: TId): `deletedAttributes_${TId}` =>
    `deletedAttributes_${id}`;
