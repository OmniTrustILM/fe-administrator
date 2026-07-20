import Button from 'components/Button';
import Checkbox from 'components/Checkbox';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import { AddCustomValueInput } from 'components/Input/DynamicContent/AddCustomValueInput';
import { ContentFieldConfiguration } from 'components/Input/DynamicContent';
import Label from 'components/Label';
import RadioRow from 'components/RadioRow';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getStepValue } from 'utils/common-utils';
import {
    AttributeContentType,
    AttributeSetMergeMode,
    ExtensionValueEncoding,
    FieldType,
    GeneralNameType,
    ObjectType,
    ValueSourceType,
} from 'types/openapi';
import {
    emptyAuthoredAttribute,
    emptyValueSourceBinding,
    hasDuplicateStaticValues,
    isAuthoredAttributeValid,
    isStaticListSupportedForContentType,
    isValueSourceBindingValid,
    type AuthoredAttributeFormValues,
    type RequestAttributeAuthoringFormValues,
    type ValueSourceBindingFormValues,
} from 'utils/requestAttributeAuthoring';

const MERGE_MODE_OPTIONS: { value: AttributeSetMergeMode; label: string; description: string }[] = [
    {
        value: AttributeSetMergeMode.StaticOnly,
        label: 'Static only',
        description: 'Only the request attributes configured here are used. Connector-supplied attributes are ignored.',
    },
    {
        value: AttributeSetMergeMode.ConnectorOnly,
        label: 'Connector only',
        description: 'Only the connector-supplied request attributes are used. The attributes configured here are ignored.',
    },
    {
        value: AttributeSetMergeMode.Merge,
        label: 'Merge',
        description: 'The attributes configured here are combined with the connector-supplied attributes into a single set.',
    },
];

const CONTENT_TYPE_OPTIONS = Object.values(AttributeContentType).map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
}));

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
    [FieldType.Rdn]: 'RDN (subject)',
    [FieldType.San]: 'Subject Alternative Name',
    [FieldType.Extension]: 'Certificate extension',
};

const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
    [FieldType.Rdn]: 'A component of the certificate subject name (e.g. CN, O). You must give the RDN code below.',
    [FieldType.San]: 'A Subject Alternative Name entry (DNS name, email, IP address, …). Pick the SAN type below.',
    [FieldType.Extension]: 'A certificate extension identified by its OID.',
};

const MAPPING_OPTIONS = Object.values(FieldType).map((v) => ({
    value: v,
    label: FIELD_TYPE_LABELS[v],
    description: FIELD_TYPE_DESCRIPTIONS[v],
}));

const GENERAL_NAME_TYPE_LABELS: Record<GeneralNameType, string> = {
    [GeneralNameType.Dns]: 'dNSName',
    [GeneralNameType.Email]: 'rfc822Name (email)',
    [GeneralNameType.Ip]: 'iPAddress',
    [GeneralNameType.Uri]: 'uniformResourceIdentifier',
    [GeneralNameType.OtherName]: 'otherName',
    [GeneralNameType.DirectoryName]: 'directoryName',
    [GeneralNameType.RegisteredId]: 'registeredID',
};

const GENERAL_NAME_TYPE_OPTIONS = Object.values(GeneralNameType).map((v) => ({ value: v, label: GENERAL_NAME_TYPE_LABELS[v] }));

const ENCODING_OPTIONS = Object.values(ExtensionValueEncoding).map((v) => ({ value: v, label: v }));

const VALUE_SOURCE_OPTIONS = [
    { value: ValueSourceType.None, label: 'Free input', description: 'The requester types any value.' },
    {
        value: ValueSourceType.StaticList,
        label: 'Static list',
        description: 'The requester picks from a fixed set of values you define below.',
    },
];

// Offered when the content type has no scalar editor — a static list can't be authored there.
const FREE_INPUT_ONLY_OPTIONS = VALUE_SOURCE_OPTIONS.slice(0, 1);

function valueSourceLabel(type: ValueSourceType): string {
    return VALUE_SOURCE_OPTIONS.find((o) => o.value === type)?.label ?? 'Free input';
}

/** `value` = attribute UUID, `label` = human display, `description` = internal attribute name (the binding name-fallback key). */
type ConnectorAttributeOption = { value: string; label: string; description?: string };

export type OidSelectOption = { value: string; label: string; description?: string; aliases?: string[]; code?: string };

// Resolve a stored mapping value to the option it belongs to. A legacy value may be an RDN code
// (e.g. CN) rather than the dotted OID the dropdown now emits, so match aliases too and return the
// canonical OID. Falls back to the (trimmed) stored value when nothing matches — for the synthetic
// off-list option below.
function resolveOidValue(options: OidSelectOption[], current?: string): string | undefined {
    const trimmed = current?.trim();
    if (!trimmed || options.some((o) => o.value === trimmed)) return trimmed || undefined;
    return options.find((o) => o.aliases?.includes(trimmed))?.value ?? trimmed;
}

// A strict dropdown would silently drop a stored value that isn't in the fetched list
// (e.g. a standard RDN like CN that lives in the backend SystemOid enum). Keep it selectable.
function withCurrentValue(options: OidSelectOption[], resolved?: string): OidSelectOption[] {
    if (!resolved || options.some((o) => o.value === resolved)) return options;
    return [...options, { value: resolved, label: `${resolved} (not in Custom OIDs)` }];
}

type OidMappingSelectProps = Readonly<{
    id: string;
    label: string;
    placeholder: string;
    /** e.g. `${dataTestId}-rdn` — suffixed with `-error` / `-empty` for the hints. */
    testIdPrefix: string;
    emptyHint: string;
    errorHint: string;
    options: OidSelectOption[];
    optionsError: boolean;
    optionsLoaded: boolean;
    value?: string;
    onChange: (next?: string) => void;
    disabled: boolean;
}>;

function OidMappingSelect({
    id,
    label,
    placeholder,
    testIdPrefix,
    emptyHint,
    errorHint,
    options,
    optionsError,
    optionsLoaded,
    value,
    onChange,
    disabled,
}: OidMappingSelectProps) {
    const resolved = resolveOidValue(options, value);
    const withCurrent = withCurrentValue(options, resolved);
    return (
        <>
            {optionsError && (
                <p className="text-sm text-red-600" data-testid={`${testIdPrefix}-error`}>
                    {errorHint}
                </p>
            )}
            {withCurrent.length === 0 ? (
                !optionsError &&
                optionsLoaded && (
                    <p className="text-sm text-gray-400" data-testid={`${testIdPrefix}-empty`}>
                        {emptyHint}
                    </p>
                )
            ) : (
                <Select
                    id={id}
                    label={label}
                    required
                    isSearchable
                    isClearable
                    isDisabled={disabled}
                    value={resolved ?? ''}
                    onChange={(v) => onChange((v as string) || undefined)}
                    options={withCurrent}
                    placeholder={placeholder}
                />
            )}
        </>
    );
}

type Props = Readonly<{
    value: RequestAttributeAuthoringFormValues;
    onChange: (next: RequestAttributeAuthoringFormValues) => void;
    /** RA-Profile authoring shows the merge-mode selector; the platform default set does not. */
    showMergeMode?: boolean;
    /** Value-source bindings are RA-Profile-only; the platform default DTO can't persist them. */
    showBindings?: boolean;
    disabled?: boolean;
    /** Optional connector attribute descriptors to pick a binding target from (name/uuid). */
    connectorAttributeOptions?: ConnectorAttributeOption[];
    /** Custom-OID entries (category rdnAttributeType) offered for the RDN mapping target. */
    rdnOptions?: OidSelectOption[];
    /** Custom-OID entries (category certificateExtension) offered for the extension mapping target. */
    extensionOptions?: OidSelectOption[];
    /** True when the last rdnOptions fetch failed — distinguishes a broken load from a legitimately empty list. */
    rdnOptionsError?: boolean;
    /** True when the last extensionOptions fetch failed — distinguishes a broken load from a legitimately empty list. */
    extensionOptionsError?: boolean;
    /** True once the rdnOptions fetch has resolved — gates the empty hint so it can't flash while loading. */
    rdnOptionsLoaded?: boolean;
    /** True once the extensionOptions fetch has resolved — gates the empty hint so it can't flash while loading. */
    extensionOptionsLoaded?: boolean;
    dataTestId?: string;
}>;

export default function RequestAttributeAuthoringEditor({
    value,
    onChange,
    showMergeMode = false,
    showBindings = true,
    disabled = false,
    connectorAttributeOptions,
    rdnOptions = [],
    extensionOptions = [],
    rdnOptionsError = false,
    extensionOptionsError = false,
    rdnOptionsLoaded = true,
    extensionOptionsLoaded = true,
    dataTestId = 'request-attribute-authoring',
}: Props) {
    const [attrDraft, setAttrDraft] = useState<{ index: number | null; data: AuthoredAttributeFormValues } | null>(null);
    const [bindingDraft, setBindingDraft] = useState<{ index: number | null; data: ValueSourceBindingFormValues } | null>(null);

    const patch = useCallback((next: Partial<RequestAttributeAuthoringFormValues>) => onChange({ ...value, ...next }), [onChange, value]);

    // -- Merge mode ------------------------------------------------------------
    const renderMergeMode = () =>
        showMergeMode ? (
            <div className="space-y-2" data-testid={`${dataTestId}-merge-mode`}>
                <p className="text-sm font-medium text-gray-700">Merge mode</p>
                <Container className="flex-col" gap={2}>
                    {MERGE_MODE_OPTIONS.map((opt) => (
                        <RadioRow
                            key={opt.value}
                            checked={value.mergeMode === opt.value}
                            onSelect={() => !disabled && patch({ mergeMode: opt.value })}
                        >
                            <span className="flex flex-col gap-0.5">
                                <span className="font-medium" data-testid={`${dataTestId}-merge-${opt.value}`}>
                                    {opt.label}
                                </span>
                                <span className="text-xs text-gray-500" data-testid={`${dataTestId}-merge-${opt.value}-description`}>
                                    {opt.description}
                                </span>
                            </span>
                        </RadioRow>
                    ))}
                </Container>
            </div>
        ) : null;

    // -- Authored attributes ---------------------------------------------------
    const removeAttribute = (index: number) => patch({ attributes: value.attributes.filter((_, i) => i !== index) });

    const saveAttribute = () => {
        if (!attrDraft) return;
        const next = [...value.attributes];
        if (attrDraft.index === null) {
            next.push(attrDraft.data);
        } else {
            next[attrDraft.index] = attrDraft.data;
        }
        patch({ attributes: next });
        setAttrDraft(null);
    };

    const rdnCodeDisplay = (stored?: string) => {
        const v = stored?.trim();
        if (!v) return '?';
        return rdnOptions.find((o) => o.value === v)?.code ?? v;
    };

    const mappingSummary = (attr: AuthoredAttributeFormValues) => {
        switch (attr.mappingFieldType) {
            case FieldType.Rdn:
                return `→ RDN ${rdnCodeDisplay(attr.mappingRdnCode)}`;
            case FieldType.San:
                return `→ SAN ${attr.mappingGeneralNameType ? GENERAL_NAME_TYPE_LABELS[attr.mappingGeneralNameType] : '?'}`;
            case FieldType.Extension:
                return `→ ext ${attr.mappingExtensionOid || '?'}`;
            default:
                return 'unmapped';
        }
    };

    const renderAttributeList = () => (
        <div className="space-y-2" data-testid={`${dataTestId}-attributes`}>
            <p className="text-sm font-medium text-gray-700">Authored attributes</p>
            {value.attributes.length === 0 ? (
                <p className="text-sm text-gray-400" data-testid={`${dataTestId}-attributes-empty`}>
                    No request attributes authored yet.
                </p>
            ) : (
                <ul className="space-y-1">
                    {value.attributes.map((attr, index) => (
                        <li
                            key={attr.uuid ?? `${attr.name}-${index}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
                            data-testid={`${dataTestId}-attribute-row`}
                        >
                            <span className="truncate">
                                <span className="font-medium">{attr.label || attr.name || '(unnamed)'}</span>
                                <span className="text-gray-500">
                                    {' · '}
                                    {attr.contentType}
                                    {attr.required ? ' · required' : ''} {mappingSummary(attr)}
                                    {attr.valueSourceType !== ValueSourceType.None ? ` · ${valueSourceLabel(attr.valueSourceType)}` : ''}
                                </span>
                            </span>
                            <span className="flex shrink-0 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setAttrDraft({ index, data: { ...attr } })}
                                    disabled={disabled}
                                    type="button"
                                    data-testid={`${dataTestId}-attribute-edit`}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    color="danger"
                                    onClick={() => removeAttribute(index)}
                                    disabled={disabled}
                                    type="button"
                                    data-testid={`${dataTestId}-attribute-remove`}
                                >
                                    Remove
                                </Button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <Button
                variant="outline"
                onClick={() => setAttrDraft({ index: null, data: emptyAuthoredAttribute() })}
                disabled={disabled}
                type="button"
                data-testid={`${dataTestId}-attribute-add`}
            >
                + Add request attribute
            </Button>
        </div>
    );

    // A name must be unique within the set (excluding the row being edited).
    const attrNameDuplicate =
        !!attrDraft &&
        !!attrDraft.data.name.trim() &&
        value.attributes.some((a, i) => i !== attrDraft.index && a.name.trim() === attrDraft.data.name.trim());
    const attrValid = !!attrDraft && isAuthoredAttributeValid(attrDraft.data) && !attrNameDuplicate;

    const renderAttributeDialog = () => {
        if (!attrDraft) return null;
        const d = attrDraft.data;
        const set = (p: Partial<AuthoredAttributeFormValues>) => setAttrDraft({ ...attrDraft, data: { ...d, ...p } });
        return (
            <div className="space-y-3 text-left" data-testid={`${dataTestId}-attribute-form`}>
                <TextInput
                    id="ra-attr-name"
                    label="Name"
                    labelTooltip="Internal identifier, unique within this set. Not shown to the requester."
                    placeholder="Enter name"
                    required
                    value={d.name}
                    onChange={(v) => set({ name: v })}
                />
                {attrNameDuplicate && (
                    <p className="text-sm text-red-600" data-testid={`${dataTestId}-attribute-name-duplicate`}>
                        An attribute with this name already exists in the set.
                    </p>
                )}
                <TextInput
                    id="ra-attr-label"
                    label="Label"
                    placeholder="Enter label"
                    required
                    value={d.label}
                    onChange={(v) => set({ label: v })}
                />
                <TextInput
                    id="ra-attr-description"
                    label="Description"
                    placeholder="Enter description"
                    value={d.description ?? ''}
                    onChange={(v) => set({ description: v })}
                />
                <Select
                    id="ra-attr-content-type"
                    label="Content type"
                    labelTooltip="The data type of the value the requester provides."
                    value={d.contentType}
                    onChange={(v) => {
                        const contentType = v as AttributeContentType;
                        // Static list is only authorable for scalar content types; drop back to free
                        // input if the new type can't carry one, so we never render a missing editor.
                        const keepStaticList = isStaticListSupportedForContentType(contentType);
                        // Drop both the static list and any free-input default — a value entered under
                        // the old type would otherwise survive and serialise as a wrong-typed content entry.
                        set({
                            contentType,
                            staticValues: [],
                            defaultValue: undefined,
                            valueSourceType: keepStaticList ? d.valueSourceType : ValueSourceType.None,
                        });
                    }}
                    options={CONTENT_TYPE_OPTIONS}
                />
                <Select
                    id="ra-attr-mapping"
                    label="Mapping target"
                    labelTooltip="Where this attribute's value is placed in the issued certificate: an RDN (subject) component, a Subject Alternative Name, or a certificate extension. Leave it unmapped if the connector or workflow consumes the value directly."
                    value={d.mappingFieldType ?? ''}
                    onChange={(v) =>
                        set({ mappingFieldType: (v as FieldType) || undefined, mappingObjectType: ObjectType.X509Certificate })
                    }
                    options={MAPPING_OPTIONS}
                    isClearable
                    placeholder="Not mapped"
                />
                {d.mappingFieldType === FieldType.Rdn && (
                    <OidMappingSelect
                        id="ra-attr-rdn"
                        label="RDN"
                        placeholder="Select an RDN"
                        testIdPrefix={`${dataTestId}-rdn`}
                        emptyHint="No RDNs defined under Custom OIDs."
                        errorHint="Failed to load RDNs from Custom OIDs."
                        options={rdnOptions}
                        optionsError={rdnOptionsError}
                        optionsLoaded={rdnOptionsLoaded}
                        value={d.mappingRdnCode}
                        onChange={(v) => set({ mappingRdnCode: v })}
                        disabled={disabled}
                    />
                )}
                {d.mappingFieldType === FieldType.San && (
                    <>
                        <Select
                            id="ra-attr-general-name-type"
                            label="SAN type"
                            required
                            value={d.mappingGeneralNameType ?? ''}
                            onChange={(v) => set({ mappingGeneralNameType: (v as GeneralNameType) || undefined })}
                            options={GENERAL_NAME_TYPE_OPTIONS}
                            placeholder="Select SAN type"
                        />
                        {d.mappingGeneralNameType === GeneralNameType.OtherName && (
                            <>
                                <TextInput
                                    id="ra-attr-othername-oid"
                                    label="otherName OID"
                                    required
                                    value={d.mappingOtherNameOid ?? ''}
                                    onChange={(v) => set({ mappingOtherNameOid: v })}
                                />
                                <Select
                                    id="ra-attr-othername-encoding"
                                    label="otherName value encoding"
                                    required
                                    value={d.mappingOtherNameEncoding ?? ''}
                                    onChange={(v) => set({ mappingOtherNameEncoding: (v as ExtensionValueEncoding) || undefined })}
                                    options={ENCODING_OPTIONS}
                                    placeholder="Select encoding"
                                />
                            </>
                        )}
                    </>
                )}
                {d.mappingFieldType === FieldType.Extension && (
                    <>
                        <OidMappingSelect
                            id="ra-attr-extension-oid"
                            label="Extension"
                            placeholder="Select an extension"
                            testIdPrefix={`${dataTestId}-extension`}
                            emptyHint="No certificate extensions defined under Custom OIDs."
                            errorHint="Failed to load certificate extensions from Custom OIDs."
                            options={extensionOptions}
                            optionsError={extensionOptionsError}
                            optionsLoaded={extensionOptionsLoaded}
                            value={d.mappingExtensionOid}
                            onChange={(v) => set({ mappingExtensionOid: v })}
                            disabled={disabled}
                        />
                        <Checkbox
                            id="ra-attr-critical-overridable"
                            checked={d.mappingCriticalOverridable ?? false}
                            onChange={(c) => set({ mappingCriticalOverridable: c })}
                            label="Requester may override criticality"
                            disabled={disabled}
                        />
                    </>
                )}
                <Select
                    id="ra-attr-value-source"
                    label="Value source"
                    labelTooltip="How the requester provides the value: free input (they type any value) or a static list (they pick from a fixed set of values you define)."
                    value={d.valueSourceType}
                    onChange={(v) => {
                        const valueSourceType = v as ValueSourceType;
                        // Selecting a static list forces `list` on (see DTO builder) so the toggle and
                        // the authored options never disagree; List and Read Only are mutually exclusive, so clear it.
                        // Free input is a single typed value, so it clears the list/multi-select toggles.
                        set({
                            valueSourceType,
                            ...(valueSourceType === ValueSourceType.StaticList
                                ? { list: true, readOnly: false }
                                : { list: false, multiSelect: false }),
                        });
                    }}
                    options={isStaticListSupportedForContentType(d.contentType) ? VALUE_SOURCE_OPTIONS : FREE_INPUT_ONLY_OPTIONS}
                />
                <div className="space-y-2">
                    <Label>Properties</Label>
                    <Container className="flex-row items-center" gap={4}>
                        <Checkbox
                            id="ra-attr-required"
                            checked={d.required}
                            onChange={(c) => set({ required: c })}
                            label="Required"
                            disabled={disabled}
                        />
                        {/* List/Multi select apply to a static list only; free input is a single typed value. */}
                        {d.valueSourceType === ValueSourceType.StaticList && (
                            <>
                                <Checkbox
                                    id="ra-attr-list"
                                    checked={d.list || d.valueSourceType === ValueSourceType.StaticList}
                                    onChange={(c) => set({ list: c, multiSelect: c ? d.multiSelect : false })}
                                    label="List"
                                    // A static list is inherently a list attribute — locked on while it's selected.
                                    disabled={disabled || d.valueSourceType === ValueSourceType.StaticList}
                                />
                                <Checkbox
                                    id="ra-attr-multi"
                                    checked={d.multiSelect}
                                    onChange={(c) => set({ multiSelect: c })}
                                    label="Multi select"
                                    disabled={disabled || !d.list}
                                />
                            </>
                        )}
                        {/* Read Only applies to free input only (lock the single value to its default). */}
                        {d.valueSourceType === ValueSourceType.None && (
                            <Checkbox
                                id="ra-attr-readonly"
                                checked={d.readOnly}
                                onChange={(c) => set({ readOnly: c })}
                                label="Read Only"
                                disabled={disabled}
                            />
                        )}
                    </Container>
                </div>
                {d.valueSourceType === ValueSourceType.StaticList && renderStaticValues(d, set)}
                {d.valueSourceType === ValueSourceType.None && renderFreeInputDefault(d, set)}
            </div>
        );
    };

    // The static list options a requester picks from. Stored in the attribute `content` array
    // (ValueSource carries no values); each input is typed by the attribute's content type,
    // mirroring the custom-attribute "Add Content" UI.
    const renderStaticValues = (d: AuthoredAttributeFormValues, set: (p: Partial<AuthoredAttributeFormValues>) => void) => {
        // Guard the lookup: value-source options are already filtered to configured content types, so
        // this only trips if a content type without a scalar editor slips through — render nothing
        // rather than dereference a missing configuration.
        const config = ContentFieldConfiguration[d.contentType];
        if (!config) return null;
        const inputType = config.type;
        const addValue = () => set({ staticValues: [...d.staticValues, config.initial] });
        const setValueAt = (index: number, next: string | number | boolean) =>
            set({ staticValues: d.staticValues.map((v, i) => (i === index ? next : v)) });
        const removeValueAt = (index: number) => set({ staticValues: d.staticValues.filter((_, i) => i !== index) });
        return (
            <div className="space-y-2" data-testid={`${dataTestId}-static-values`}>
                {/* Group label for the value rows below — not tied to a single input's id. */}
                <Label>Static list values</Label>
                {d.staticValues.map((v, index) => (
                    <div key={index} className="flex items-center gap-2" data-testid={`${dataTestId}-static-value-row`}>
                        <div className="flex-1">
                            <AddCustomValueInput
                                id={`ra-attr-static-value-${index}`}
                                inputType={inputType}
                                contentType={d.contentType}
                                fieldStepValue={getStepValue(inputType)}
                                value={v}
                                onChange={(next) => setValueAt(index, next)}
                                readOnly={disabled}
                            />
                        </div>
                        <Button
                            variant="outline"
                            color="danger"
                            onClick={() => removeValueAt(index)}
                            disabled={disabled}
                            type="button"
                            data-testid={`${dataTestId}-static-value-remove`}
                        >
                            Remove
                        </Button>
                    </div>
                ))}
                {d.staticValues.length === 0 && (
                    <p className="text-sm text-gray-400" data-testid={`${dataTestId}-static-values-empty`}>
                        Add at least one value for the static list.
                    </p>
                )}
                {hasDuplicateStaticValues(d.staticValues) && (
                    <p className="text-sm text-red-600" data-testid={`${dataTestId}-static-values-duplicate`}>
                        Static list values must be unique.
                    </p>
                )}
                <Button
                    variant="transparent"
                    className="text-blue-600"
                    onClick={addValue}
                    disabled={disabled}
                    type="button"
                    data-testid={`${dataTestId}-static-value-add`}
                >
                    <Plus className="w-4 h-4" />
                    Add value
                </Button>
            </div>
        );
    };

    // Optional default for a free-input attribute (valueSourceType === NONE). One scalar input typed by
    // the content type; persisted like a single-entry static list. Non-scalar types have no editor.
    const renderFreeInputDefault = (d: AuthoredAttributeFormValues, set: (p: Partial<AuthoredAttributeFormValues>) => void) => {
        const config = ContentFieldConfiguration[d.contentType];
        if (!config) return null;
        return (
            <div className="space-y-2" data-testid={`${dataTestId}-default-value-block`}>
                <Label labelTooltip="Optional. Pre-fills the field on the request form; the requester can change it unless Read Only is set.">
                    Default value
                </Label>
                <AddCustomValueInput
                    id="ra-attr-default-value"
                    inputType={config.type}
                    contentType={d.contentType}
                    fieldStepValue={getStepValue(config.type)}
                    value={d.defaultValue ?? ''}
                    onChange={(next) => set({ defaultValue: next })}
                    readOnly={disabled}
                    placeholder="Enter default value"
                />
            </div>
        );
    };

    // -- Value-source bindings -------------------------------------------------
    const removeBinding = (index: number) => patch({ valueSourceBindings: value.valueSourceBindings.filter((_, i) => i !== index) });

    const saveBinding = () => {
        if (!bindingDraft) return;
        const next = [...value.valueSourceBindings];
        if (bindingDraft.index === null) {
            next.push(bindingDraft.data);
        } else {
            next[bindingDraft.index] = bindingDraft.data;
        }
        patch({ valueSourceBindings: next });
        setBindingDraft(null);
    };

    const bindingTargetLabel = (b: ValueSourceBindingFormValues) => b.attributeName?.trim() || b.attributeUuid?.trim() || '(no target)';

    const renderBindings = () => (
        <div className="space-y-2" data-testid={`${dataTestId}-bindings`}>
            <p className="text-sm font-medium text-gray-700">Value-source bindings</p>
            <p className="text-xs text-gray-400">Attach a value source onto a connector-supplied attribute by reference (UUID or name).</p>
            {value.valueSourceBindings.length === 0 ? (
                <p className="text-sm text-gray-400" data-testid={`${dataTestId}-bindings-empty`}>
                    No value-source bindings.
                </p>
            ) : (
                <ul className="space-y-1">
                    {value.valueSourceBindings.map((b, index) => (
                        <li
                            key={b.attributeUuid || b.attributeName || index}
                            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
                            data-testid={`${dataTestId}-binding-row`}
                        >
                            <span className="truncate">
                                <span className="font-medium">{bindingTargetLabel(b)}</span>
                                <span className="text-gray-500">{` → ${valueSourceLabel(b.valueSourceType)}`}</span>
                            </span>
                            <span className="flex shrink-0 gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setBindingDraft({ index, data: { ...b } })}
                                    disabled={disabled}
                                    type="button"
                                    data-testid={`${dataTestId}-binding-edit`}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    color="danger"
                                    onClick={() => removeBinding(index)}
                                    disabled={disabled}
                                    type="button"
                                    data-testid={`${dataTestId}-binding-remove`}
                                >
                                    Remove
                                </Button>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <Button
                variant="outline"
                onClick={() => setBindingDraft({ index: null, data: emptyValueSourceBinding() })}
                disabled={disabled}
                type="button"
                data-testid={`${dataTestId}-binding-add`}
            >
                + Add value-source binding
            </Button>
        </div>
    );

    const bindingValid = !!bindingDraft && isValueSourceBindingValid(bindingDraft.data);

    const renderBindingDialog = () => {
        if (!bindingDraft) return null;
        const d = bindingDraft.data;
        const set = (p: Partial<ValueSourceBindingFormValues>) => setBindingDraft({ ...bindingDraft, data: { ...d, ...p } });
        return (
            <div className="space-y-3 text-left" data-testid={`${dataTestId}-binding-form`}>
                {connectorAttributeOptions && connectorAttributeOptions.length > 0 && (
                    <Select
                        id="ra-binding-connector-attr"
                        label="Connector attribute"
                        value={d.attributeUuid || ''}
                        onChange={(v) => {
                            const opt = connectorAttributeOptions.find((o) => o.value === v);
                            // Bind by UUID (primary) + internal attribute name (fallback key, from the
                            // option's `description`) — never the display label. Descriptors without a
                            // real UUID fall back to name-only (their option value equals the name), so
                            // only store a UUID when it differs from the internal name. Clearing resets both.
                            const hasRealUuid = !!opt && opt.value !== opt.description;
                            set({ attributeUuid: hasRealUuid ? opt.value : '', attributeName: opt?.description ?? '' });
                        }}
                        options={connectorAttributeOptions}
                        showOptionDescriptionInDropdown
                        isClearable
                        placeholder="Pick a connector attribute (optional)"
                    />
                )}
                <TextInput
                    id="ra-binding-uuid"
                    label="Attribute UUID"
                    value={d.attributeUuid ?? ''}
                    onChange={(v) => set({ attributeUuid: v })}
                />
                <TextInput
                    id="ra-binding-name"
                    label="Attribute name"
                    value={d.attributeName ?? ''}
                    onChange={(v) => set({ attributeName: v })}
                />
                <Select
                    id="ra-binding-value-source"
                    label="Value source"
                    value={d.valueSourceType}
                    onChange={(v) => set({ valueSourceType: v as ValueSourceType })}
                    options={VALUE_SOURCE_OPTIONS}
                />
                {!bindingValid && (
                    <p className="text-sm text-red-600" data-testid={`${dataTestId}-binding-error`}>
                        A binding requires either a UUID or a name.
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-5" data-testid={dataTestId}>
            {renderMergeMode()}
            {renderAttributeList()}
            {showBindings && renderBindings()}

            <Dialog
                isOpen={!!attrDraft}
                toggle={() => setAttrDraft(null)}
                size="lg"
                caption={attrDraft?.index === null ? 'Add request attribute' : 'Edit request attribute'}
                body={renderAttributeDialog()}
                buttons={[
                    { key: 'cancel', color: 'secondary', variant: 'outline', body: 'Cancel', onClick: () => setAttrDraft(null) },
                    { key: 'save', color: 'primary', body: 'Save', disabled: !attrValid, onClick: saveAttribute },
                ]}
            />

            <Dialog
                isOpen={!!bindingDraft}
                toggle={() => setBindingDraft(null)}
                size="md"
                caption={bindingDraft?.index === null ? 'Add value-source binding' : 'Edit value-source binding'}
                body={renderBindingDialog()}
                buttons={[
                    { key: 'cancel', color: 'secondary', variant: 'outline', body: 'Cancel', onClick: () => setBindingDraft(null) },
                    { key: 'save', color: 'primary', body: 'Save', disabled: !bindingValid, onClick: saveBinding },
                ]}
            />
        </div>
    );
}
