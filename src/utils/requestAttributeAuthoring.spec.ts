import { describe, expect, it, test } from 'vitest';
import {
    AttributeContentType,
    AttributeSetMergeMode,
    AttributeType,
    AttributeVersion,
    ExtensionValueEncoding,
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
    gateMergeModeAndBindings,
    hasAuthoredRequestAttributes,
    isAuthoredAttributeMappingValid,
    isAuthoredAttributeValid,
    isStaticListSupportedForContentType,
    isValueSourceBindingValid,
    parseAuthoredAttributeDto,
    parsePlatformDefaultDto,
    parseRaProfileRequestAttributesDto,
    type AuthoredAttributeFormValues,
    type ValueSourceBindingFormValues,
} from './requestAttributeAuthoring';

const mappingOf = (dto: { fieldMapping?: unknown }) => dto.fieldMapping as unknown as FieldMappingModel | undefined;

const baseAttr = (): AuthoredAttributeFormValues => ({
    ...emptyAuthoredAttribute(),
    name: 'serverFqdn',
    label: 'Server FQDN',
    contentType: AttributeContentType.String,
    required: true,
});

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

        test('emptyAuthoredAttribute has no mapping and NONE value source', () => {
            const attr = emptyAuthoredAttribute();
            expect(attr.mappingFieldType).toBeUndefined();
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
            const dto = buildAuthoredAttributeDto({ ...baseAttr(), mappingFieldType: FieldType.Rdn, mappingRdnCode: 'CN' });
            const mapping = mappingOf(dto);
            expect(mapping?.objectType).toBe(ObjectType.X509Certificate);
            expect(mapping?.fields).toEqual([{ fieldType: FieldType.Rdn, rdn: 'CN' }]);
        });

        test('writes a SAN mapping with generalNameType and omits otherName fields for non-OTHER_NAME', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                mappingFieldType: FieldType.San,
                mappingGeneralNameType: GeneralNameType.Dns,
            });
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
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                mappingFieldType: FieldType.San,
                mappingGeneralNameType: GeneralNameType.OtherName,
                mappingOtherNameOid: '1.3.6.1.4.1.311.20.2.3',
                mappingOtherNameEncoding: ExtensionValueEncoding.Utf8String,
            });
            const field = mappingOf(dto)?.fields[0] as { otherNameOid?: string; otherNameValueEncoding?: string };
            expect(field.otherNameOid).toBe('1.3.6.1.4.1.311.20.2.3');
            expect(field.otherNameValueEncoding).toBe(ExtensionValueEncoding.Utf8String);
        });

        test('writes an extension mapping with OID and criticalOverridable', () => {
            const dto = buildAuthoredAttributeDto({
                ...baseAttr(),
                mappingFieldType: FieldType.Extension,
                mappingExtensionOid: '2.5.29.17',
                mappingCriticalOverridable: true,
            });
            expect(mappingOf(dto)?.fields).toEqual([
                { fieldType: FieldType.Extension, extensionOid: '2.5.29.17', criticalOverridable: true },
            ]);
        });

        test('SAN mapping without a generalNameType produces no fieldMapping', () => {
            expect(buildAuthoredAttributeDto({ ...baseAttr(), mappingFieldType: FieldType.San }).fieldMapping).toBeUndefined();
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
                mappingFieldType: FieldType.Rdn,
                mappingObjectType: ObjectType.X509Certificate,
                mappingRdnCode: 'CN',
                valueSourceType: ValueSourceType.StaticList,
            };
            const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(original) as BaseAttributeDto);
            expect(parsed.name).toBe('serverFqdn');
            expect(parsed.label).toBe('Server FQDN');
            expect(parsed.required).toBe(true);
            expect(parsed.list).toBe(true);
            expect(parsed.description).toBe('the fqdn');
            expect(parsed.mappingFieldType).toBe(FieldType.Rdn);
            expect(parsed.mappingRdnCode).toBe('CN');
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
                buildAuthoredAttributeDto({
                    ...baseAttr(),
                    mappingFieldType: FieldType.San,
                    mappingGeneralNameType: GeneralNameType.OtherName,
                    mappingOtherNameOid: '1.2.3',
                    mappingOtherNameEncoding: ExtensionValueEncoding.Utf8String,
                }) as BaseAttributeDto,
            );
            expect(parsed.mappingFieldType).toBe(FieldType.San);
            expect(parsed.mappingGeneralNameType).toBe(GeneralNameType.OtherName);
            expect(parsed.mappingOtherNameOid).toBe('1.2.3');
            expect(parsed.mappingOtherNameEncoding).toBe(ExtensionValueEncoding.Utf8String);
        });

        test('falls back to NONE value source and no mapping when absent', () => {
            const parsed = parseAuthoredAttributeDto(buildAuthoredAttributeDto(baseAttr()) as BaseAttributeDto);
            expect(parsed.valueSourceType).toBe(ValueSourceType.None);
            expect(parsed.mappingFieldType).toBeUndefined();
        });
    });

    describe('isAuthoredAttributeMappingValid / isAuthoredAttributeValid', () => {
        test('unmapped attribute is valid', () => {
            expect(isAuthoredAttributeMappingValid(baseAttr())).toBe(true);
        });

        test('RDN requires a code', () => {
            expect(isAuthoredAttributeMappingValid({ ...baseAttr(), mappingFieldType: FieldType.Rdn })).toBe(false);
            expect(isAuthoredAttributeMappingValid({ ...baseAttr(), mappingFieldType: FieldType.Rdn, mappingRdnCode: 'CN' })).toBe(true);
        });

        test('SAN requires a generalNameType, and OTHER_NAME requires oid + encoding', () => {
            expect(isAuthoredAttributeMappingValid({ ...baseAttr(), mappingFieldType: FieldType.San })).toBe(false);
            expect(
                isAuthoredAttributeMappingValid({
                    ...baseAttr(),
                    mappingFieldType: FieldType.San,
                    mappingGeneralNameType: GeneralNameType.Dns,
                }),
            ).toBe(true);
            expect(
                isAuthoredAttributeMappingValid({
                    ...baseAttr(),
                    mappingFieldType: FieldType.San,
                    mappingGeneralNameType: GeneralNameType.OtherName,
                    mappingOtherNameOid: '1.2.3',
                }),
            ).toBe(false);
            expect(
                isAuthoredAttributeMappingValid({
                    ...baseAttr(),
                    mappingFieldType: FieldType.San,
                    mappingGeneralNameType: GeneralNameType.OtherName,
                    mappingOtherNameOid: '1.2.3',
                    mappingOtherNameEncoding: ExtensionValueEncoding.Utf8String,
                }),
            ).toBe(true);
        });

        test('EXTENSION requires an OID', () => {
            expect(isAuthoredAttributeMappingValid({ ...baseAttr(), mappingFieldType: FieldType.Extension })).toBe(false);
            expect(
                isAuthoredAttributeMappingValid({ ...baseAttr(), mappingFieldType: FieldType.Extension, mappingExtensionOid: '2.5.29.17' }),
            ).toBe(true);
        });

        test('isAuthoredAttributeValid also requires name and label', () => {
            expect(isAuthoredAttributeValid({ ...baseAttr(), name: '', label: 'X' })).toBe(false);
            expect(isAuthoredAttributeValid({ ...baseAttr(), name: 'x', label: '' })).toBe(false);
            expect(isAuthoredAttributeValid(baseAttr())).toBe(true);
        });

        test('STATIC_LIST requires at least one value', () => {
            expect(isAuthoredAttributeValid({ ...baseAttr(), valueSourceType: ValueSourceType.StaticList, staticValues: [] })).toBe(false);
            expect(isAuthoredAttributeValid({ ...baseAttr(), valueSourceType: ValueSourceType.StaticList, staticValues: ['prod'] })).toBe(
                true,
            );
        });

        test('STATIC_LIST rejects blank string values', () => {
            expect(isAuthoredAttributeValid({ ...baseAttr(), valueSourceType: ValueSourceType.StaticList, staticValues: ['  '] })).toBe(
                false,
            );
        });

        test('STATIC_LIST rejects duplicate values', () => {
            expect(
                isAuthoredAttributeValid({
                    ...baseAttr(),
                    valueSourceType: ValueSourceType.StaticList,
                    staticValues: ['prod', 'prod'],
                }),
            ).toBe(false);
            expect(
                isAuthoredAttributeValid({
                    ...baseAttr(),
                    valueSourceType: ValueSourceType.StaticList,
                    staticValues: ['prod', 'staging'],
                }),
            ).toBe(true);
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

        test('build carries a trimmed collectionRef when provided', () => {
            const dto = buildValueSourceBindingDto({
                attributeUuid: 'uuid-1',
                valueSourceType: ValueSourceType.StaticList,
                collectionRef: ' datacenters ',
            });
            expect(dto.collectionRef).toBe('datacenters');
        });

        test('build omits collectionRef when blank', () => {
            const dto = buildValueSourceBindingDto({ attributeUuid: 'uuid-1', valueSourceType: ValueSourceType.None, collectionRef: '  ' });
            expect('collectionRef' in dto).toBe(false);
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

    describe('gateMergeModeAndBindings', () => {
        test('forces Static only and drops bindings while the feature is disabled', () => {
            const gated = gateMergeModeAndBindings({
                ...emptyAuthoringForm(),
                mergeMode: AttributeSetMergeMode.Merge,
                attributes: [baseAttr()],
                valueSourceBindings: [{ ...emptyValueSourceBinding(), attributeUuid: 'x' }],
            });
            expect(gated.mergeMode).toBe(AttributeSetMergeMode.StaticOnly);
            expect(gated.valueSourceBindings).toEqual([]);
            expect(gated.attributes).toHaveLength(1);
        });

        test('passes merge mode and bindings through unchanged once the feature is re-enabled', () => {
            const binding = { ...emptyValueSourceBinding(), attributeUuid: 'x' };
            const form = {
                ...emptyAuthoringForm(),
                mergeMode: AttributeSetMergeMode.Merge,
                attributes: [baseAttr()],
                valueSourceBindings: [binding],
            };
            const gated = gateMergeModeAndBindings(form, true);
            expect(gated).toBe(form);
            expect(gated.mergeMode).toBe(AttributeSetMergeMode.Merge);
            expect(gated.valueSourceBindings).toEqual([binding]);
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
