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

/** Primitive an authored attribute value can take, mirroring the content types this editor offers. */
export type AuthoredAttributeValue = string | number | boolean;

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
    staticValues: AuthoredAttributeValue[];
    /** Free-input default (valueSourceType === NONE) — pre-fills the field. Persisted as a single `content` entry. */
    defaultValue?: AuthoredAttributeValue;
    /** Reserved for the COLLECTION source (stubbed for now). */
    collectionRef?: string;
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

/** Core renders a mapped request attribute into its X.509 field as text, so only these can be mapped. */
/** Content types a regular-expression constraint can be authored for. */
export const REGEX_CONSTRAINT_CONTENT_TYPES: readonly AttributeContentType[] = [AttributeContentType.String];

export function isRegexConstraintSupportedForContentType(contentType: AttributeContentType): boolean {
    return REGEX_CONSTRAINT_CONTENT_TYPES.includes(contentType);
}

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
        regexPattern: '',
        regexDescription: '',
        regexErrorMessage: '',
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
    const pattern = form.regexPattern?.trim();
    const authored: BaseAttributeConstraint[] =
        pattern && isRegexConstraintSupportedForContentType(form.contentType)
            ? [
                  {
                      type: AttributeConstraintType.RegExp,
                      data: pattern,
                      description: form.regexDescription?.trim() || undefined,
                      errorMessage: form.regexErrorMessage?.trim() || undefined,
                  } as BaseAttributeConstraint,
              ]
            : [];
    return [...authored, ...(form.otherConstraints ?? [])];
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
    if (isStaticList && form.staticValues.length > 0) {
        dto.content = form.staticValues.map((value) => ({
            data: normalizeStaticContentValue(value, form.contentType),
            contentType: form.contentType,
        })) as DataAttributeV3['content'];
    } else if (form.valueSourceType === ValueSourceType.None && hasFreeInputDefault(form)) {
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

export function parseAuthoredAttributeDto(dto: BaseAttributeDto): AuthoredAttributeFormValues {
    const view = dto as AuthoredAttributeView;
    const mapping = view.fieldMapping as unknown as FieldMappingModel | undefined;
    const firstField = mapping?.fields?.[0];
    const rdn = firstField?.fieldType === FieldType.Rdn ? firstField : undefined;
    const san = firstField?.fieldType === FieldType.San ? firstField : undefined;
    const ext = firstField?.fieldType === FieldType.Extension ? firstField : undefined;
    const valueSourceKind = view.valueSource?.kind ?? ValueSourceType.None;
    const constraints = view.constraints ?? [];
    const regex = constraints.find((c) => c.type === AttributeConstraintType.RegExp);
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
                ? (view.content ?? []).map((item) => (item as { data: AuthoredAttributeValue }).data)
                : [],
        defaultValue:
            valueSourceKind === ValueSourceType.None
                ? (view.content?.[0] as { data?: AuthoredAttributeValue } | undefined)?.data
                : undefined,
        collectionRef: '',
        valueSourceParams: view.valueSource?.params,
        regexPattern: typeof regex?.data === 'string' ? regex.data : '',
        regexDescription: regex?.description ?? '',
        regexErrorMessage: regex?.errorMessage ?? '',
        otherConstraints: constraints.filter((c) => c.type !== AttributeConstraintType.RegExp),
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

/** Empty object means the definition is valid. */
export interface AuthoredAttributeErrors {
    name?: string;
    label?: string;
    contentType?: string;
    mappingFieldType?: string;
    mappingRdnCode?: string;
    mappingGeneralNameType?: string;
    mappingOtherNameOid?: string;
    mappingOtherNameEncoding?: string;
    mappingExtensionOid?: string;
    readOnly?: string;
    multiSelect?: string;
    defaultValue?: string;
    staticValues?: string;
    regexPattern?: string;
}

function validateSanMapping(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    if (!form.mappingGeneralNameType) {
        return { mappingGeneralNameType: 'Select the SAN type this attribute maps to.' };
    }
    if (form.mappingGeneralNameType !== GeneralNameType.OtherName) {
        return {};
    }
    const errors: AuthoredAttributeErrors = {};
    if (!form.mappingOtherNameOid?.trim()) {
        errors.mappingOtherNameOid = 'An otherName OID is required.';
    }
    if (!form.mappingOtherNameEncoding) {
        errors.mappingOtherNameEncoding = 'An otherName value encoding is required.';
    }
    return errors;
}

function validateMapping(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    if (!form.mappingFieldType) {
        return { mappingFieldType: 'A mapping target is required — pick where this attribute lands in the certificate.' };
    }
    const errors: AuthoredAttributeErrors = {};
    if (!isContentTypeAllowedForMapping(form.contentType)) {
        errors.contentType = 'A mapped request attribute must use content type String or Text.';
    }
    switch (form.mappingFieldType) {
        case FieldType.Rdn:
            if (!form.mappingRdnCode?.trim()) {
                errors.mappingRdnCode = 'Select the RDN this attribute maps to.';
            }
            break;
        case FieldType.San:
            Object.assign(errors, validateSanMapping(form));
            break;
        case FieldType.Extension:
            if (!form.mappingExtensionOid?.trim()) {
                errors.mappingExtensionOid = 'Select the certificate extension this attribute maps to.';
            }
            break;
    }
    return errors;
}

function validateProperties(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const errors: AuthoredAttributeErrors = {};
    const isList = form.list || form.valueSourceType === ValueSourceType.StaticList;
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
    if (form.valueSourceType !== ValueSourceType.StaticList) {
        return {};
    }
    const { staticValues, contentType } = form;
    if (staticValues.length === 0) {
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
export function validateAuthoredAttribute(form: AuthoredAttributeFormValues): AuthoredAttributeErrors {
    const identity: AuthoredAttributeErrors = {};
    if (!form.name.trim()) {
        identity.name = 'Name is required.';
    }
    if (!form.label.trim()) {
        identity.label = 'Label is required.';
    }
    return {
        ...identity,
        ...validateMapping(form),
        ...validateProperties(form),
        ...validateDefaultValue(form),
        ...validateStaticList(form),
        ...validateRegexConstraint(form),
    };
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
