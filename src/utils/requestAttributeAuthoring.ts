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
 *    preserved on round-trip even though this editor has no UI for them yet — except that while
 *    `MERGE_MODE_AND_BINDINGS_ENABLED` is off, `gateMergeModeAndBindings` intentionally drops the
 *    whole `valueSourceBindings` array (and its params) on save, so binding round-tripping only
 *    applies once the feature is re-enabled.
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
    /**
     * Static list options — the values a requester picks from when valueSourceType === STATIC_LIST.
     * Persisted in the attribute's `content` array (ValueSource itself carries no values). Typed by
     * `contentType`, mirroring how custom attributes store predefined content.
     */
    staticValues: (string | number | boolean)[];
    /** Free-input default (valueSourceType === NONE) — pre-fills the field. Persisted as a single `content` entry. */
    defaultValue?: string | number | boolean;
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
    /**
     * Cascading dependency params, preserved on round-trip (no authoring UI yet) — but only while
     * MERGE_MODE_AND_BINDINGS_ENABLED is on; when it is off, gateMergeModeAndBindings drops the
     * entire binding (params included) on save.
     */
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

/**
 * Merge modes and value-source bindings are hidden until the connector request-attribute
 * handling improvements land on the backend (fe#1908). Flip to `true` to re-enable both the
 * RA-Profile merge-mode selector and the value-source bindings section, and to stop
 * `gateMergeModeAndBindings` from coercing saved values. It does NOT change the default merge
 * mode: `DEFAULT_MERGE_MODE` below is Static only regardless of this flag (it was `Merge` before
 * fe#1908), so re-enabling the UI does not restore the previous `Merge` default on its own.
 */
export const MERGE_MODE_AND_BINDINGS_ENABLED = false;

export const DEFAULT_MERGE_MODE = AttributeSetMergeMode.StaticOnly;

/**
 * Content types a static list can be authored for — the scalar types with a concrete input in the
 * authoring UI. The remaining types (secret/file/credential/codeblock/object/resource) have no
 * scalar editor, so a static pick-list is neither meaningful nor renderable for them.
 */
export const STATIC_LIST_CONTENT_TYPES: readonly AttributeContentType[] = [
    AttributeContentType.String,
    AttributeContentType.Text,
    AttributeContentType.Integer,
    AttributeContentType.Float,
    AttributeContentType.Boolean,
    AttributeContentType.Date,
    AttributeContentType.Time,
    AttributeContentType.Datetime,
];

export function isStaticListSupportedForContentType(contentType: AttributeContentType): boolean {
    return STATIC_LIST_CONTENT_TYPES.includes(contentType);
}

function generateUuid(): string {
    // crypto.randomUUID is available in all supported browsers and the test env; using it
    // (never Math.random) keeps the generated identifier cryptographically sound.
    return crypto.randomUUID();
}

export function emptyAuthoredAttribute(): AuthoredAttributeFormValues {
    return {
        uuid: generateUuid(),
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
        staticValues: [],
        defaultValue: undefined,
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

/**
 * While the feature is hidden (fe#1908) every save path coerces the form to `DEFAULT_MERGE_MODE`
 * and drops all value-source bindings; once re-enabled the form passes through unchanged. `enabled`
 * defaults to the flag and is a seam so tests can exercise the re-enabled path.
 */
export function gateMergeModeAndBindings(
    form: RequestAttributeAuthoringFormValues,
    enabled: boolean = MERGE_MODE_AND_BINDINGS_ENABLED,
): RequestAttributeAuthoringFormValues {
    if (enabled) return form;
    return { ...form, mergeMode: DEFAULT_MERGE_MODE, valueSourceBindings: [] };
}

export function hasAuthoredRequestAttributes(form: RequestAttributeAuthoringFormValues): boolean {
    return (
        (form.attributes?.length ?? 0) > 0 ||
        (form.valueSourceBindings?.length ?? 0) > 0 ||
        (form.mergeMode ?? DEFAULT_MERGE_MODE) !== DEFAULT_MERGE_MODE
    );
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

/**
 * Coerce an authored static value into the runtime type Core expects for the attribute's content
 * type: numbers for integer/float (the number input can leave the untouched initial `'0'` as a
 * string), a boolean for boolean, and a trimmed string otherwise — so the persisted `content`
 * matches the blank/uniqueness rules that compare trimmed.
 */
function normalizeStaticContentValue(value: string | number | boolean, contentType: AttributeContentType): string | number | boolean {
    switch (contentType) {
        case AttributeContentType.Integer: {
            const n = typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);
            return Number.isNaN(n) ? 0 : Math.trunc(n);
        }
        case AttributeContentType.Float: {
            const n = typeof value === 'number' ? value : Number.parseFloat(String(value).trim());
            return Number.isNaN(n) ? 0 : n;
        }
        case AttributeContentType.Boolean:
            return typeof value === 'boolean' ? value : String(value).trim().toLowerCase() === 'true';
        default:
            return typeof value === 'string' ? value.trim() : value;
    }
}

/** True when a free-input attribute (valueSourceType === NONE) has a non-blank default value to persist. */
function hasFreeInputDefault(form: AuthoredAttributeFormValues): boolean {
    const v = form.defaultValue;
    return v !== undefined && (typeof v !== 'string' || v.trim() !== '');
}

export function buildAuthoredAttributeDto(form: AuthoredAttributeFormValues): DataAttributeV3 {
    // A static list presents a predefined set of options, so it is a list attribute by definition —
    // force `list` on regardless of the toggle so the DTO does not contradict the content array.
    const isStaticList = form.valueSourceType === ValueSourceType.StaticList;
    const properties: DataAttributeProperties = {
        label: form.label,
        visible: true,
        required: form.required,
        readOnly: form.readOnly,
        list: isStaticList ? true : form.list,
        multiSelect: form.multiSelect,
        extensibleList: false,
    };

    const dto: DataAttributeV3 = {
        uuid: form.uuid || generateUuid(),
        name: form.name,
        description: form.description || undefined,
        version: 3,
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
    if (isStaticList && form.staticValues.length > 0) {
        dto.content = form.staticValues.map((value) => ({
            data: normalizeStaticContentValue(value, form.contentType),
            contentType: form.contentType,
        })) as DataAttributeV3['content'];
    } else if (form.valueSourceType === ValueSourceType.None && hasFreeInputDefault(form)) {
        dto.content = [
            {
                data: normalizeStaticContentValue(form.defaultValue as string | number | boolean, form.contentType),
                contentType: form.contentType,
            },
        ] as DataAttributeV3['content'];
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
    const valueSourceKind = view.valueSource?.kind ?? ValueSourceType.None;
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
        valueSourceType: valueSourceKind,
        // A free-input default is stored in `content` too, so only lift `content` into `staticValues`
        // for an actual static list — otherwise a free-input default leaks into the static-list editor.
        staticValues:
            valueSourceKind === ValueSourceType.StaticList
                ? (view.content ?? []).map((item) => (item as { data: string | number | boolean }).data)
                : [],
        defaultValue:
            valueSourceKind === ValueSourceType.None
                ? (view.content?.[0] as { data?: string | number | boolean } | undefined)?.data
                : undefined,
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

/** Normalize a static value for equality comparison — strings compared trimmed, others by value. */
function normalizeStaticValue(v: string | number | boolean): string {
    return typeof v === 'string' ? v.trim() : String(v);
}

/** True when the same value appears more than once (strings compared trimmed). */
export function hasDuplicateStaticValues(values: (string | number | boolean)[]): boolean {
    const seen = new Set<string>();
    for (const v of values) {
        const key = normalizeStaticValue(v);
        if (seen.has(key)) {
            return true;
        }
        seen.add(key);
    }
    return false;
}

/**
 * A STATIC_LIST source needs at least one option, no option may be a blank string, and the
 * options must be unique.
 */
export function isStaticListValid(form: AuthoredAttributeFormValues): boolean {
    if (form.valueSourceType !== ValueSourceType.StaticList) {
        return true;
    }
    return (
        form.staticValues.length > 0 &&
        form.staticValues.every((v) => typeof v !== 'string' || v.trim() !== '') &&
        !hasDuplicateStaticValues(form.staticValues)
    );
}

export function isAuthoredAttributeValid(form: AuthoredAttributeFormValues): boolean {
    return !!form.name.trim() && !!form.label.trim() && isAuthoredAttributeMappingValid(form) && isStaticListValid(form);
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

export function buildPlatformDefaultUpdateDto(
    attributes: AuthoredAttributeFormValues[],
    externalCsrValidationStrict?: boolean,
): CertificateRequestAttributesSettingsUpdateDto {
    return {
        requestAttributes: attributes.map((attr) => buildAuthoredAttributeDto(attr) as BaseAttributeDto),
        externalCsrValidationStrict,
    };
}

export function parsePlatformDefaultDto(dto: CertificateRequestAttributesSettingsDto | undefined): AuthoredAttributeFormValues[] {
    return (dto?.requestAttributes ?? []).map(parseAuthoredAttributeDto);
}
