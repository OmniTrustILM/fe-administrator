import {
    AttributeContentType,
    AttributeSetMergeMode,
    AttributeType,
    AttributeVersion,
    FieldType,
    GeneralNameType,
    ObjectType,
    ValueSourceType,
    AttributeConstraintType,
    type BaseAttributeConstraint,
    type BaseAttributeDto,
    type CertificateRequestAttributesSettingsDto,
    type CertificateRequestAttributesSettingsUpdateDto,
    type DataAttributeProperties,
    type DataAttributeV3,
    type ExtensionValueEncoding,
    type FieldMapping,
    type FieldSource,
    type RaProfileCertificateRequestAttributesDto,
    type RaProfileCertificateRequestAttributesUpdateDto,
    type SourceParam,
    type ValueSource,
    type ValueSourceBindingDto,
} from 'types/openapi';
import type { FieldMappingModel, MappedFieldModel } from 'types/requestAttributeMapping';
import { generalNameLabel } from 'utils/requestAttributes';
import { getJsonSchemaDocumentError } from 'utils/strictJson';

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

/** Primitive an authored attribute value can take, mirroring the content types this editor offers. */
export type AuthoredAttributeValue = string | number | boolean;

export interface MappingTargetFormValues {
    fieldType?: FieldType;
    rdnCode?: string;
    generalNameType?: GeneralNameType;
    otherNameOid?: string;
    otherNameEncoding?: ExtensionValueEncoding;
    extensionOid?: string;
    criticalOverridable?: boolean;
    /** Kept as loaded: the editor has no control for it. */
    source?: FieldSource;
    /** Client-only React key that survives reordering; never persisted. */
    rowId?: string;
}

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
    /**
     * Lifts the predefined-set restriction on a list attribute: the values authored here stay
     * offered, but a submitted value outside them is accepted too. For a structured mapping target
     * (Key Usage / Extended Key Usage) this is what makes an empty permitted set saveable.
     */
    extensibleList: boolean;
    mappingObjectType?: ObjectType;
    /** `MappedField.order` is derived from the position among targets of the same field type. */
    mappingTargets: MappingTargetFormValues[];
    /** How Core resolves the value; NONE = free input. */
    valueSourceType: ValueSourceType;
    /**
     * Static list options — the values a requester picks from when valueSourceType === STATIC_LIST.
     * Persisted in the attribute's `content` array (ValueSource itself carries no values). Typed by
     * `contentType`, mirroring how custom attributes store predefined content.
     */
    staticValues: AuthoredAttributeValue[];
    /** Free-input default (valueSourceType === NONE) — pre-fills the field. Persisted as a single `content` entry. */
    defaultValue?: AuthoredAttributeValue;
    /** Cascading dependency params, preserved on round-trip (no authoring UI yet). */
    valueSourceParams?: SourceParam[];
    /**
     * Regular expression a String value must match, plus the wording shown when it does not. Core
     * validates it through `RegexpAttributeConstraint`; only String is offered because the other
     * content types have their own typed validation.
     */
    regexPattern?: string;
    regexDescription?: string;
    regexErrorMessage?: string;
    /**
     * Inline JSON Schema document (draft 2020-12) a String/Text value must conform to, plus the
     * wording shown when it does not. Core validates it through `JsonSchemaAttributeConstraint`
     * and refuses remote `$ref`s and any other dialect at save.
     */
    jsonSchemaData?: string;
    jsonSchemaDescription?: string;
    jsonSchemaErrorMessage?: string;
    /**
     * Constraints of a kind this editor cannot author (range, dateTime) exactly as loaded. Core
     * replaces the whole array on save, so dropping them here would silently delete a constraint
     * attached through the API.
     */
    otherConstraints?: BaseAttributeConstraint[];
}

export interface ValueSourceBindingFormValues {
    attributeUuid?: string;
    attributeName?: string;
    valueSourceType: ValueSourceType;
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

/**
 * Merge modes are opt-in: Core reads an omitted `mergeMode` as Static only, so a profile that
 * never touched the selector keeps resolving from its own static set (or the platform default)
 * and does not start consulting the authority connector on its own.
 */
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

/** Core renders a mapped request attribute into its X.509 field as text, so only these can be mapped. */
/** Content types a regular-expression constraint can be authored for. */
export const REGEX_CONSTRAINT_CONTENT_TYPES: readonly AttributeContentType[] = [AttributeContentType.String];

export function isRegexConstraintSupportedForContentType(contentType: AttributeContentType): boolean {
    return REGEX_CONSTRAINT_CONTENT_TYPES.includes(contentType);
}

/**
 * Content types a JSON-schema constraint can be authored for — Core rejects every other content
 * type with "JSON Schema can be validated only for STRING and TEXT".
 */
export const JSON_SCHEMA_CONSTRAINT_CONTENT_TYPES: readonly AttributeContentType[] = [
    AttributeContentType.String,
    AttributeContentType.Text,
];

export function isJsonSchemaConstraintSupportedForContentType(contentType: AttributeContentType): boolean {
    return JSON_SCHEMA_CONSTRAINT_CONTENT_TYPES.includes(contentType);
}

/**
 * The set-valued mapping targets (Key Usage / Extended Key Usage). Their vocabulary is a closed
 * set, so the attribute's content is a permitted set picked from that vocabulary rather than free
 * values, and Core requires the target to be a list declaring items unless `extensibleList` lifts
 * the restriction (`AttributeEngine.validateStructuredMappedField`).
 */
export const STRUCTURED_MAPPING_FIELD_TYPES: readonly FieldType[] = [FieldType.KeyUsage, FieldType.ExtendedKeyUsage];

export function isStructuredMappingTarget(fieldType?: FieldType): boolean {
    return !!fieldType && STRUCTURED_MAPPING_FIELD_TYPES.includes(fieldType);
}

/**
 * Extension OIDs Core refuses on the generic Extension target ("has a structured mapping target;
 * use the ... mapping target instead"), keyed to the typed target that must be used instead. The
 * editor drops them from the extension picker to keep that rejection unreachable.
 */
export const STRUCTURED_EXTENSION_OIDS: Readonly<Record<string, FieldType>> = {
    '2.5.29.15': FieldType.KeyUsage,
    '2.5.29.37': FieldType.ExtendedKeyUsage,
};

/**
 * Undefined when `pattern` compiles, otherwise the engine's own complaint — the author needs to know
 * which part it rejected, and the message differs per pattern.
 */
export function getRegexPatternError(pattern: string): string | undefined {
    try {
        new RegExp(pattern);
        return undefined;
    } catch (error) {
        return error instanceof Error ? error.message : 'The pattern is not a valid regular expression.';
    }
}

export const MAPPED_CONTENT_TYPES: readonly AttributeContentType[] = [AttributeContentType.String, AttributeContentType.Text];

export function isContentTypeAllowedForMapping(contentType: AttributeContentType): boolean {
    return MAPPED_CONTENT_TYPES.includes(contentType);
}

function generateUuid(): string {
    // crypto.randomUUID is available in all supported browsers and the test env; using it
    // (never Math.random) keeps the generated identifier cryptographically sound.
    return crypto.randomUUID();
}

export function emptyMappingTarget(): MappingTargetFormValues {
    return { rowId: generateUuid(), fieldType: undefined };
}

/** Guarantees at least one row, so an attribute stored without a mapping still opens with a target picker. */
export function withMappingTargetRows(form: AuthoredAttributeFormValues): AuthoredAttributeFormValues {
    const rows = form.mappingTargets.length > 0 ? form.mappingTargets : [emptyMappingTarget()];
    return { ...form, mappingTargets: rows.map((target) => (target.rowId ? target : { ...target, rowId: generateUuid() })) };
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
        extensibleList: false,
        mappingObjectType: ObjectType.X509Certificate,
        mappingTargets: [emptyMappingTarget()],
        valueSourceType: ValueSourceType.None,
        staticValues: [],
        defaultValue: undefined,
        regexPattern: '',
        regexDescription: '',
        regexErrorMessage: '',
        jsonSchemaData: '',
        jsonSchemaDescription: '',
        jsonSchemaErrorMessage: '',
    };
}

export function emptyValueSourceBinding(): ValueSourceBindingFormValues {
    return {
        attributeUuid: '',
        attributeName: '',
        valueSourceType: ValueSourceType.None,
    };
}

export function emptyAuthoringForm(): RequestAttributeAuthoringFormValues {
    return {
        mergeMode: DEFAULT_MERGE_MODE,
        attributes: [],
        valueSourceBindings: [],
    };
}

export function hasAuthoredRequestAttributes(form: RequestAttributeAuthoringFormValues): boolean {
    return (
        (form.attributes?.length ?? 0) > 0 ||
        (form.valueSourceBindings?.length ?? 0) > 0 ||
        (form.mergeMode ?? DEFAULT_MERGE_MODE) !== DEFAULT_MERGE_MODE
    );
}

export function hasMappingTarget(form: AuthoredAttributeFormValues): boolean {
    return form.mappingTargets.some((target) => target.fieldType !== undefined);
}

export function structuredMappingTarget(form: AuthoredAttributeFormValues): FieldType | undefined {
    return form.mappingTargets.find((target) => isStructuredMappingTarget(target.fieldType))?.fieldType;
}

export function hasStructuredMappingTarget(form: AuthoredAttributeFormValues): boolean {
    return structuredMappingTarget(form) !== undefined;
}

/**
 * Applies the attribute shape a change of targets implies. The permitted set is reset only when the
 * structured target itself changes, so editing, reordering or removing another row keeps it.
 */
export function withMappingTargets(
    form: AuthoredAttributeFormValues,
    mappingTargets: MappingTargetFormValues[],
): AuthoredAttributeFormValues {
    const next: AuthoredAttributeFormValues = { ...form, mappingTargets };
    if (hasMappingTarget(next) && !isContentTypeAllowedForMapping(next.contentType)) {
        Object.assign(next, { contentType: AttributeContentType.String, staticValues: [], defaultValue: undefined });
    }
    const before = structuredMappingTarget(form);
    const after = structuredMappingTarget(next);
    if (after && after !== before) {
        Object.assign(next, {
            valueSourceType: ValueSourceType.None,
            list: true,
            multiSelect: true,
            readOnly: false,
            extensibleList: false,
            staticValues: [],
            defaultValue: undefined,
        });
    } else if (before && !after) {
        Object.assign(next, { list: false, multiSelect: false, extensibleList: false, staticValues: [] });
    }
    return next;
}

function buildMappedField(target: MappingTargetFormValues): MappedFieldModel | undefined {
    switch (target.fieldType) {
        case FieldType.Rdn:
            return { fieldType: FieldType.Rdn, rdn: (target.rdnCode ?? '').trim() };
        case FieldType.San: {
            if (!target.generalNameType) {
                return undefined;
            }
            const isOtherName = target.generalNameType === GeneralNameType.OtherName;
            return {
                fieldType: FieldType.San,
                generalNameType: target.generalNameType,
                otherNameOid: isOtherName ? (target.otherNameOid ?? '').trim() || undefined : undefined,
                otherNameValueEncoding: isOtherName ? target.otherNameEncoding : undefined,
            };
        }
        case FieldType.Extension:
            return {
                fieldType: FieldType.Extension,
                extensionOid: (target.extensionOid ?? '').trim(),
                criticalOverridable: target.criticalOverridable || undefined,
            };
        // The structured targets carry no properties of their own — the permitted set is the
        // attribute's content, not part of the mapping.
        case FieldType.KeyUsage:
            return { fieldType: FieldType.KeyUsage };
        case FieldType.ExtendedKeyUsage:
            return { fieldType: FieldType.ExtendedKeyUsage };
        default:
            return undefined;
    }
}

/** `order` is the 1-based position among fields of the same type; incomplete rows are left out. */
function buildFieldMapping(form: AuthoredAttributeFormValues): FieldMappingModel | undefined {
    const countByType = new Map<FieldType, number>();
    const fields: MappedFieldModel[] = [];
    for (const target of form.mappingTargets) {
        const field = buildMappedField(target);
        if (field) {
            const order = (countByType.get(field.fieldType) ?? 0) + 1;
            countByType.set(field.fieldType, order);
            fields.push({ ...field, order, source: target.source });
        }
    }
    if (fields.length === 0) {
        return undefined;
    }
    return { objectType: form.mappingObjectType ?? ObjectType.X509Certificate, fields };
}

const STRUCTURED_TARGET_OIDS: Partial<Record<FieldType, string>> = {
    [FieldType.KeyUsage]: '2.5.29.15',
    [FieldType.ExtendedKeyUsage]: '2.5.29.37',
};

/** Core rejects the subjectAltName OID on the Extension target: SAN has its own target. */
export const SUBJECT_ALT_NAME_OID = '2.5.29.17';

function occupiedExtensionOid(field: MappedFieldModel | undefined): string | undefined {
    if (field?.fieldType === FieldType.Extension) {
        return (field.extensionOid ?? '').trim() || undefined;
    }
    return field ? STRUCTURED_TARGET_OIDS[field.fieldType] : undefined;
}

/** Canonical spelling of a stored RDN, so a code (`OU`) and its OID (`2.5.4.11`) compare equal. */
export type RdnResolver = (value: string) => string;

/** Comparable label of the certificate field a mapped field writes to; undefined while incomplete. */
function mappedFieldTarget(field: MappedFieldModel | undefined, resolveRdn?: RdnResolver): string | undefined {
    switch (field?.fieldType) {
        case FieldType.Rdn: {
            const rdn = (field.rdn ?? '').trim();
            if (!rdn) {
                return undefined;
            }
            return `RDN ${resolveRdn ? resolveRdn(rdn) : rdn}`;
        }
        case FieldType.San: {
            if (!field.generalNameType) {
                return undefined;
            }
            if (field.generalNameType !== GeneralNameType.OtherName) {
                return `SAN ${generalNameLabel(field.generalNameType)}`;
            }
            const otherNameOid = (field.otherNameOid ?? '').trim();
            return otherNameOid ? `SAN ${generalNameLabel(field.generalNameType)} ${otherNameOid}` : undefined;
        }
        default: {
            const oid = occupiedExtensionOid(field);
            return oid ? `extension ${oid}` : undefined;
        }
    }
}

const REPEATED_TARGET_ERROR_KEY: Partial<Record<FieldType, keyof MappingTargetErrors>> = {
    [FieldType.Rdn]: 'rdnCode',
    [FieldType.San]: 'generalNameType',
    [FieldType.Extension]: 'extensionOid',
};

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
function normalizeStaticContentValue(value: AuthoredAttributeValue, contentType: AttributeContentType): AuthoredAttributeValue {
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

/**
 * The authored regex constraint plus every constraint kind this editor cannot author, in that order.
 * Empty means the attribute carries no constraints and `constraints` is left off the DTO entirely.
 */
function buildConstraints(form: AuthoredAttributeFormValues): BaseAttributeConstraint[] {
    const authored: BaseAttributeConstraint[] = [];
    const pattern = form.regexPattern?.trim();
    if (pattern && isRegexConstraintSupportedForContentType(form.contentType)) {
        authored.push({
            type: AttributeConstraintType.RegExp,
            data: pattern,
            description: form.regexDescription?.trim() || undefined,
            errorMessage: form.regexErrorMessage?.trim() || undefined,
        } as BaseAttributeConstraint);
    }
    const schemaDocument = form.jsonSchemaData?.trim();
    if (schemaDocument && isJsonSchemaConstraintSupportedForContentType(form.contentType)) {
        authored.push({
            type: AttributeConstraintType.JsonSchema,
            data: schemaDocument,
            description: form.jsonSchemaDescription?.trim() || undefined,
            errorMessage: form.jsonSchemaErrorMessage?.trim() || undefined,
        } as BaseAttributeConstraint);
    }
    return [...authored, ...(form.otherConstraints ?? [])];
}

export function buildAuthoredAttributeDto(form: AuthoredAttributeFormValues): DataAttributeV3 {
    // A static list presents a predefined set of options, so it is a list attribute by definition —
    // force `list` on regardless of the toggle so the DTO does not contradict the content array.
    // A structured mapping target must be a list too (its content is a permitted set), so the same
    // forcing makes Core's "target is not a list" rejection unreachable from this form.
    const isStaticList = form.valueSourceType === ValueSourceType.StaticList;
    const isStructured = hasStructuredMappingTarget(form);
    const properties: DataAttributeProperties = {
        label: form.label,
        visible: true,
        required: form.required,
        readOnly: form.readOnly,
        list: isStaticList || isStructured || form.list,
        multiSelect: form.multiSelect,
        extensibleList: form.extensibleList,
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

    const constraints = buildConstraints(form);
    if (constraints.length > 0) {
        dto.constraints = constraints;
    }

    const fieldMapping = buildFieldMapping(form);
    if (fieldMapping) {
        // Generated `FieldMapping` drops the subtype fields; the local model is the pinned shape.
        dto.fieldMapping = fieldMapping as unknown as FieldMapping;
    }
    const valueSource = buildValueSource(form);
    if (valueSource) {
        dto.valueSource = valueSource;
    }
    if ((isStaticList || isStructured) && form.staticValues.length > 0) {
        dto.content = form.staticValues.map((value) => ({
            data: normalizeStaticContentValue(value, form.contentType),
            contentType: form.contentType,
        })) as DataAttributeV3['content'];
    } else if (form.valueSourceType === ValueSourceType.None && !isStructured && hasFreeInputDefault(form)) {
        dto.content = [
            {
                data: normalizeStaticContentValue(form.defaultValue as AuthoredAttributeValue, form.contentType),
                contentType: form.contentType,
            },
        ] as DataAttributeV3['content'];
    }
    return dto;
}

/** Defensive view over the `BaseAttributeDto` union — request attributes are authored as DataAttributeV3. */
type AuthoredAttributeView = Partial<DataAttributeV3> & { properties?: Partial<DataAttributeProperties> };

/** Sorts each type by `order` within its own positions, so rows of other types stay where they were. */
function orderedWithinType(fields: MappedFieldModel[]): MappedFieldModel[] {
    const result = [...fields];
    for (const fieldType of new Set(fields.map((field) => field.fieldType))) {
        const slots = fields.flatMap((field, index) => (field.fieldType === fieldType ? [index] : []));
        const sorted = slots.map((slot) => fields[slot]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        slots.forEach((slot, position) => {
            result[slot] = sorted[position];
        });
    }
    return result;
}

function parseMappingTarget(field: MappedFieldModel): MappingTargetFormValues {
    const rdn = field.fieldType === FieldType.Rdn ? field : undefined;
    const san = field.fieldType === FieldType.San ? field : undefined;
    const ext = field.fieldType === FieldType.Extension ? field : undefined;
    return {
        fieldType: field.fieldType,
        rdnCode: rdn?.rdn ?? '',
        generalNameType: san?.generalNameType,
        otherNameOid: san?.otherNameOid ?? '',
        otherNameEncoding: san?.otherNameValueEncoding,
        extensionOid: ext?.extensionOid ?? '',
        criticalOverridable: ext?.criticalOverridable ?? false,
        source: field.source,
    };
}

export function parseAuthoredAttributeDto(dto: BaseAttributeDto): AuthoredAttributeFormValues {
    const view = dto as AuthoredAttributeView;
    const mapping = view.fieldMapping as unknown as FieldMappingModel | undefined;
    const fields = mapping?.fields;
    const mappingTargets = Array.isArray(fields) ? orderedWithinType(fields).map(parseMappingTarget) : [];
    const valueSourceKind = view.valueSource?.kind ?? ValueSourceType.None;
    const constraints = view.constraints ?? [];
    const regex = constraints.find((c) => c.type === AttributeConstraintType.RegExp);
    const jsonSchema = constraints.find((c) => c.type === AttributeConstraintType.JsonSchema);
    // For a structured target the content array is the permitted set regardless of value source, so
    // it belongs in the set editor, not the free-input default.
    const isStructured = mappingTargets.some((target) => isStructuredMappingTarget(target.fieldType));
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
        extensibleList: view.properties?.extensibleList ?? false,
        mappingObjectType: mapping?.objectType ?? ObjectType.X509Certificate,
        mappingTargets,
        valueSourceType: valueSourceKind,
        // A free-input default is stored in `content` too, so only lift `content` into `staticValues`
        // for an actual static list — otherwise a free-input default leaks into the static-list editor.
        staticValues:
            valueSourceKind === ValueSourceType.StaticList || isStructured
                ? (view.content ?? []).map((item) => (item as { data: AuthoredAttributeValue }).data)
                : [],
        defaultValue:
            valueSourceKind === ValueSourceType.None && !isStructured
                ? (view.content?.[0] as { data?: AuthoredAttributeValue } | undefined)?.data
                : undefined,
        valueSourceParams: view.valueSource?.params,
        regexPattern: typeof regex?.data === 'string' ? regex.data : '',
        regexDescription: regex?.description ?? '',
        regexErrorMessage: regex?.errorMessage ?? '',
        jsonSchemaData: typeof jsonSchema?.data === 'string' ? jsonSchema.data : '',
        jsonSchemaDescription: jsonSchema?.description ?? '',
        jsonSchemaErrorMessage: jsonSchema?.errorMessage ?? '',
        otherConstraints: constraints.filter(
            (c) => c.type !== AttributeConstraintType.RegExp && c.type !== AttributeConstraintType.JsonSchema,
        ),
    };
}

/** Normalize a static value for equality comparison — strings compared trimmed, others by value. */
function normalizeStaticValue(v: AuthoredAttributeValue): string {
    return typeof v === 'string' ? v.trim() : String(v);
}

/** True when the same value appears more than once (strings compared trimmed). */
export function hasDuplicateStaticValues(values: AuthoredAttributeValue[]): boolean {
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

const BOOLEAN_LITERALS = new Set(['true', 'false']);

/** Blank counts as "no value" (left to the required-ness rules); otherwise guards `normalizeStaticContentValue`, which turns `"abc"` into `0`. */
export function isValueValidForContentType(value: AuthoredAttributeValue, contentType: AttributeContentType): boolean {
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    const raw = typeof value === 'string' ? value.trim() : value;
    switch (contentType) {
        case AttributeContentType.Integer:
            return typeof raw === 'number' ? Number.isInteger(raw) : /^[+-]?\d+$/.test(String(raw));
        case AttributeContentType.Float:
            return typeof raw === 'number' ? Number.isFinite(raw) : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(raw));
        case AttributeContentType.Boolean:
            // Case-insensitive to match normalizeStaticContentValue, which lowercases before comparing.
            return typeof raw === 'boolean' || BOOLEAN_LITERALS.has(String(raw).toLowerCase());
        case AttributeContentType.Date:
            return /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) && !Number.isNaN(Date.parse(`${raw}T00:00:00`));
        case AttributeContentType.Time:
            return /^\d{2}:\d{2}(:\d{2})?$/.test(String(raw));
        case AttributeContentType.Datetime:
            return !Number.isNaN(Date.parse(String(raw)));
        default:
            return true;
    }
}

/**
 * A read-only free-input attribute must carry a default value: the requester can never type into a
 * read-only field, so without one the value stays empty and every certificate request form
 * containing the attribute becomes unsubmittable (fe#1913). The rule is not conditional on
 * `required` — the backend rejects any read-only attribute without content
 * (`AttributeEngine.validateReadOnlyAttributeProperties`), so letting the save through would only
 * trade this inline hint for a raw server error. Only applies to free input — Read Only is not
 * authorable for a static list, and other value sources resolve the value server-side.
 */
export function isReadOnlyDefaultValid(form: AuthoredAttributeFormValues): boolean {
    if (form.valueSourceType !== ValueSourceType.None || !form.readOnly) {
        return true;
    }
    return hasFreeInputDefault(form);
}

/**
 * A Boolean default renders as a switch, which has no "unset" position — an absent default looks
 * exactly like an explicit `false`. Once Read Only makes the default mandatory, seed the `false`
 * the switch is already showing so the persisted value matches the visible one, instead of blocking
 * Save on a gap the author cannot see (and forcing them to toggle twice to store `false`).
 */
export function withBooleanReadOnlyDefault(form: AuthoredAttributeFormValues): AuthoredAttributeFormValues {
    if (
        form.valueSourceType === ValueSourceType.None &&
        form.readOnly &&
        form.contentType === AttributeContentType.Boolean &&
        form.defaultValue === undefined
    ) {
        return { ...form, defaultValue: false };
    }
    return form;
}

export interface MappingTargetErrors {
    fieldType?: string;
    rdnCode?: string;
    generalNameType?: string;
    otherNameOid?: string;
    otherNameEncoding?: string;
    extensionOid?: string;
}

/** Empty object means the definition is valid. */
export interface AuthoredAttributeErrors {
    name?: string;
    label?: string;
    contentType?: string;
    mapping?: string;
    /** Aligned with `mappingTargets`; present only while some row has an error. */
    mappingTargets?: MappingTargetErrors[];
    readOnly?: string;
    multiSelect?: string;
    defaultValue?: string;
    staticValues?: string;
    regexPattern?: string;
    jsonSchemaData?: string;
}

export function firstAuthoredAttributeError(errors: AuthoredAttributeErrors): string | undefined {
    const values: (string | MappingTargetErrors[] | undefined)[] = Object.values(errors);
    for (const value of values) {
        if (typeof value === 'string') {
            return value;
        }
        const rowError = value?.flatMap((row): (string | undefined)[] => Object.values(row)).find((message) => message !== undefined);
        if (rowError) {
            return rowError;
        }
    }
    return undefined;
}

const MAPPING_TARGET_REQUIRED = 'A mapping target is required: pick where this attribute lands in the certificate.';

function validateSanTarget(target: MappingTargetFormValues): MappingTargetErrors {
    if (!target.generalNameType) {
        return { generalNameType: 'Select the SAN type this attribute maps to.' };
    }
    if (target.generalNameType !== GeneralNameType.OtherName) {
        return {};
    }
    const errors: MappingTargetErrors = {};
    if (!target.otherNameOid?.trim()) {
        errors.otherNameOid = 'An otherName OID is required.';
    }
    if (!target.otherNameEncoding) {
        errors.otherNameEncoding = 'An otherName value encoding is required.';
    }
    return errors;
}

function validateMappingTarget(target: MappingTargetFormValues): MappingTargetErrors {
    switch (target.fieldType) {
        case FieldType.Rdn:
            return target.rdnCode?.trim() ? {} : { rdnCode: 'Select the RDN this attribute maps to.' };
        case FieldType.San:
            return validateSanTarget(target);
        case FieldType.Extension: {
            const oid = target.extensionOid?.trim();
            if (!oid) {
                return { extensionOid: 'Select the certificate extension this attribute maps to.' };
            }
            if (oid in STRUCTURED_EXTENSION_OIDS) {
                // The picker no longer offers these, but a legacy attribute may still store one; Core
                // rejects the whole set until it is re-targeted.
                const structured = STRUCTURED_EXTENSION_OIDS[oid] === FieldType.KeyUsage ? 'Key Usage' : 'Extended Key Usage';
                return { extensionOid: `This extension has a structured mapping target: switch the mapping target to ${structured}.` };
            }
            if (oid === SUBJECT_ALT_NAME_OID) {
                return { extensionOid: 'This extension is the Subject Alternative Name: use the Subject Alternative Name target instead.' };
            }
            return {};
        }
        case FieldType.KeyUsage:
        case FieldType.ExtendedKeyUsage:
            return {};
        default:
            return { fieldType: MAPPING_TARGET_REQUIRED };
    }
}

/**
 * A structured target must be the only one, since its permitted set is the attribute's content. No two
 * rows may name the same field: Core writes every value to every target.
 */
export function validateMappingTargets(form: AuthoredAttributeFormValues, resolveRdn?: RdnResolver): MappingTargetErrors[] {
    const targets = form.mappingTargets;
    const labels = targets.map((target) => mappedFieldTarget(buildMappedField(target), resolveRdn));
    return targets.map((target, index) => {
        const errors = validateMappingTarget(target);
        if (isStructuredMappingTarget(target.fieldType) && targets.length > 1) {
            const name = target.fieldType === FieldType.KeyUsage ? 'Key Usage' : 'Extended Key Usage';
            errors.fieldType ??= `${name} must be the only mapping target: its permitted set cannot also be written to another certificate field.`;
        }
        const label = labels[index];
        const repeated = label === undefined ? -1 : labels.indexOf(label);
        if (repeated !== -1 && repeated < index) {
            const key = (target.fieldType && REPEATED_TARGET_ERROR_KEY[target.fieldType]) ?? 'fieldType';
            errors[key] ??= `This target repeats ${label} above. A certificate field can be mapped only once per attribute.`;
        }
        return errors;
    });
}

function validateMapping(form: AuthoredAttributeFormValues, resolveRdn?: RdnResolver): AuthoredAttributeErrors {
    if (form.mappingTargets.length === 0) {
        return { mapping: MAPPING_TARGET_REQUIRED };
    }
    const errors: AuthoredAttributeErrors = {};
    if (hasMappingTarget(form) && !isContentTypeAllowedForMapping(form.contentType)) {
        errors.contentType = 'A mapped request attribute must use content type String or Text.';
    }
    const rows = validateMappingTargets(form, resolveRdn);
    if (rows.some((row) => Object.keys(row).length > 0)) {
        errors.mappingTargets = rows;
    }
    return errors;
}

function validateProperties(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const errors: AuthoredAttributeErrors = {};
    const isList = form.list || form.valueSourceType === ValueSourceType.StaticList || hasStructuredMappingTarget(form);
    if (form.readOnly) {
        if (isList) {
            errors.readOnly = 'Read Only cannot be combined with a list.';
        } else if (!isReadOnlyDefaultValid(form)) {
            // Only the scalar types have a default-value editor, so for the rest the author cannot
            // satisfy the rule by typing a default — say so instead of pointing at a missing field.
            errors.readOnly = isStaticListSupportedForContentType(form.contentType)
                ? 'Read Only requires a default value — the requester cannot supply one.'
                : `Read Only requires a default value, and the ${form.contentType} content type has no default-value editor here. Clear Read Only, or pick a content type whose default can be authored.`;
        }
    }
    if (form.multiSelect && !isList) {
        errors.multiSelect = 'Multi select requires a list.';
    } else if (
        form.multiSelect &&
        form.valueSourceType === ValueSourceType.StaticList &&
        form.mappingTargets.some((target) => target.fieldType === FieldType.Extension)
    ) {
        // Only a static list offers the Multi select checkbox, so only there can the author fix this.
        errors.multiSelect = 'Multi select cannot be combined with a certificate extension target: an extension takes exactly one value.';
    }
    return errors;
}

/**
 * A pattern Core cannot compile would reject every value, so it is blocked here rather than saved.
 * A pattern left on a content type that cannot carry one is not an error — it is simply not emitted.
 */
function validateRegexConstraint(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const pattern = form.regexPattern?.trim();
    if (!pattern || !isRegexConstraintSupportedForContentType(form.contentType)) {
        return {};
    }
    const error = getRegexPatternError(pattern);
    return error ? { regexPattern: `The pattern is not a valid regular expression: ${error}` } : {};
}

/**
 * An invalid schema document is rejected by Core at save (not at request time), so it is blocked
 * here with the reason instead of round-tripping the raw server error. A document left on a content
 * type that cannot carry one is not an error — it is simply not emitted.
 */
function validateJsonSchemaConstraint(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const document = form.jsonSchemaData?.trim();
    if (!document || !isJsonSchemaConstraintSupportedForContentType(form.contentType)) {
        return {};
    }
    const error = getJsonSchemaDocumentError(document);
    return error ? { jsonSchemaData: error } : {};
}

function validateDefaultValue(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const { defaultValue } = form;
    if (form.valueSourceType !== ValueSourceType.None || defaultValue === undefined || !hasFreeInputDefault(form)) {
        return {};
    }
    if (isValueValidForContentType(defaultValue, form.contentType)) {
        return {};
    }
    return { defaultValue: `The default value is not a valid ${form.contentType} value.` };
}

function validateStaticList(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const isStructured = hasStructuredMappingTarget(form);
    if (form.valueSourceType !== ValueSourceType.StaticList && !isStructured) {
        return {};
    }
    const { staticValues, contentType } = form;
    if (staticValues.length === 0) {
        // Core rejects a structured target declaring no permitted items unless `extensibleList`
        // lifts the restriction — mirror that rule here so the save cannot reach the rejection.
        if (isStructured) {
            return form.extensibleList
                ? {}
                : { staticValues: 'Select at least one permitted value, or enable "Any value allowed" to lift the restriction.' };
        }
        return { staticValues: 'Add at least one value for the static list.' };
    }
    if (staticValues.some((v) => typeof v === 'string' && v.trim() === '')) {
        return { staticValues: 'Static list values cannot be blank.' };
    }
    if (hasDuplicateStaticValues(staticValues)) {
        return { staticValues: 'Static list values must be unique.' };
    }
    if (staticValues.some((v) => !isValueValidForContentType(v, contentType))) {
        return { staticValues: `Every static list value must be a valid ${contentType} value.` };
    }
    return {};
}

/**
 * The rules Core enforces on a definition, applied client-side so the dialog can flag them per field.
 * Spread order fixes the key order, which the attribute list relies on to show the first message.
 */
export function validateAuthoredAttribute(form: AuthoredAttributeFormValues, resolveRdn?: RdnResolver): AuthoredAttributeErrors {
    const identity: AuthoredAttributeErrors = {};
    if (!form.name.trim()) {
        identity.name = 'Name is required.';
    }
    if (!form.label.trim()) {
        identity.label = 'Label is required.';
    }
    return {
        ...identity,
        ...validateMapping(form, resolveRdn),
        ...validateProperties(form),
        ...validateDefaultValue(form),
        ...validateStaticList(form),
        ...validateRegexConstraint(form),
        ...validateJsonSchemaConstraint(form),
    };
}

export function isValueSourceBindingValid(form: ValueSourceBindingFormValues): boolean {
    return Boolean(form.attributeUuid?.trim() || form.attributeName?.trim());
}

export function buildValueSourceBindingDto(form: ValueSourceBindingFormValues): ValueSourceBindingDto {
    const uuid = form.attributeUuid?.trim();
    const name = form.attributeName?.trim();
    const dto: ValueSourceBindingDto = {
        valueSourceType: form.valueSourceType,
    };
    if (uuid) {
        dto.attributeUuid = uuid;
    }
    if (name) {
        dto.attributeName = name;
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
