import {
    AttributeContentType,
    AttributeSetMergeMode,
    AttributeType,
    AttributeVersion,
    FieldType,
    GeneralNameType,
    ObjectType,
    ValueSourceType,
    type BaseAttributeDto,
    type CertificateRequestAttributesSettingsDto,
    type CertificateRequestAttributesSettingsUpdateDto,
    type DataAttributeProperties,
    type DataAttributeV3,
    type ExtensionValueEncoding,
    type FieldMapping,
    type RaProfileCertificateRequestAttributesDto,
    type RaProfileCertificateRequestAttributesUpdateDto,
    type ValueSource,
    type ValueSourceBindingDto,
} from 'types/openapi';
import type { FieldMappingModel, MappedFieldModel } from 'types/requestAttributeMapping';

/**
 * Authoring form models and the mapping to/from the pinned request-attribute DTOs
 * (interfaces#731/#730, core#1632). All non-trivial logic lives here so the ducks
 * and the editor stay thin and the mapping is unit-covered.
 *
 * NOTE on scope vs. the generated types:
 *  - The generated `ValueSourceType` enum exposes NONE / STATIC_LIST / CONNECTOR_CALLBACK
 *    only; COLLECTION is absent from the live Core spec, so it is stubbed in the editor
 *    and wired in fe#1782 once Core ships the enum member.
 *  - The generated field-mapping subtypes collapse to a bare `MappedField`; the granular
 *    fields (RDN code, SAN general-name-type, extension OID) live in the pinned spec but
 *    are dropped by the generator, so we author them through the local `FieldMappingModel`
 *    ([[types/requestAttributeMapping]]) and cast at the api boundary.
 *  - `externalCsrValidationStrict` is owned by fe#1780 and is intentionally never sent
 *    from here; the PATCH is treated as a merge so the field is preserved server-side.
 */

export interface AuthoredAttributeFormValues {
    uuid?: string;
    name: string;
    label: string;
    description?: string;
    contentType: AttributeContentType;
    required: boolean;
    readOnly: boolean;
    list: boolean;
    multiSelect: boolean;
    /** Mapping target — FieldType category (RDN / SAN / EXTENSION); undefined = unmapped. */
    mappingFieldType?: FieldType;
    mappingObjectType?: ObjectType;
    /** RDN code (e.g. "CN") or dotted OID — used when mappingFieldType === RDN. */
    mappingRdnCode?: string;
    /** SAN general-name-type (e.g. dNSName) — used when mappingFieldType === SAN. */
    mappingGeneralNameType?: GeneralNameType;
    /** otherName OID + encoding — required when mappingGeneralNameType === OTHER_NAME. */
    mappingOtherNameOid?: string;
    mappingOtherNameEncoding?: ExtensionValueEncoding;
    /** Extension OID (dotted) — used when mappingFieldType === EXTENSION. */
    mappingExtensionOid?: string;
    mappingCriticalOverridable?: boolean;
    /** How Core resolves the value; NONE = free input. */
    valueSourceType: ValueSourceType;
    /** Reserved for the COLLECTION source (stubbed until fe#1782). */
    collectionRef?: string;
}

export interface ValueSourceBindingFormValues {
    attributeUuid?: string;
    attributeName?: string;
    valueSourceType: ValueSourceType;
    collectionRef?: string;
}

export interface RequestAttributeAuthoringFormValues {
    mergeMode: AttributeSetMergeMode;
    attributes: AuthoredAttributeFormValues[];
    valueSourceBindings: ValueSourceBindingFormValues[];
}

export const DEFAULT_MERGE_MODE = AttributeSetMergeMode.Merge;

function generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `ra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyAuthoredAttribute(): AuthoredAttributeFormValues {
    return {
        name: '',
        label: '',
        description: '',
        contentType: AttributeContentType.String,
        required: false,
        readOnly: false,
        list: false,
        multiSelect: false,
        mappingFieldType: undefined,
        mappingObjectType: ObjectType.X509Certificate,
        mappingRdnCode: '',
        mappingGeneralNameType: undefined,
        mappingOtherNameOid: '',
        mappingOtherNameEncoding: undefined,
        mappingExtensionOid: '',
        mappingCriticalOverridable: false,
        valueSourceType: ValueSourceType.None,
        collectionRef: '',
    };
}

export function emptyValueSourceBinding(): ValueSourceBindingFormValues {
    return {
        attributeUuid: '',
        attributeName: '',
        valueSourceType: ValueSourceType.None,
        collectionRef: '',
    };
}

export function emptyAuthoringForm(): RequestAttributeAuthoringFormValues {
    return {
        mergeMode: DEFAULT_MERGE_MODE,
        attributes: [],
        valueSourceBindings: [],
    };
}

function buildMappedField(form: AuthoredAttributeFormValues): MappedFieldModel | undefined {
    switch (form.mappingFieldType) {
        case FieldType.Rdn:
            return { fieldType: FieldType.Rdn, rdn: (form.mappingRdnCode ?? '').trim() };
        case FieldType.San: {
            if (!form.mappingGeneralNameType) {
                return undefined;
            }
            const isOtherName = form.mappingGeneralNameType === GeneralNameType.OtherName;
            return {
                fieldType: FieldType.San,
                generalNameType: form.mappingGeneralNameType,
                otherNameOid: isOtherName ? (form.mappingOtherNameOid ?? '').trim() || undefined : undefined,
                otherNameValueEncoding: isOtherName ? form.mappingOtherNameEncoding : undefined,
            };
        }
        case FieldType.Extension:
            return {
                fieldType: FieldType.Extension,
                extensionOid: (form.mappingExtensionOid ?? '').trim(),
                criticalOverridable: form.mappingCriticalOverridable || undefined,
            };
        default:
            return undefined;
    }
}

function buildFieldMapping(form: AuthoredAttributeFormValues): FieldMappingModel | undefined {
    const field = buildMappedField(form);
    if (!field) {
        return undefined;
    }
    return {
        objectType: form.mappingObjectType ?? ObjectType.X509Certificate,
        fields: [field],
    };
}

function buildValueSource(form: AuthoredAttributeFormValues): ValueSource | undefined {
    if (!form.valueSourceType || form.valueSourceType === ValueSourceType.None) {
        return undefined;
    }
    return { kind: form.valueSourceType };
}

export function buildAuthoredAttributeDto(form: AuthoredAttributeFormValues): DataAttributeV3 {
    const properties: DataAttributeProperties = {
        label: form.label,
        visible: true,
        required: form.required,
        readOnly: form.readOnly,
        list: form.list,
        multiSelect: form.multiSelect,
        extensibleList: false,
    };

    const dto: DataAttributeV3 = {
        uuid: form.uuid || generateUuid(),
        name: form.name,
        description: form.description || undefined,
        version: 1,
        type: AttributeType.Data,
        contentType: form.contentType,
        properties,
        schemaVersion: AttributeVersion.V3,
    };

    const fieldMapping = buildFieldMapping(form);
    if (fieldMapping) {
        // Generated `FieldMapping` drops the subtype fields; the local model is the pinned shape.
        dto.fieldMapping = fieldMapping as unknown as FieldMapping;
    }
    const valueSource = buildValueSource(form);
    if (valueSource) {
        dto.valueSource = valueSource;
    }
    return dto;
}

/** Defensive view over the `BaseAttributeDto` union — request attributes are authored as DataAttributeV3. */
type AuthoredAttributeView = Partial<DataAttributeV3> & { properties?: Partial<DataAttributeProperties> };

export function parseAuthoredAttributeDto(dto: BaseAttributeDto): AuthoredAttributeFormValues {
    const view = dto as AuthoredAttributeView;
    const mapping = view.fieldMapping as unknown as FieldMappingModel | undefined;
    const firstField = mapping?.fields?.[0];
    const rdn = firstField && firstField.fieldType === FieldType.Rdn ? firstField : undefined;
    const san = firstField && firstField.fieldType === FieldType.San ? firstField : undefined;
    const ext = firstField && firstField.fieldType === FieldType.Extension ? firstField : undefined;
    return {
        uuid: view.uuid,
        name: view.name ?? '',
        label: view.properties?.label ?? view.name ?? '',
        description: view.description ?? '',
        contentType: view.contentType ?? AttributeContentType.String,
        required: view.properties?.required ?? false,
        readOnly: view.properties?.readOnly ?? false,
        list: view.properties?.list ?? false,
        multiSelect: view.properties?.multiSelect ?? false,
        mappingFieldType: firstField?.fieldType,
        mappingObjectType: mapping?.objectType ?? ObjectType.X509Certificate,
        mappingRdnCode: rdn?.rdn ?? '',
        mappingGeneralNameType: san?.generalNameType,
        mappingOtherNameOid: san?.otherNameOid ?? '',
        mappingOtherNameEncoding: san?.otherNameValueEncoding,
        mappingExtensionOid: ext?.extensionOid ?? '',
        mappingCriticalOverridable: ext?.criticalOverridable ?? false,
        valueSourceType: view.valueSource?.kind ?? ValueSourceType.None,
        collectionRef: '',
    };
}

/**
 * A mapped attribute must carry its target identifier: RDN code, SAN general-name-type
 * (+ otherName OID/encoding when OTHER_NAME), or extension OID. Unmapped attributes are valid.
 */
export function isAuthoredAttributeMappingValid(form: AuthoredAttributeFormValues): boolean {
    switch (form.mappingFieldType) {
        case FieldType.Rdn:
            return !!form.mappingRdnCode?.trim();
        case FieldType.San:
            if (!form.mappingGeneralNameType) {
                return false;
            }
            if (form.mappingGeneralNameType === GeneralNameType.OtherName) {
                return !!form.mappingOtherNameOid?.trim() && !!form.mappingOtherNameEncoding;
            }
            return true;
        case FieldType.Extension:
            return !!form.mappingExtensionOid?.trim();
        default:
            return true;
    }
}

export function isAuthoredAttributeValid(form: AuthoredAttributeFormValues): boolean {
    return !!form.name.trim() && !!form.label.trim() && isAuthoredAttributeMappingValid(form);
}

export function isValueSourceBindingValid(form: ValueSourceBindingFormValues): boolean {
    return Boolean(form.attributeUuid?.trim() || form.attributeName?.trim());
}

export function buildValueSourceBindingDto(form: ValueSourceBindingFormValues): ValueSourceBindingDto {
    const uuid = form.attributeUuid?.trim();
    const name = form.attributeName?.trim();
    const collectionRef = form.collectionRef?.trim();
    const dto: ValueSourceBindingDto = {
        valueSourceType: form.valueSourceType,
    };
    if (uuid) {
        dto.attributeUuid = uuid;
    }
    if (name) {
        dto.attributeName = name;
    }
    if (collectionRef) {
        dto.collectionRef = collectionRef;
    }
    return dto;
}

export function buildRaProfileRequestAttributesUpdateDto(
    form: RequestAttributeAuthoringFormValues,
): RaProfileCertificateRequestAttributesUpdateDto {
    return {
        requestAttributes: form.attributes.map((attr) => buildAuthoredAttributeDto(attr) as BaseAttributeDto),
        mergeMode: form.mergeMode ?? DEFAULT_MERGE_MODE,
        valueSourceBindings: form.valueSourceBindings.filter(isValueSourceBindingValid).map(buildValueSourceBindingDto),
    };
}

export function parseRaProfileRequestAttributesDto(
    dto: RaProfileCertificateRequestAttributesDto | undefined,
): RequestAttributeAuthoringFormValues {
    if (!dto) {
        return emptyAuthoringForm();
    }
    return {
        mergeMode: dto.mergeMode ?? DEFAULT_MERGE_MODE,
        attributes: (dto.requestAttributes ?? []).map(parseAuthoredAttributeDto),
        valueSourceBindings: (dto.valueSourceBindings ?? []).map((binding) => ({
            attributeUuid: binding.attributeUuid ?? '',
            attributeName: binding.attributeName ?? '',
            valueSourceType: binding.valueSourceType ?? ValueSourceType.None,
            collectionRef: binding.collectionRef ?? '',
        })),
    };
}

export function buildPlatformDefaultUpdateDto(attributes: AuthoredAttributeFormValues[]): CertificateRequestAttributesSettingsUpdateDto {
    return {
        requestAttributes: attributes.map((attr) => buildAuthoredAttributeDto(attr) as BaseAttributeDto),
    };
}

export function parsePlatformDefaultDto(dto: CertificateRequestAttributesSettingsDto | undefined): AuthoredAttributeFormValues[] {
    return (dto?.requestAttributes ?? []).map(parseAuthoredAttributeDto);
}
