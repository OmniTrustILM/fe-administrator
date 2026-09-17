import { describe, expect, it, test } from 'vitest';
import {
    AttributeConstraintType,
    AttributeContentType,
    AttributeSetMergeMode,
    AttributeType,
    AttributeVersion,
    ExtensionValueEncoding,
    FieldSource,
    FieldType,
    GeneralNameType,
    ObjectType,
    ValueSourceType,
    type BaseAttributeDto,
    type RaProfileCertificateRequestAttributesDto,
} from 'types/openapi';
import type { FieldMappingModel } from 'types/requestAttributeMapping';
import {
    DEFAULT_MERGE_MODE,
    buildAuthoredAttributeDto,
    buildPlatformDefaultUpdateDto,
    buildRaProfileRequestAttributesUpdateDto,
    buildValueSourceBindingDto,
    emptyAuthoredAttribute,
    emptyAuthoringForm,
    emptyValueSourceBinding,
    hasAuthoredRequestAttributes,
    firstAuthoredAttributeError,
    getRegexPatternError,
    hasMappingTarget,
    isContentTypeAllowedForMapping,
    isJsonSchemaConstraintSupportedForContentType,
    isRegexConstraintSupportedForContentType,
    isStructuredMappingTarget,
    structuredMappingTarget,
    isReadOnlyDefaultValid,
    isStaticListSupportedForContentType,
    isValueSourceBindingValid,
    isValueValidForContentType,
    validateAuthoredAttribute,
    validateMappingTargets,
    withBooleanReadOnlyDefault,
    withMappingTargets,
    parseAuthoredAttributeDto,
    parsePlatformDefaultDto,
    parseRaProfileRequestAttributesDto,
    type AuthoredAttributeFormValues,
    type MappingTargetFormValues,
    type ValueSourceBindingFormValues,
} from './requestAttributeAuthoring';

const mappingOf = (dto: { fieldMapping?: unknown }) => dto.fieldMapping as FieldMappingModel | undefined;

const baseAttr = (): AuthoredAttributeFormValues => ({
    ...emptyAuthoredAttribute(),
    name: 'serverFqdn',
    label: 'Server FQDN',
    contentType: AttributeContentType.String,
    required: true,
});

const freeInput = (over: Partial<AuthoredAttributeFormValues>): AuthoredAttributeFormValues => ({
    ...baseAttr(),
    valueSourceType: ValueSourceType.None,
    ...over,
});

const rdnTarget = (rdnCode: string): MappingTargetFormValues => ({ fieldType: FieldType.Rdn, rdnCode });
const sanTarget = (generalNameType: GeneralNameType, over: Partial<MappingTargetFormValues> = {}): MappingTargetFormValues => ({
    fieldType: FieldType.San,
    generalNameType,
    ...over,
});
const extensionTarget = (extensionOid: string, over: Partial<MappingTargetFormValues> = {}): MappingTargetFormValues => ({
    fieldType: FieldType.Extension,
    extensionOid,
    ...over,
});
const mapped = (...mappingTargets: MappingTargetFormValues[]): AuthoredAttributeFormValues => ({ ...baseAttr(), mappingTargets });

describe('requestAttributeAuthoring', () => {
    describe('defaults', () => {
        test('DEFAULT_MERGE_MODE is STATIC_ONLY', () => {
            expect(DEFAULT_MERGE_MODE).toBe(AttributeSetMergeMode.StaticOnly);
        });

        test('emptyAuthoringForm starts with STATIC_ONLY and empty lists', () => {
            const form = emptyAuthoringForm();
            expect(form.mergeMode).toBe(AttributeSetMergeMode.StaticOnly);
            expect(form.attributes).toEqual([]);
            expect(form.valueSourceBindings).toEqual([]);
        });

        test('emptyAuthoredAttribute starts with one unpicked mapping target and NONE value source', () => {
            const attr = emptyAuthoredAttribute();
            expect(attr.mappingTargets).toHaveLength(1);
            expect(hasMappingTarget(attr)).toBe(false);
            expect(attr.valueSourceType).toBe(ValueSourceType.None);
        });

        test('emptyAuthoredAttribute carries a stable uuid preserved across repeated builds', () => {
            const attr = emptyAuthoredAttribute();
            expect(attr.uuid).toBeTruthy();
            const first = buildAuthoredAttributeDto({ ...attr, name: 'a', label: 'A' });
            const second = buildAuthoredAttributeDto({ ...attr, name: 'a', label: 'A' });
            expect(first.uuid).toBe(attr.uuid);
            expect(second.uuid).toBe(attr.uuid);
        });

        test('emptyValueSourceBinding defaults to NONE', () => {
            expect(emptyValueSourceBinding().valueSourceType).toBe(ValueSourceType.None);
        });
    });

    describe('buildAuthoredAttributeDto', () => {
        test('produces a v3 data attribute with properties', () => {
            const dto = buildAuthoredAttributeDto(baseAttr());
            expect(dto.type).toBe(AttributeType.Data);
            expect(dto.schemaVersion).toBe(AttributeVersion.V3);
            expect(dto.version).toBe(3);
            expect(dto.name).toBe('serverFqdn');
            expect(dto.contentType).toBe(AttributeContentType.String);
            expect(dto.properties.label).toBe('Server FQDN');
            expect(dto.properties.required).toBe(true);
            expect(dto.properties.visible).toBe(true);
            expect(dto.uuid).toBeTruthy();
        });

        test('preserves an existing uuid on edit', () => {
            const dto = buildAuthoredAttributeDto({ ...baseAttr(), uuid: 'fixed-uuid' });
            expect(dto.uuid).toBe('fixed-uuid');
        });

        test('omits fieldMapping when no mapping target is chosen', () => {
            expect(buildAuthoredAttributeDto(baseAttr()).fieldMapping).toBeUndefined();
        });

        test('omits description when blank', () => {
            expect(buildAuthoredAttributeDto({ ...baseAttr(), description: '' }).description).toBeUndefined();
        });

        test('writes an RDN mapping with the code and default x509Certificate object type', () => {
            const dto = buildAuthoredAttributeDto(mapped(rdnTarget('CN')));
            const mapping = mappingOf(dto);
            expect(mapping?.objectType).toBe(ObjectType.X509Certificate);
            expect(mapping?.fields).toEqual([{ fieldType: FieldType.Rdn, rdn: 'CN' }]);
        });

        test('writes a SAN mapping with generalNameType and omits otherName fields for non-OTHER_NAME', () => {
            const dto = buildAuthoredAttributeDto(mapped(sanTarget(GeneralNameType.Dns)));
            expect(mappingOf(dto)?.fields).toEqual([
                {
                    fieldType: FieldType.San,
                    generalNameType: GeneralNameType.Dns,
                    otherNameOid: undefined,
                    otherNameValueEncoding: undefined,
                },
            ]);
        });

        test('writes otherName OID + encoding when generalNameType is OTHER_NAME', () => {
            const dto = buildAuthoredAttributeDto(
                mapped(
                    sanTarget(GeneralNameType.OtherName, {
                        otherNameOid: '1.3.6.1.4.1.311.20.2.3',
                        otherNameEncoding: ExtensionValueEncoding.Utf8String,
                    }),
                ),
            );
            const field = mappingOf(dto)?.fields[0] as { otherNameOid?: string; otherNameValueEncoding?: string };
            expect(field.otherNameOid).toBe('1.3.6.1.4.1.311.20.2.3');
            expect(field.otherNameValueEncoding).toBe(ExtensionValueEncoding.Utf8String);
        });

        test('writes an extension mapping with OID and criticalOverridable', () => {
            const dto = buildAuthoredAttributeDto(mapped(extensionTarget('2.5.29.17', { criticalOverridable: true })));
            expect(mappingOf(dto)?.fields).toEqual([
                { fieldType: FieldType.Extension, extensionOid: '2.5.29.17', criticalOverridable: true },
            ]);
        });

        test('SAN mapping without a generalNameType produces no fieldMapping', () => {
            expect(buildAuthoredAttributeDto(mapped({ fieldType: FieldType.San })).fieldMapping).toBeUndefined();
        });

        test('omits valueSource when NONE', () => {
            expect(buildAuthoredAttributeDto(baseAttr()).valueSource).toBeUndefined();
        });

        test('writes valueSource kind for STATIC_LIST', () => {
            const dto = buildAuthoredAttributeDto({ ...baseAttr(), valueSourceType: ValueSourceType.StaticList });
            expect(dto.valueSource?.kind).toBe(ValueSourceType.StaticList);
        });

        test('writes the static list values into content, typed by contentType', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['prod', 'staging'],
            });
            expect(dto.content).toEqual([
                { data: 'prod', contentType: AttributeContentType.String },
                { data: 'staging', contentType: AttributeContentType.String },
            ]);
        });

        test('omits content when the value source is not STATIC_LIST', () => {
            const dto = buildAuthoredAttributeDto({ ...baseAttr(), valueSourceType: ValueSourceType.None, staticValues: ['x'] });
            expect(dto.content).toBeUndefined();
        });

        test('omits content when STATIC_LIST has no values', () => {
            const dto = buildAuthoredAttributeDto({ ...baseAttr(), valueSourceType: ValueSourceType.StaticList, staticValues: [] });
            expect(dto.content).toBeUndefined();
        });

        test('forces properties.list on for a STATIC_LIST even when the toggle is off', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                list: false,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['prod'],
            });
            expect(dto.properties.list).toBe(true);
        });

        test('leaves properties.list under the toggle when the source is not STATIC_LIST', () => {
            expect(buildAuthoredAttributeDto({ ...baseAttr(), list: false }).properties.list).toBe(false);
            expect(buildAuthoredAttributeDto({ ...baseAttr(), list: true }).properties.list).toBe(true);
        });

        test('trims string static values written to content', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                contentType: AttributeContentType.String,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['  prod  ', 'staging'],
            });
            expect(dto.content).toEqual([
                { data: 'prod', contentType: AttributeContentType.String },
                { data: 'staging', contentType: AttributeContentType.String },
            ]);
        });

        test('coerces integer static values to numbers (including the untouched string default)', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                contentType: AttributeContentType.Integer,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['0', 3, '  5 '],
            });
            expect(dto.content).toEqual([
                { data: 0, contentType: AttributeContentType.Integer },
                { data: 3, contentType: AttributeContentType.Integer },
                { data: 5, contentType: AttributeContentType.Integer },
            ]);
            (dto.content ?? []).forEach((item) => {
                expect(typeof (item as { data: unknown }).data).toBe('number');
            });
        });

        test('coerces float static values to numbers', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                contentType: AttributeContentType.Float,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['0', '1.5'],
            });
            expect(dto.content).toEqual([
                { data: 0, contentType: AttributeContentType.Float },
                { data: 1.5, contentType: AttributeContentType.Float },
            ]);
        });

        test('coerces boolean static values to booleans', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                contentType: AttributeContentType.Boolean,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: [true, 'false'],
            });
            expect(dto.content).toEqual([
                { data: true, contentType: AttributeContentType.Boolean },
                { data: false, contentType: AttributeContentType.Boolean },
            ]);
        });
    });

    describe('isStaticListSupportedForContentType', () => {
        test('true for scalar content types with an authoring input', () => {
            [
                AttributeContentType.String,
                AttributeContentType.Text,
                AttributeContentType.Integer,
                AttributeContentType.Float,
                AttributeContentType.Boolean,
                AttributeContentType.Date,
                AttributeContentType.Time,
                AttributeContentType.Datetime,
            ].forEach((ct) => {
                expect(isStaticListSupportedForContentType(ct)).toBe(true);
            });
        });

        test('false for content types without a scalar authoring input', () => {
            [
                AttributeContentType.Secret,
                AttributeContentType.File,
                AttributeContentType.Credential,
                AttributeContentType.Codeblock,
                AttributeContentType.Object,
                AttributeContentType.Resource,
            ].forEach((ct) => {
                expect(isStaticListSupportedForContentType(ct)).toBe(false);
            });
        });
    });

    describe('parseAuthoredAttributeDto round-trip', () => {
        test('parse(build(x)) preserves the meaningful fields', () => {
            const original: AuthoredAttributeFormValues = {
                ...baseAttr(),
                uuid: 'u1',
                description: 'the fqdn',
                list: true,
                mappingObjectType: ObjectType.X509Certificate,
                mappingTargets: [rdnTarget('CN')],
                valueSourceType: ValueSourceType.StaticList,
            };
            const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(original) as BaseAttributeDto);
            expect(parsed.name).toBe('serverFqdn');
            expect(parsed.label).toBe('Server FQDN');
            expect(parsed.required).toBe(true);
            expect(parsed.list).toBe(true);
            expect(parsed.description).toBe('the fqdn');
            expect(parsed.mappingTargets).toHaveLength(1);
            expect(parsed.mappingTargets[0]).toMatchObject({ fieldType: FieldType.Rdn, rdnCode: 'CN' });
            expect(parsed.valueSourceType).toBe(ValueSourceType.StaticList);
            expect(parsed.uuid).toBe('u1');
        });

        test('round-trips STATIC_LIST values through content', () => {
            const parsed = parseAuthoredAttributeDto(
                buildAuthoredAttributeDto({
                    ...baseAttr(),
                    valueSourceType: ValueSourceType.StaticList,
                    staticValues: ['prod', 'staging'],
                }) as BaseAttributeDto,
            );
            expect(parsed.staticValues).toEqual(['prod', 'staging']);
        });

        test('round-trips a SAN otherName mapping', () => {
            const parsed = parseAuthoredAttributeDto(
                buildAuthoredAttributeDto(
                    mapped(
                        sanTarget(GeneralNameType.OtherName, {
                            otherNameOid: '1.2.3',
                            otherNameEncoding: ExtensionValueEncoding.Utf8String,
                        }),
                    ),
                ) as BaseAttributeDto,
            );
            expect(parsed.mappingTargets[0]).toMatchObject({
                fieldType: FieldType.San,
                generalNameType: GeneralNameType.OtherName,
                otherNameOid: '1.2.3',
                otherNameEncoding: ExtensionValueEncoding.Utf8String,
            });
        });

        test('falls back to NONE value source and no mapping when absent', () => {
            const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(baseAttr()) as BaseAttributeDto);
            expect(parsed.valueSourceType).toBe(ValueSourceType.None);
            expect(parsed.mappingTargets).toEqual([]);
        });
    });

    describe('isValueValidForContentType', () => {
        test('blank is always accepted — required-ness is a separate rule', () => {
            expect(isValueValidForContentType('', AttributeContentType.Integer)).toBe(true);
            expect(isValueValidForContentType('   ', AttributeContentType.Date)).toBe(true);
        });

        test('integer accepts whole numbers only', () => {
            expect(isValueValidForContentType('42', AttributeContentType.Integer)).toBe(true);
            expect(isValueValidForContentType('-7', AttributeContentType.Integer)).toBe(true);
            expect(isValueValidForContentType(42, AttributeContentType.Integer)).toBe(true);
            expect(isValueValidForContentType('4.2', AttributeContentType.Integer)).toBe(false);
            expect(isValueValidForContentType('abc', AttributeContentType.Integer)).toBe(false);
            expect(isValueValidForContentType(4.2, AttributeContentType.Integer)).toBe(false);
        });

        test('float accepts decimals and rejects non-numerics', () => {
            expect(isValueValidForContentType('4.2', AttributeContentType.Float)).toBe(true);
            expect(isValueValidForContentType('-1e3', AttributeContentType.Float)).toBe(true);
            expect(isValueValidForContentType('abc', AttributeContentType.Float)).toBe(false);
        });

        test('boolean accepts only booleans and their literal spellings, in any case', () => {
            expect(isValueValidForContentType(true, AttributeContentType.Boolean)).toBe(true);
            expect(isValueValidForContentType('false', AttributeContentType.Boolean)).toBe(true);
            expect(isValueValidForContentType('yes', AttributeContentType.Boolean)).toBe(false);

            // Persisting lowercases before comparing, so validation must not be stricter than that.
            expect(isValueValidForContentType('TRUE', AttributeContentType.Boolean)).toBe(true);
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                contentType: AttributeContentType.Boolean,
                valueSourceType: ValueSourceType.StaticList,
                staticValues: ['TRUE'],
            });
            expect(dto.content).toEqual([{ data: true, contentType: AttributeContentType.Boolean }]);
        });

        test('date / time / datetime are format-checked', () => {
            expect(isValueValidForContentType('2026-07-29', AttributeContentType.Date)).toBe(true);
            expect(isValueValidForContentType('29/07/2026', AttributeContentType.Date)).toBe(false);
            expect(isValueValidForContentType('14:30', AttributeContentType.Time)).toBe(true);
            expect(isValueValidForContentType('2 pm', AttributeContentType.Time)).toBe(false);
            expect(isValueValidForContentType('2026-07-29T14:30:00Z', AttributeContentType.Datetime)).toBe(true);
            expect(isValueValidForContentType('not a date', AttributeContentType.Datetime)).toBe(false);
        });

        test('string and text accept anything', () => {
            expect(isValueValidForContentType('whatever', AttributeContentType.String)).toBe(true);
            expect(isValueValidForContentType('whatever', AttributeContentType.Text)).toBe(true);
        });
    });

    describe('validateAuthoredAttribute', () => {
        const mappedAttr = (): AuthoredAttributeFormValues => mapped(rdnTarget('2.5.4.3'));

        test('a mapped String attribute with name and label is valid', () => {
            expect(validateAuthoredAttribute(mappedAttr())).toEqual({});
        });

        test('name and label are required', () => {
            expect(validateAuthoredAttribute({ ...mappedAttr(), name: '  ' }).name).toBeTruthy();
            expect(validateAuthoredAttribute({ ...mappedAttr(), label: '' }).label).toBeTruthy();
        });

        // The attribute list shows Object.values(errors)[0] as the row's marker, so identity errors must
        // keep coming first however the rule checks are split up internally.
        test('reports the missing name before the missing mapping', () => {
            const errors = validateAuthoredAttribute({ ...baseAttr(), name: '', label: '' });
            expect(Object.keys(errors)).toEqual(['name', 'label', 'mappingTargets']);
        });

        test('a mapping target is required, on the unpicked row or on the mapping when there is no row', () => {
            expect(validateAuthoredAttribute(baseAttr()).mappingTargets?.[0].fieldType).toContain('mapping target is required');
            expect(validateAuthoredAttribute({ ...baseAttr(), mappingTargets: [] }).mapping).toContain('mapping target is required');
        });

        test('RDN requires a code', () => {
            expect(validateAuthoredAttribute(mapped(rdnTarget(''))).mappingTargets?.[0].rdnCode).toBeTruthy();
            expect(validateAuthoredAttribute(mappedAttr()).mappingTargets).toBeUndefined();
        });

        test('SAN requires a generalNameType, and OTHER_NAME requires oid + encoding', () => {
            expect(validateAuthoredAttribute(mapped({ fieldType: FieldType.San })).mappingTargets?.[0].generalNameType).toBeTruthy();
            expect(validateAuthoredAttribute(mapped(sanTarget(GeneralNameType.Dns)))).toEqual({});

            const otherName = sanTarget(GeneralNameType.OtherName, { otherNameOid: '1.2.3' });
            expect(validateAuthoredAttribute(mapped(otherName)).mappingTargets?.[0].otherNameEncoding).toBeTruthy();
            expect(validateAuthoredAttribute(mapped({ ...otherName, otherNameEncoding: ExtensionValueEncoding.Utf8String }))).toEqual({});
            expect(
                validateAuthoredAttribute(mapped({ ...otherName, otherNameOid: '', otherNameEncoding: ExtensionValueEncoding.Utf8String }))
                    .mappingTargets?.[0].otherNameOid,
            ).toBeTruthy();
        });

        test('EXTENSION requires an OID', () => {
            expect(validateAuthoredAttribute(mapped({ fieldType: FieldType.Extension })).mappingTargets?.[0].extensionOid).toBeTruthy();
            expect(validateAuthoredAttribute(mapped(extensionTarget('2.5.29.32')))).toEqual({});
        });

        test('EXTENSION rejects OIDs with a structured mapping target, steering to the typed target', () => {
            expect(validateAuthoredAttribute(mapped(extensionTarget('2.5.29.15'))).mappingTargets?.[0].extensionOid).toContain('Key Usage');
            expect(validateAuthoredAttribute(mapped(extensionTarget('2.5.29.37'))).mappingTargets?.[0].extensionOid).toContain(
                'Extended Key Usage',
            );
        });

        test('a mapped attribute is restricted to String or Text', () => {
            expect(isContentTypeAllowedForMapping(AttributeContentType.String)).toBe(true);
            expect(isContentTypeAllowedForMapping(AttributeContentType.Text)).toBe(true);
            expect(isContentTypeAllowedForMapping(AttributeContentType.Integer)).toBe(false);

            expect(validateAuthoredAttribute({ ...mappedAttr(), contentType: AttributeContentType.Text }).contentType).toBeUndefined();
            expect(validateAuthoredAttribute({ ...mappedAttr(), contentType: AttributeContentType.Integer }).contentType).toBeTruthy();
        });

        test('the content-type restriction only applies to mapped attributes', () => {
            const errors = validateAuthoredAttribute({ ...baseAttr(), contentType: AttributeContentType.Integer });
            expect(errors.contentType).toBeUndefined();
            expect(errors.mappingTargets?.[0].fieldType).toBeTruthy();
        });

        test('Read Only requires a non-blank default value', () => {
            expect(validateAuthoredAttribute({ ...mappedAttr(), readOnly: true }).readOnly).toBeTruthy();
            expect(validateAuthoredAttribute({ ...mappedAttr(), readOnly: true, defaultValue: '   ' }).readOnly).toBeTruthy();
            expect(validateAuthoredAttribute({ ...mappedAttr(), readOnly: true, defaultValue: 'acme.example.com' })).toEqual({});
        });

        test('Read Only cannot be combined with a list', () => {
            expect(validateAuthoredAttribute({ ...mappedAttr(), readOnly: true, defaultValue: 'x', list: true }).readOnly).toBeTruthy();
            // A static list is a list even when the toggle itself is off.
            expect(
                validateAuthoredAttribute({
                    ...mappedAttr(),
                    readOnly: true,
                    defaultValue: 'x',
                    valueSourceType: ValueSourceType.StaticList,
                    staticValues: ['prod'],
                }).readOnly,
            ).toBeTruthy();
        });

        test('Multi select requires a list', () => {
            expect(validateAuthoredAttribute({ ...mappedAttr(), multiSelect: true }).multiSelect).toBeTruthy();
            expect(validateAuthoredAttribute({ ...mappedAttr(), multiSelect: true, list: true })).toEqual({});
        });

        test('a default value must conform to the declared content type', () => {
            const unmappedInteger = { ...baseAttr(), contentType: AttributeContentType.Integer };
            expect(validateAuthoredAttribute({ ...unmappedInteger, defaultValue: '12' }).defaultValue).toBeUndefined();
            expect(validateAuthoredAttribute({ ...unmappedInteger, defaultValue: 'twelve' }).defaultValue).toBeTruthy();
        });

        test('STATIC_LIST requires at least one non-blank, unique, well-typed value', () => {
            const staticList = (staticValues: (string | number | boolean)[]) => ({
                ...mappedAttr(),
                valueSourceType: ValueSourceType.StaticList,
                staticValues,
            });
            expect(validateAuthoredAttribute(staticList([])).staticValues).toBeTruthy();
            expect(validateAuthoredAttribute(staticList(['  '])).staticValues).toBeTruthy();
            expect(validateAuthoredAttribute(staticList(['prod', 'prod'])).staticValues).toBeTruthy();
            expect(validateAuthoredAttribute(staticList(['prod', 'staging']))).toEqual({});
            expect(
                validateAuthoredAttribute({
                    ...baseAttr(),
                    contentType: AttributeContentType.Integer,
                    valueSourceType: ValueSourceType.StaticList,
                    staticValues: ['1', 'two'],
                }).staticValues,
            ).toBeTruthy();
        });
    });

    describe('read only needs a default value', () => {
        test('required + read only with no default value is invalid', () => {
            const attr = freeInput({ required: true, readOnly: true, defaultValue: undefined });
            expect(isReadOnlyDefaultValid(attr)).toBe(false);
            expect(validateAuthoredAttribute(attr).readOnly).toBeTruthy();
        });

        test('required + read only with a blank default value is invalid', () => {
            expect(isReadOnlyDefaultValid(freeInput({ required: true, readOnly: true, defaultValue: '   ' }))).toBe(false);
        });

        test('required + read only with a default value is valid', () => {
            const attr = freeInput({ required: true, readOnly: true, defaultValue: 'srv.example.com' });
            expect(isReadOnlyDefaultValid(attr)).toBe(true);
            expect(validateAuthoredAttribute(attr).readOnly).toBeUndefined();
        });

        test('a falsy but present default value counts as a default', () => {
            expect(
                isReadOnlyDefaultValid(
                    freeInput({ contentType: AttributeContentType.Boolean, required: true, readOnly: true, defaultValue: false }),
                ),
            ).toBe(true);
            expect(
                isReadOnlyDefaultValid(
                    freeInput({ contentType: AttributeContentType.Integer, required: true, readOnly: true, defaultValue: 0 }),
                ),
            ).toBe(true);
        });

        // The backend rejects a read-only attribute with no content regardless of `required`
        // (AttributeEngine.validateReadOnlyAttributeProperties), so the rule cannot be narrowed to
        // required attributes without letting a guaranteed server-side failure through.
        test('read only without required still needs a default value', () => {
            const attr = freeInput({ required: false, readOnly: true, defaultValue: undefined });
            expect(isReadOnlyDefaultValid(attr)).toBe(false);
            expect(validateAuthoredAttribute(attr).readOnly).toBeTruthy();
        });

        test('read only without required is valid once a default value is set', () => {
            expect(isReadOnlyDefaultValid(freeInput({ required: false, readOnly: true, defaultValue: 'prod' }))).toBe(true);
        });

        test('required without read only needs no default value', () => {
            expect(isReadOnlyDefaultValid(freeInput({ required: true, readOnly: false, defaultValue: undefined }))).toBe(true);
        });

        test('a static list source is not subject to the default-value rule', () => {
            expect(
                isReadOnlyDefaultValid({
                    ...baseAttr(),
                    valueSourceType: ValueSourceType.StaticList,
                    required: true,
                    readOnly: true,
                    staticValues: ['prod'],
                }),
            ).toBe(true);
        });

        test('a connector callback source is not subject to the default-value rule', () => {
            expect(
                isReadOnlyDefaultValid({
                    ...baseAttr(),
                    valueSourceType: ValueSourceType.ConnectorCallback,
                    required: true,
                    readOnly: true,
                    defaultValue: undefined,
                }),
            ).toBe(true);
        });
    });

    describe('withBooleanReadOnlyDefault', () => {
        test('seeds false for a read-only Boolean with no default, so the switch matches what is stored', () => {
            const attr = freeInput({ contentType: AttributeContentType.Boolean, readOnly: true, defaultValue: undefined });
            expect(withBooleanReadOnlyDefault(attr).defaultValue).toBe(false);
            expect(isReadOnlyDefaultValid(withBooleanReadOnlyDefault(attr))).toBe(true);
        });

        test('leaves an explicit true default alone', () => {
            const attr = freeInput({ contentType: AttributeContentType.Boolean, readOnly: true, defaultValue: true });
            expect(withBooleanReadOnlyDefault(attr).defaultValue).toBe(true);
        });

        test('does not seed a Boolean that is not read only — unset stays unset', () => {
            const attr = freeInput({ contentType: AttributeContentType.Boolean, readOnly: false, defaultValue: undefined });
            expect(withBooleanReadOnlyDefault(attr)).toBe(attr);
        });

        test('does not seed a non-Boolean content type', () => {
            const attr = freeInput({ contentType: AttributeContentType.String, readOnly: true, defaultValue: undefined });
            expect(withBooleanReadOnlyDefault(attr)).toBe(attr);
        });

        test('does not seed when the value comes from a static list', () => {
            const attr: AuthoredAttributeFormValues = {
                ...baseAttr(),
                contentType: AttributeContentType.Boolean,
                valueSourceType: ValueSourceType.StaticList,
                readOnly: true,
                defaultValue: undefined,
            };
            expect(withBooleanReadOnlyDefault(attr)).toBe(attr);
        });
    });

    describe('value source bindings', () => {
        test('valid when a uuid is present', () => {
            expect(isValueSourceBindingValid({ ...emptyValueSourceBinding(), attributeUuid: 'x' })).toBe(true);
        });

        test('valid when only a name is present', () => {
            expect(isValueSourceBindingValid({ ...emptyValueSourceBinding(), attributeName: 'datacenter' })).toBe(true);
        });

        test('invalid when neither uuid nor name is present (whitespace only)', () => {
            expect(isValueSourceBindingValid({ ...emptyValueSourceBinding(), attributeUuid: '  ', attributeName: '' })).toBe(false);
        });

        test('build prefers uuid as primary key and trims', () => {
            const form: ValueSourceBindingFormValues = {
                attributeUuid: ' uuid-1 ',
                attributeName: ' datacenter ',
                valueSourceType: ValueSourceType.StaticList,
            };
            const dto = buildValueSourceBindingDto(form);
            expect(dto.attributeUuid).toBe('uuid-1');
            expect(dto.attributeName).toBe('datacenter');
            expect(dto.valueSourceType).toBe(ValueSourceType.StaticList);
        });

        test('build omits empty name so only the uuid identifies the target', () => {
            const dto = buildValueSourceBindingDto({ attributeUuid: 'uuid-1', attributeName: '', valueSourceType: ValueSourceType.None });
            expect(dto.attributeUuid).toBe('uuid-1');
            expect(dto.attributeName).toBeUndefined();
        });
    });

    describe('buildRaProfileRequestAttributesUpdateDto', () => {
        test('defaults merge mode to STATIC_ONLY and drops invalid bindings', () => {
            const form = {
                ...emptyAuthoringForm(),
                attributes: [baseAttr()],
                valueSourceBindings: [
                    { ...emptyValueSourceBinding(), attributeUuid: 'good' },
                    { ...emptyValueSourceBinding() }, // invalid: no uuid/name
                ],
            };
            const dto = buildRaProfileRequestAttributesUpdateDto(form);
            expect(dto.mergeMode).toBe(AttributeSetMergeMode.StaticOnly);
            expect(dto.requestAttributes).toHaveLength(1);
            expect(dto.valueSourceBindings).toHaveLength(1);
            expect(dto.valueSourceBindings?.[0].attributeUuid).toBe('good');
        });

        test('honours a chosen merge mode', () => {
            const dto = buildRaProfileRequestAttributesUpdateDto({ ...emptyAuthoringForm(), mergeMode: AttributeSetMergeMode.Merge });
            expect(dto.mergeMode).toBe(AttributeSetMergeMode.Merge);
        });

        test('round-trips externalCsrValidationStrict (Core writes it unconditionally)', () => {
            // Preserved unchanged so saving the set does not reset the strictness toggle's value.
            expect(
                buildRaProfileRequestAttributesUpdateDto({ ...emptyAuthoringForm(), externalCsrValidationStrict: true })
                    .externalCsrValidationStrict,
            ).toBe(true);
            expect(
                buildRaProfileRequestAttributesUpdateDto({ ...emptyAuthoringForm(), externalCsrValidationStrict: false })
                    .externalCsrValidationStrict,
            ).toBe(false);
            expect(
                parseRaProfileRequestAttributesDto({ mergeMode: AttributeSetMergeMode.Merge, externalCsrValidationStrict: true })
                    .externalCsrValidationStrict,
            ).toBe(true);
        });

        test('round-trips value-source params on a binding', () => {
            const form = {
                ...emptyAuthoringForm(),
                valueSourceBindings: [{ ...emptyValueSourceBinding(), attributeUuid: 'x', params: [{ attributeName: 'dep' }] }],
            };
            const dto = buildRaProfileRequestAttributesUpdateDto(form);
            expect(dto.valueSourceBindings?.[0].params).toEqual([{ attributeName: 'dep' }]);
            const back = parseRaProfileRequestAttributesDto({
                mergeMode: AttributeSetMergeMode.Merge,
                valueSourceBindings: dto.valueSourceBindings,
            });
            expect(back.valueSourceBindings[0].params).toEqual([{ attributeName: 'dep' }]);
        });

        test('round-trips value-source params on an attribute', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                valueSourceType: ValueSourceType.StaticList,
                valueSourceParams: [{ attributeName: 'dep' }],
            });
            expect(dto.valueSource?.params).toEqual([{ attributeName: 'dep' }]);
            expect(parseAuthoredAttributeDto(dto as BaseAttributeDto).valueSourceParams).toEqual([{ attributeName: 'dep' }]);
        });
    });

    describe('parseRaProfileRequestAttributesDto', () => {
        test('returns STATIC_ONLY defaults for undefined input', () => {
            const form = parseRaProfileRequestAttributesDto(undefined);
            expect(form.mergeMode).toBe(AttributeSetMergeMode.StaticOnly);
            expect(form.attributes).toEqual([]);
            expect(form.valueSourceBindings).toEqual([]);
        });

        test('maps mergeMode, attributes and bindings', () => {
            const dto: RaProfileCertificateRequestAttributesDto = {
                mergeMode: AttributeSetMergeMode.ConnectorOnly,
                requestAttributes: [buildAuthoredAttributeDto(baseAttr()) as BaseAttributeDto],
                valueSourceBindings: [{ attributeName: 'datacenter', valueSourceType: ValueSourceType.StaticList }],
            };
            const form = parseRaProfileRequestAttributesDto(dto);
            expect(form.mergeMode).toBe(AttributeSetMergeMode.ConnectorOnly);
            expect(form.attributes).toHaveLength(1);
            expect(form.attributes[0].name).toBe('serverFqdn');
            expect(form.valueSourceBindings[0].attributeName).toBe('datacenter');
        });
    });

    describe('platform default set', () => {
        test('build wraps attributes without merge mode or bindings', () => {
            const dto = buildPlatformDefaultUpdateDto([baseAttr()]);
            expect(dto.requestAttributes).toHaveLength(1);
            expect('mergeMode' in dto).toBe(false);
            expect('valueSourceBindings' in dto).toBe(false);
        });

        test('parse handles undefined and populated settings', () => {
            expect(parsePlatformDefaultDto(undefined)).toEqual([]);
            const parsed = parsePlatformDefaultDto({ requestAttributes: [buildAuthoredAttributeDto(baseAttr()) as BaseAttributeDto] });
            expect(parsed).toHaveLength(1);
            expect(parsed[0].name).toBe('serverFqdn');
        });
    });

    describe('free-input default value <-> content round-trip', () => {
        it('serialises a free-input default value into a single content entry', () => {
            const dto = buildAuthoredAttributeDto({
                ...emptyAuthoredAttribute(),
                name: 'env',
                label: 'Environment',
                contentType: AttributeContentType.String,
                valueSourceType: ValueSourceType.None,
                defaultValue: 'prod',
            });
            expect(dto.content).toEqual([{ data: 'prod', contentType: AttributeContentType.String }]);
        });

        it('omits content when the free-input default value is blank', () => {
            const dto = buildAuthoredAttributeDto({
                ...emptyAuthoredAttribute(),
                name: 'env',
                label: 'Environment',
                valueSourceType: ValueSourceType.None,
                defaultValue: '   ',
            });
            expect(dto.content).toBeUndefined();
        });

        it('parses a free-input content entry back into defaultValue', () => {
            const form = parseAuthoredAttributeDto({
                uuid: 'u1',
                name: 'env',
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                properties: { label: 'Environment' },
                content: [{ data: 'prod' }],
            } as any);
            expect(form.valueSourceType).toBe(ValueSourceType.None);
            expect(form.defaultValue).toBe('prod');
        });

        it('does not leak a free-input default into staticValues', () => {
            const form = parseAuthoredAttributeDto({
                uuid: 'u1',
                name: 'env',
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                properties: { label: 'Environment' },
                content: [{ data: 'prod' }],
            } as any);
            expect(form.defaultValue).toBe('prod');
            expect(form.staticValues).toEqual([]);
        });
    });

    describe('hasAuthoredRequestAttributes', () => {
        test('empty form → false', () => {
            expect(hasAuthoredRequestAttributes(emptyAuthoringForm())).toBe(false);
        });
        test('empty form with externalCsrValidationStrict → still false', () => {
            expect(hasAuthoredRequestAttributes({ ...emptyAuthoringForm(), externalCsrValidationStrict: true })).toBe(false);
        });
        test('has an authored attribute → true', () => {
            expect(hasAuthoredRequestAttributes({ ...emptyAuthoringForm(), attributes: [emptyAuthoredAttribute()] })).toBe(true);
        });
        test('has a value-source binding → true', () => {
            expect(hasAuthoredRequestAttributes({ ...emptyAuthoringForm(), valueSourceBindings: [emptyValueSourceBinding()] })).toBe(true);
        });
        test('non-default merge mode → true', () => {
            const other = Object.values(AttributeSetMergeMode).find((m) => m !== DEFAULT_MERGE_MODE)!;
            expect(hasAuthoredRequestAttributes({ ...emptyAuthoringForm(), mergeMode: other })).toBe(true);
        });
    });
});

describe('buildPlatformDefaultUpdateDto strict flag', () => {
    it('includes externalCsrValidationStrict in the update DTO', () => {
        const dto = buildPlatformDefaultUpdateDto([], true);
        expect(dto.externalCsrValidationStrict).toBe(true);
    });

    it('carries false through so toggling strictness off persists', () => {
        const dto = buildPlatformDefaultUpdateDto([], false);
        expect(dto.externalCsrValidationStrict).toBe(false);
    });
});

describe('regular-expression constraint', () => {
    const stringAttr = (over: Partial<AuthoredAttributeFormValues> = {}): AuthoredAttributeFormValues => ({
        ...mapped(rdnTarget('2.5.4.3')),
        ...over,
    });

    test('is offered for String only', () => {
        expect(isRegexConstraintSupportedForContentType(AttributeContentType.String)).toBe(true);
        expect(isRegexConstraintSupportedForContentType(AttributeContentType.Text)).toBe(false);
        expect(isRegexConstraintSupportedForContentType(AttributeContentType.Integer)).toBe(false);
    });

    test('getRegexPatternError reports only patterns the engine rejects', () => {
        expect(getRegexPatternError(String.raw`^CC-\d{6}$`)).toBeUndefined();
        expect(getRegexPatternError('^CC-[0-9$')).toBeTruthy();
    });

    test('a pattern is emitted as a regExp constraint with its wording', () => {
        const dto = buildAuthoredAttributeDto(
            stringAttr({
                regexPattern: String.raw`^CC-\d{6}$`,
                regexErrorMessage: 'Cost center must be CC- followed by 6 digits',
                regexDescription: 'Cost center code',
            }),
        );
        expect(dto.constraints).toEqual([
            {
                type: AttributeConstraintType.RegExp,
                data: String.raw`^CC-\d{6}$`,
                description: 'Cost center code',
                errorMessage: 'Cost center must be CC- followed by 6 digits',
            },
        ]);
    });

    test('a blank pattern leaves the attribute without constraints', () => {
        expect(buildAuthoredAttributeDto(stringAttr({ regexPattern: '   ' })).constraints).toBeUndefined();
        expect(buildAuthoredAttributeDto(stringAttr()).constraints).toBeUndefined();
    });

    test('a pattern left over from String is not emitted for another content type', () => {
        const dto = buildAuthoredAttributeDto(stringAttr({ contentType: AttributeContentType.Text, regexPattern: String.raw`^CC-\d{6}$` }));
        expect(dto.constraints).toBeUndefined();
    });

    test('round-trips through the DTO', () => {
        const authored = stringAttr({ regexPattern: '^A+$', regexErrorMessage: 'Only A', regexDescription: 'Letters' });
        const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(authored) as never);
        expect(parsed.regexPattern).toBe('^A+$');
        expect(parsed.regexErrorMessage).toBe('Only A');
        expect(parsed.regexDescription).toBe('Letters');
    });

    test('constraint kinds this editor cannot author survive a round-trip', () => {
        const range = { type: AttributeConstraintType.Range, data: { from: 1, to: 9 } } as never;
        const parsed = parseAuthoredAttributeDto({
            ...(buildAuthoredAttributeDto(stringAttr({ regexPattern: '^A+$' })) as never),
            constraints: [{ type: AttributeConstraintType.RegExp, data: '^A+$' }, range],
        } as never);
        expect(parsed.otherConstraints).toEqual([range]);
        expect(buildAuthoredAttributeDto(parsed).constraints).toEqual([
            { type: AttributeConstraintType.RegExp, data: '^A+$', description: undefined, errorMessage: undefined },
            range,
        ]);
    });

    test('an uncompilable pattern is rejected, a valid one is not', () => {
        expect(validateAuthoredAttribute(stringAttr({ regexPattern: '^CC-[0-9$' })).regexPattern).toBeTruthy();
        expect(validateAuthoredAttribute(stringAttr({ regexPattern: String.raw`^CC-\d{6}$` }))).toEqual({});
    });

    test('an uncompilable pattern on a content type that cannot carry one is not an error', () => {
        expect(
            validateAuthoredAttribute(stringAttr({ contentType: AttributeContentType.Text, regexPattern: '^CC-[0-9$' })).regexPattern,
        ).toBeUndefined();
    });
});

describe('structured mapping targets (Key Usage / Extended Key Usage)', () => {
    const structuredAttr = (fieldType: FieldType, over: Partial<AuthoredAttributeFormValues> = {}): AuthoredAttributeFormValues => ({
        ...mapped({ fieldType }),
        list: true,
        multiSelect: true,
        staticValues: fieldType === FieldType.KeyUsage ? ['digitalSignature', 'cRLSign'] : ['1.3.6.1.5.5.7.3.1'],
        ...over,
    });

    test('isStructuredMappingTarget covers exactly the two set-valued targets', () => {
        expect(isStructuredMappingTarget(FieldType.KeyUsage)).toBe(true);
        expect(isStructuredMappingTarget(FieldType.ExtendedKeyUsage)).toBe(true);
        expect(isStructuredMappingTarget(FieldType.Rdn)).toBe(false);
        expect(isStructuredMappingTarget(FieldType.San)).toBe(false);
        expect(isStructuredMappingTarget(FieldType.Extension)).toBe(false);
        expect(isStructuredMappingTarget(undefined)).toBe(false);
    });

    test('builds a bare mapped field carrying no properties of its own', () => {
        for (const fieldType of [FieldType.KeyUsage, FieldType.ExtendedKeyUsage]) {
            const dto = buildAuthoredAttributeDto(structuredAttr(fieldType));
            expect(mappingOf(dto)).toEqual({ objectType: ObjectType.X509Certificate, fields: [{ fieldType }] });
        }
    });

    test('the permitted set lands in content and the DTO is forced to a list', () => {
        const dto = buildAuthoredAttributeDto(structuredAttr(FieldType.KeyUsage, { list: false, valueSourceType: ValueSourceType.None }));
        expect(dto.properties.list).toBe(true);
        expect(dto.content).toEqual([
            { data: 'digitalSignature', contentType: AttributeContentType.String },
            { data: 'cRLSign', contentType: AttributeContentType.String },
        ]);
    });

    test('extensibleList round-trips through properties', () => {
        const dto = buildAuthoredAttributeDto(structuredAttr(FieldType.ExtendedKeyUsage, { extensibleList: true }));
        expect(dto.properties.extensibleList).toBe(true);
        const parsed = parseAuthoredAttributeDto(dto as BaseAttributeDto);
        expect(parsed.extensibleList).toBe(true);
        expect(structuredMappingTarget(parsed)).toBe(FieldType.ExtendedKeyUsage);
        expect(parsed.staticValues).toEqual(['1.3.6.1.5.5.7.3.1']);
    });

    test('a stored permitted set parses into the set editor even without a value source', () => {
        const dto = buildAuthoredAttributeDto(structuredAttr(FieldType.KeyUsage, { valueSourceType: ValueSourceType.None }));
        expect(dto.valueSource).toBeUndefined();
        const parsed = parseAuthoredAttributeDto(dto as BaseAttributeDto);
        expect(parsed.staticValues).toEqual(['digitalSignature', 'cRLSign']);
        expect(parsed.defaultValue).toBeUndefined();
    });

    test('an empty permitted set without extensibleList cannot be saved', () => {
        const errors = validateAuthoredAttribute(structuredAttr(FieldType.KeyUsage, { staticValues: [] }));
        expect(errors.staticValues).toContain('permitted value');
    });

    test('an empty permitted set with extensibleList is valid — the restriction is lifted', () => {
        expect(validateAuthoredAttribute(structuredAttr(FieldType.KeyUsage, { staticValues: [], extensibleList: true }))).toEqual({});
    });

    test('blank and duplicate permitted values are rejected', () => {
        expect(
            validateAuthoredAttribute(structuredAttr(FieldType.ExtendedKeyUsage, { staticValues: ['1.3.6.1.5.5.7.3.1', ' '] }))
                .staticValues,
        ).toContain('blank');
        expect(
            validateAuthoredAttribute(
                structuredAttr(FieldType.ExtendedKeyUsage, { staticValues: ['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.1'] }),
            ).staticValues,
        ).toContain('unique');
    });

    test('read only cannot combine with a structured target (a set-valued target is a list)', () => {
        const errors = validateAuthoredAttribute(
            structuredAttr(FieldType.KeyUsage, { readOnly: true, valueSourceType: ValueSourceType.None }),
        );
        expect(errors.readOnly).toContain('list');
    });

    test('a structured target keeps the String/Text mapped content-type rule', () => {
        const errors = validateAuthoredAttribute(structuredAttr(FieldType.KeyUsage, { contentType: AttributeContentType.Integer }));
        expect(errors.contentType).toBeTruthy();
    });
});

describe('JSON-schema constraint', () => {
    const stringAttr = (over: Partial<AuthoredAttributeFormValues> = {}): AuthoredAttributeFormValues => ({
        ...mapped(rdnTarget('2.5.4.3')),
        ...over,
    });

    test('is offered for String and Text only', () => {
        expect(isJsonSchemaConstraintSupportedForContentType(AttributeContentType.String)).toBe(true);
        expect(isJsonSchemaConstraintSupportedForContentType(AttributeContentType.Text)).toBe(true);
        expect(isJsonSchemaConstraintSupportedForContentType(AttributeContentType.Integer)).toBe(false);
        expect(isJsonSchemaConstraintSupportedForContentType(AttributeContentType.Boolean)).toBe(false);
    });

    test('emits a jsonSchema constraint alongside a regex one', () => {
        const dto = buildAuthoredAttributeDto(
            stringAttr({
                regexPattern: '^A+$',
                jsonSchemaData: ' {"type":"object"} ',
                jsonSchemaErrorMessage: 'Bad shape',
                jsonSchemaDescription: 'An object',
            }),
        );
        expect(dto.constraints).toEqual([
            { type: AttributeConstraintType.RegExp, data: '^A+$', description: undefined, errorMessage: undefined },
            { type: AttributeConstraintType.JsonSchema, data: '{"type":"object"}', description: 'An object', errorMessage: 'Bad shape' },
        ]);
    });

    test('is not emitted for a content type that cannot carry it', () => {
        const dto = buildAuthoredAttributeDto(
            stringAttr({ contentType: AttributeContentType.Text, regexPattern: '^A+$', jsonSchemaData: '{"type":"object"}' }),
        );
        // Text drops the regex (String-only) but keeps the schema constraint.
        expect(dto.constraints).toEqual([
            { type: AttributeConstraintType.JsonSchema, data: '{"type":"object"}', description: undefined, errorMessage: undefined },
        ]);
    });

    test('round-trips through the DTO and stays out of otherConstraints', () => {
        const authored = stringAttr({ jsonSchemaData: '{"type":"object"}', jsonSchemaErrorMessage: 'Bad shape' });
        const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(authored) as BaseAttributeDto);
        expect(parsed.jsonSchemaData).toBe('{"type":"object"}');
        expect(parsed.jsonSchemaErrorMessage).toBe('Bad shape');
        expect(parsed.otherConstraints).toEqual([]);
    });

    test('an invalid schema document is rejected at save with the reason', () => {
        expect(validateAuthoredAttribute(stringAttr({ jsonSchemaData: '{"type":' })).jsonSchemaData).toBeDefined();
        expect(validateAuthoredAttribute(stringAttr({ jsonSchemaData: '{"a":1,"a":2}' })).jsonSchemaData).toContain('Duplicate key');
        expect(
            validateAuthoredAttribute(stringAttr({ jsonSchemaData: '{"$schema":"http://json-schema.org/draft-07/schema#"}' }))
                .jsonSchemaData,
        ).toContain('draft 2020-12');
        expect(validateAuthoredAttribute(stringAttr({ jsonSchemaData: '{"type":"object"}' }))).toEqual({});
    });

    test('a schema left on a content type that cannot carry one is not an error', () => {
        expect(
            validateAuthoredAttribute(stringAttr({ contentType: AttributeContentType.Integer, jsonSchemaData: '{"broken' })).jsonSchemaData,
        ).toBeUndefined();
    });

    test('existing regex, range and dateTime constraints are unchanged by the new kind', () => {
        const range = { type: AttributeConstraintType.Range, data: { from: 1, to: 9 } } as never;
        const parsed = parseAuthoredAttributeDto({
            ...(buildAuthoredAttributeDto(stringAttr({ regexPattern: '^A+$' })) as never),
            constraints: [
                { type: AttributeConstraintType.RegExp, data: '^A+$' },
                { type: AttributeConstraintType.JsonSchema, data: '{"type":"object"}' },
                range,
            ],
        } as never);
        expect(parsed.otherConstraints).toEqual([range]);
        expect(buildAuthoredAttributeDto(parsed).constraints).toEqual([
            { type: AttributeConstraintType.RegExp, data: '^A+$', description: undefined, errorMessage: undefined },
            { type: AttributeConstraintType.JsonSchema, data: '{"type":"object"}', description: undefined, errorMessage: undefined },
            range,
        ]);
    });
});

describe('several mapping targets', () => {
    const multiTargetMapping = (): FieldMappingModel => ({
        objectType: ObjectType.X509Certificate,
        fields: [
            { fieldType: FieldType.Rdn, rdn: 'CN', order: 1, source: FieldSource.CsrThenPlatform },
            { fieldType: FieldType.San, generalNameType: GeneralNameType.Dns, order: 1 },
            { fieldType: FieldType.Rdn, rdn: 'OU', order: 2 },
        ],
    });

    const storedAttribute = (fieldMapping: FieldMappingModel = multiTargetMapping()) =>
        ({ ...buildAuthoredAttributeDto(baseAttr()), fieldMapping }) as BaseAttributeDto;

    test('parse lists every target with its source, in the order Core applies them', () => {
        const parsed = parseAuthoredAttributeDto(
            storedAttribute({
                objectType: ObjectType.X509Certificate,
                fields: [
                    { fieldType: FieldType.Rdn, rdn: 'OU', order: 2 },
                    { fieldType: FieldType.Rdn, rdn: 'CN', order: 1, source: FieldSource.Csr },
                ],
            }),
        );
        expect(parsed.mappingTargets.map((target) => [target.fieldType, target.rdnCode, target.source])).toEqual([
            [FieldType.Rdn, 'CN', FieldSource.Csr],
            [FieldType.Rdn, 'OU', undefined],
        ]);
    });

    test('reloading a saved mapping keeps rows of different types where the author put them', () => {
        const arranged = mapped(rdnTarget('CN'), rdnTarget('OU'), sanTarget(GeneralNameType.Dns));
        const reloaded = parseAuthoredAttributeDto(buildAuthoredAttributeDto(arranged) as BaseAttributeDto);
        expect(
            reloaded.mappingTargets.map((target) => (target.fieldType === FieldType.Rdn ? target.rdnCode : target.generalNameType)),
        ).toEqual(['CN', 'OU', GeneralNameType.Dns]);
    });

    test('open and save round-trips a multi-target mapping unchanged', () => {
        const rebuilt = buildAuthoredAttributeDto(parseAuthoredAttributeDto(storedAttribute()));
        expect(mappingOf(rebuilt)).toEqual(multiTargetMapping());
    });

    test('order is the position among targets of the same type, so reordering the rows reorders the fields', () => {
        const parsed = parseAuthoredAttributeDto(storedAttribute());
        const [cn, dns, ou] = parsed.mappingTargets;
        const rebuilt = buildAuthoredAttributeDto({ ...parsed, mappingTargets: [ou, dns, cn] });
        expect(mappingOf(rebuilt)?.fields).toEqual([
            { fieldType: FieldType.Rdn, rdn: 'OU', order: 1 },
            { fieldType: FieldType.San, generalNameType: GeneralNameType.Dns, order: 1 },
            { fieldType: FieldType.Rdn, rdn: 'CN', order: 2, source: FieldSource.CsrThenPlatform },
        ]);
    });

    test('an unpicked row is left out of the mapping', () => {
        const dto = buildAuthoredAttributeDto(mapped(rdnTarget('CN'), { fieldType: undefined }));
        expect(mappingOf(dto)?.fields).toEqual([{ fieldType: FieldType.Rdn, rdn: 'CN' }]);
    });

    test('loaded orders with gaps save unchanged', () => {
        const gaps = storedAttribute({
            objectType: ObjectType.X509Certificate,
            fields: [
                { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
                { fieldType: FieldType.Rdn, rdn: 'OU', order: 3 },
            ],
        });
        expect(mappingOf(buildAuthoredAttributeDto(parseAuthoredAttributeDto(gaps)))).toEqual(
            mappingOf(gaps as { fieldMapping?: unknown }),
        );
    });

    test('a new row numbers its type by position, and new rows of one type are numbered too', () => {
        const parsed = parseAuthoredAttributeDto(
            storedAttribute({
                objectType: ObjectType.X509Certificate,
                fields: [
                    { fieldType: FieldType.Rdn, rdn: 'CN', order: 1 },
                    { fieldType: FieldType.Rdn, rdn: 'OU', order: 3 },
                ],
            }),
        );
        const added = buildAuthoredAttributeDto({ ...parsed, mappingTargets: [...parsed.mappingTargets, rdnTarget('O')] });
        expect(mappingOf(added)?.fields.map((field) => field.order)).toEqual([1, 2, 3]);
        const fresh = buildAuthoredAttributeDto(mapped(rdnTarget('CN'), rdnTarget('OU')));
        expect(mappingOf(fresh)?.fields.map((field) => field.order)).toEqual([1, 2]);
    });

    test('saving the RA-profile set keeps every attribute mapping, including ones not edited', () => {
        const other = buildAuthoredAttributeDto({ ...mapped(rdnTarget('O')), name: 'other' });
        const form = parseRaProfileRequestAttributesDto({
            mergeMode: AttributeSetMergeMode.StaticOnly,
            requestAttributes: [storedAttribute(), other as BaseAttributeDto],
        });
        form.attributes[1] = { ...form.attributes[1], label: 'Renamed' };
        const dto = buildRaProfileRequestAttributesUpdateDto(form);
        expect(mappingOf(dto.requestAttributes?.[0] as { fieldMapping?: unknown })).toEqual(multiTargetMapping());
    });

    test('saving the platform default set keeps every attribute mapping', () => {
        const attributes = parsePlatformDefaultDto({ requestAttributes: [storedAttribute()] });
        const dto = buildPlatformDefaultUpdateDto(attributes);
        expect(mappingOf(dto.requestAttributes?.[0] as { fieldMapping?: unknown })).toEqual(multiTargetMapping());
    });

    test('the same certificate field cannot be targeted twice; a different one of the same type is fine', () => {
        const rows = validateMappingTargets(mapped(rdnTarget('CN'), sanTarget(GeneralNameType.Dns), rdnTarget('CN')));
        expect(rows[0]).toEqual({});
        expect(rows[1]).toEqual({});
        expect(rows[2].rdnCode).toContain('RDN CN above');
        expect(validateMappingTargets(mapped(sanTarget(GeneralNameType.Dns), sanTarget(GeneralNameType.Dns)))[1].generalNameType).toContain(
            'SAN dNSName above',
        );
        expect(
            validateAuthoredAttribute(mapped(extensionTarget('1.2.3.4'), extensionTarget(' 1.2.3.4 '))).mappingTargets?.[1].extensionOid,
        ).toContain('1.2.3.4');
        expect(validateAuthoredAttribute(mapped(sanTarget(GeneralNameType.Dns), sanTarget(GeneralNameType.Email)))).toEqual({});
        expect(validateAuthoredAttribute(mapped(rdnTarget('CN'), rdnTarget('OU')))).toEqual({});
    });

    test('an RDN stored as a code and one picked as its OID are the same field once a resolver is given', () => {
        const attr = mapped(rdnTarget('OU'), rdnTarget('2.5.4.11'));
        expect(validateAuthoredAttribute(attr)).toEqual({});
        const byCode = (value: string) => (value === '2.5.4.11' ? 'OU' : value);
        expect(validateAuthoredAttribute(attr, byCode).mappingTargets?.[1].rdnCode).toContain('RDN OU above');
        expect(validateAuthoredAttribute(mapped(rdnTarget('CN'), rdnTarget('2.5.4.11')), byCode)).toEqual({});
    });

    test('a structured target must be the only one, and it claims its extension OID', () => {
        const permitted = { list: true, staticValues: ['digitalSignature'] };
        const withKeyUsage = { ...mapped(rdnTarget('CN'), { fieldType: FieldType.KeyUsage }), ...permitted };
        expect(validateAuthoredAttribute(withKeyUsage).mappingTargets?.[1].fieldType).toContain('only mapping target');

        const withLegacyOid = { ...mapped({ fieldType: FieldType.KeyUsage }, extensionTarget('2.5.29.15')), ...permitted };
        const errors = validateAuthoredAttribute(withLegacyOid).mappingTargets;
        expect(errors?.[0].fieldType).toContain('only mapping target');
        expect(errors?.[1].extensionOid).toBeTruthy();
    });

    test('two otherName targets are not a repeat until their OIDs match', () => {
        const otherName = (otherNameOid: string) =>
            sanTarget(GeneralNameType.OtherName, { otherNameOid, otherNameEncoding: ExtensionValueEncoding.Utf8String });
        expect(validateMappingTargets(mapped(otherName(''), otherName('')))[1]).toEqual({ otherNameOid: 'An otherName OID is required.' });
        expect(validateMappingTargets(mapped(otherName('1.2.3'), otherName('1.2.3')))[1].generalNameType).toContain('above');
    });

    test('the subjectAltName OID is refused on the Extension target', () => {
        expect(validateAuthoredAttribute(mapped(extensionTarget('2.5.29.17'))).mappingTargets?.[0].extensionOid).toContain(
            'Subject Alternative Name',
        );
    });

    test('multi select cannot feed a certificate extension, which takes exactly one value', () => {
        const attr = {
            ...mapped(sanTarget(GeneralNameType.Dns), extensionTarget('1.2.3.4')),
            valueSourceType: ValueSourceType.StaticList,
            staticValues: ['a', 'b'],
            list: true,
            multiSelect: true,
        };
        expect(validateAuthoredAttribute(attr).multiSelect).toContain('extension');
        expect(validateAuthoredAttribute({ ...attr, multiSelect: false })).toEqual({});
        // Free input hides the checkbox, so the rule is not raised where it could not be fixed.
        expect(validateAuthoredAttribute({ ...attr, valueSourceType: ValueSourceType.None, staticValues: [] }).multiSelect).toBeUndefined();
    });

    describe('withMappingTargets', () => {
        const keyUsageAttr = (): AuthoredAttributeFormValues => ({
            ...mapped({ fieldType: FieldType.KeyUsage }, rdnTarget('CN')),
            list: true,
            multiSelect: true,
            extensibleList: true,
            staticValues: ['digitalSignature'],
        });

        test('entering a structured target forces the permitted-set shape', () => {
            const next = withMappingTargets({ ...mapped(rdnTarget('CN')), readOnly: true, defaultValue: 'x' }, [
                { fieldType: FieldType.KeyUsage },
            ]);
            expect(next).toMatchObject({ list: true, multiSelect: true, readOnly: false, extensibleList: false, staticValues: [] });
            expect(next.defaultValue).toBeUndefined();
        });

        test('changing another row keeps the permitted set', () => {
            const attr = keyUsageAttr();
            const next = withMappingTargets(attr, [attr.mappingTargets[0], sanTarget(GeneralNameType.Dns)]);
            expect(next).toMatchObject({ staticValues: ['digitalSignature'], extensibleList: true, list: true });
        });

        test('switching Key Usage to Extended Key Usage starts an empty set', () => {
            const next = withMappingTargets(keyUsageAttr(), [{ fieldType: FieldType.ExtendedKeyUsage }]);
            expect(next).toMatchObject({ staticValues: [], extensibleList: false });
        });

        test('removing the structured row drops the permitted set and the list shape', () => {
            const attr = keyUsageAttr();
            const next = withMappingTargets(attr, [attr.mappingTargets[1]]);
            expect(next).toMatchObject({ list: false, multiSelect: false, extensibleList: false, staticValues: [] });
        });

        test('a mapped attribute is narrowed to String', () => {
            const next = withMappingTargets({ ...baseAttr(), contentType: AttributeContentType.Integer, defaultValue: 3 }, [
                rdnTarget('CN'),
            ]);
            expect(next.contentType).toBe(AttributeContentType.String);
            expect(next.defaultValue).toBeUndefined();
        });
    });

    test('firstAuthoredAttributeError looks into the rows, in key order', () => {
        expect(firstAuthoredAttributeError({})).toBeUndefined();
        expect(firstAuthoredAttributeError({ mappingTargets: [{}, { rdnCode: 'row two' }], staticValues: 'later' })).toBe('row two');
        expect(firstAuthoredAttributeError({ label: 'first', mappingTargets: [{ fieldType: 'row' }] })).toBe('first');
    });
});
