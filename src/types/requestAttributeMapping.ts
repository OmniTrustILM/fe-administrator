import type { ExtensionValueEncoding, FieldSource, FieldType, GeneralNameType, ObjectType } from 'types/openapi';

/**
 * Local models for the `fieldMapping` polymorphic subtypes.
 *
 * The Core OpenAPI fully specifies these via `allOf`/`oneOf` with a
 * `fieldType` discriminator, but the `typescript-rxjs` generator collapses the composition
 * and emits `type RdnMappedField = MappedField` — dropping every subtype-specific field.
 * These interfaces mirror the pinned (final) spec so the authoring UI can read/write the
 * RDN code, SAN general-name-type, and extension OID. Cast to/from the generated
 * `FieldMapping` at the api boundary in `utils/requestAttributeAuthoring`.
 */

interface MappedFieldCommon {
    order?: number;
    source?: FieldSource;
}

/** Maps a value to an X.509 RDN component (e.g. CN); `rdn` is the RDN code or dotted OID. */
export interface RdnMappedFieldModel extends MappedFieldCommon {
    fieldType: FieldType.Rdn;
    rdn: string;
}

/** Maps a value to a Subject Alternative Name entry. */
export interface SanMappedFieldModel extends MappedFieldCommon {
    fieldType: FieldType.San;
    generalNameType: GeneralNameType;
    /** Required when generalNameType is OTHER_NAME. */
    otherNameOid?: string;
    /** Required when generalNameType is OTHER_NAME. */
    otherNameValueEncoding?: ExtensionValueEncoding;
}

/** Maps a value to an X.509 extension identified by OID. */
export interface ExtensionMappedFieldModel extends MappedFieldCommon {
    fieldType: FieldType.Extension;
    extensionOid: string;
    criticalOverridable?: boolean;
}

export type MappedFieldModel = RdnMappedFieldModel | SanMappedFieldModel | ExtensionMappedFieldModel;

export interface FieldMappingModel {
    objectType: ObjectType;
    fields: MappedFieldModel[];
}
