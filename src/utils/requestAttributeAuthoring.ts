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
    type SourceParam,
    type ValueSource,
    type ValueSourceBindingDto,
} from 'types/openapi';
import type { FieldMappingModel, MappedFieldModel } from 'types/requestAttributeMapping';

/**
 * Authoring form models and the mapping to/from the request-attribute DTOs. All non-trivial
 * logic lives here so the ducks and the editor stay thin and the mapping is unit-covered.
 *
 * NOTE on scope vs. the generated types:
 *  - The generated `ValueSourceType` enum exposes NONE / STATIC_LIST / CONNECTOR_CALLBACK only;
 *    COLLECTION is absent from the live Core spec, so it is stubbed in the editor for now.
 *  - The generated field-mapping subtypes collapse to a bare `MappedField`; the granular
 *    fields (RDN code, SAN general-name-type, extension OID) live in the spec but are dropped
 *    by the generator, so we author them through the local `FieldMappingModel` and cast at the
 *    api boundary.
 *  - The RA-Profile update is NOT a server-side merge: Core writes `externalCsrValidationStrict`
 *    unconditionally, so we round-trip the loaded value (owned by the strictness toggle) instead
 *    of omitting it, which would wipe it. `params` on a value source / binding are likewise
 *    preserved on round-trip even though this editor has no UI for them yet.
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
    /** Reserved for the COLLECTION source (stubbed for now). */
    collectionRef?: string;
    /** Cascading dependency params, preserved on round-trip (no authoring UI yet). */
    valueSourceParams?: SourceParam[];
}

export interface ValueSourceBindingFormValues {
    attributeUuid?: string;
    attributeName?: string;
    valueSourceType: ValueSourceType;
    collectionRef?: string;
    /** Cascading dependency params, preserved on round-trip (no authoring UI yet). */
    params?: SourceParam[];
}

export interface RequestAttributeAuthoringFormValues {
    mergeMode: AttributeSetMergeMode;
    attributes: AuthoredAttributeFormValues[];
    valueSourceBindings: ValueSourceBindingFormValues[];
    /**
     * Owned by the strictness toggle (separate feature); carried through unchanged because the
     * RA-Profile update writes it unconditionally (omitting it would reset it).
     */
    externalCsrValidationStrict?: boolean;
}

export const DEFAULT_MERGE_MODE = AttributeSetMergeMode.Merge;

function generateUuid(): string {
    // crypto.randomUUID is available in all supported browsers and the test env; using it
    // (never Math.random) keeps the generated identifier cryptographically sound.
    return crypto.randomUUID();
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
    const source: ValueSource = { kind: form.valueSourceType };
    if (form.valueSourceParams?.length) {
        source.params = form.valueSourceParams;
    }
    return source;
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
        valueSourceParams: view.valueSource?.params,
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
    if (form.params?.length) {
        dto.params = form.params;
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
        // Written unconditionally by Core — round-trip the loaded value so saving the set does not
        // reset the per-profile strictness owned by the separate toggle.
        externalCsrValidationStrict: form.externalCsrValidationStrict,
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
            params: binding.params,
        })),
        externalCsrValidationStrict: dto.externalCsrValidationStrict,
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
