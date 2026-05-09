import { describe, expect, test } from 'vitest';
import {
    getAttributeCopyValue,
    getAttributeContent,
    getAttributeFormValue,
    attributeFieldNameTransform,
    transformAttributes,
    getCodeBlockLanguage,
    collectFormAttributes,
    mapAttributeContentToOptionValue,
    testAttributeSetFunction,
    mapProfileAttribute,
} from './attributes';
import { AttributeContentType, AttributeType, AttributeVersion, ProgrammingLanguageEnum } from 'types/openapi';

const base64Encode = (s: string) => btoa(unescape(encodeURIComponent(s)));

describe('attributes utils', () => {
    describe('attributeFieldNameTransform', () => {
        test('should have known field mappings', () => {
            expect(attributeFieldNameTransform.name).toBe('Name');
            expect(attributeFieldNameTransform.credentialProvider).toBe('Credential Provider');
        });
        test('should have authorityProvider and others', () => {
            expect(attributeFieldNameTransform.authorityProvider).toBe('Authority Provider');
            expect(attributeFieldNameTransform.complianceProvider).toBe('Compliance Provider');
        });
    });

    describe('getAttributeCopyValue', () => {
        test('should return undefined for empty content', () => {
            expect(getAttributeCopyValue(AttributeContentType.String, undefined)).toBeUndefined();
        });

        test('should format Boolean as string', () => {
            expect(getAttributeCopyValue(AttributeContentType.Boolean, [{ data: true } as any])).toBe('true');
            expect(getAttributeCopyValue(AttributeContentType.Boolean, [{ data: false } as any])).toBe('false');
        });

        test('should format Integer as string', () => {
            expect(getAttributeCopyValue(AttributeContentType.Integer, [{ data: 42 } as any])).toBe('42');
        });

        test('should format Float as string', () => {
            expect(getAttributeCopyValue(AttributeContentType.Float, [{ data: 3.14 } as any])).toBe('3.14');
        });

        test('should format String as string', () => {
            expect(getAttributeCopyValue(AttributeContentType.String, [{ data: 'hello' } as any])).toBe('hello');
        });

        test('should return empty string for Secret (mapping returns undefined)', () => {
            expect(getAttributeCopyValue(AttributeContentType.Secret, [{ data: 'secret' } as any])).toBe('');
        });

        test('should join multiple content with comma', () => {
            expect(getAttributeCopyValue(AttributeContentType.String, [{ data: 'a' } as any, { data: 'b' } as any])).toBe('a, b');
        });

        test('should decode Codeblock code from base64', () => {
            const content = [{ data: { code: base64Encode('print(1)'), language: ProgrammingLanguageEnum.Python } } as any];
            expect(getAttributeCopyValue(AttributeContentType.Codeblock, content)).toBe('print(1)');
        });

        test('should use credential name when data has name', () => {
            const content = [{ data: { name: 'MyCred' }, reference: 'ref' } as any];
            expect(getAttributeCopyValue(AttributeContentType.Credential, content)).toBe('MyCred');
        });

        test('should decode File content from base64', () => {
            const content = [{ data: { content: base64Encode('file bytes'), fileName: 'a.txt', mimeType: 'text/plain' } } as any];
            expect(getAttributeCopyValue(AttributeContentType.File, content)).toBe('file bytes');
        });

        test('should stringify Object as JSON', () => {
            const content = [{ data: { x: 1, y: 2 } } as any];
            expect(getAttributeCopyValue(AttributeContentType.Object, content)).toBe('{"x":1,"y":2}');
        });

        test('should format Time and Date as string', () => {
            expect(getAttributeCopyValue(AttributeContentType.Time, [{ data: '10:00' } as any])).toBe('10:00');
            expect(getAttributeCopyValue(AttributeContentType.Date, [{ data: '2024-01-01' } as any])).toBe('2024-01-01');
        });

        test('should format Datetime via getFormattedDateTime', () => {
            const content = [{ data: '2024-01-15T10:00:00' } as any];
            const result = getAttributeCopyValue(AttributeContentType.Datetime, content);
            expect(typeof result).toBe('string');
            expect(result!.length).toBeGreaterThan(0);
        });

        test('should fallback to toString when Codeblock data has no code', () => {
            const content = [{ data: 'raw-code' } as any];
            expect(getAttributeCopyValue(AttributeContentType.Codeblock, content)).toBe('raw-code');
        });

        test('should fallback to toString for Credential when name is missing', () => {
            const content = [{ data: 123 } as any];
            expect(getAttributeCopyValue(AttributeContentType.Credential, content)).toBe('123');
        });

        test('should fallback to toString for File when content is missing', () => {
            const content = [{ data: 10 } as any];
            expect(getAttributeCopyValue(AttributeContentType.File, content)).toBe('10');
        });
    });

    describe('getAttributeContent', () => {
        test('returns Not set when content is undefined', () => {
            expect(getAttributeContent(AttributeContentType.String, undefined)).toBe('Not set');
        });

        test('returns file name and mime type for File content', () => {
            const result = getAttributeContent(AttributeContentType.File, [{ data: { fileName: 'a.txt', mimeType: 'text/plain' } } as any]);
            expect(result).toBe('a.txt (text/plain)');
        });

        test('returns masked value for Secret content', () => {
            const result = getAttributeContent(AttributeContentType.Secret, [{ data: 'top-secret' } as any]);
            expect(result).toBe('*****');
        });

        test('returns string representation for Boolean content', () => {
            const resultTrue = getAttributeContent(AttributeContentType.Boolean, [{ data: true } as any]);
            const resultFalse = getAttributeContent(AttributeContentType.Boolean, [{ data: false } as any]);
            expect(resultTrue).toBe('true');
            expect(resultFalse).toBe('false');
        });

        test('returns reference for Credential, Object and File when reference is present', () => {
            const baseContent = { data: 'ignored', reference: 'Ref' } as any;
            expect(getAttributeContent(AttributeContentType.Credential, [baseContent])).toBe('Ref');
            expect(getAttributeContent(AttributeContentType.Object, [baseContent])).toBe('Ref');
            expect(getAttributeContent(AttributeContentType.File, [baseContent])).toBe('Ref');
        });

        test('returns primitive value for numeric and text content types', () => {
            expect(getAttributeContent(AttributeContentType.Float, [{ data: 1.23 } as any])).toBe('1.23');
            expect(getAttributeContent(AttributeContentType.Integer, [{ data: 42 } as any])).toBe('42');
            expect(getAttributeContent(AttributeContentType.String, [{ data: 'hello' } as any])).toBe('hello');
            expect(getAttributeContent(AttributeContentType.Text, [{ data: 'lorem' } as any])).toBe('lorem');
        });

        test('returns raw value for Time and Date', () => {
            expect(getAttributeContent(AttributeContentType.Time, [{ data: '10:00' } as any])).toBe('10:00');
            expect(getAttributeContent(AttributeContentType.Date, [{ data: '2024-01-01' } as any])).toBe('2024-01-01');
        });

        test('formats Datetime via getFormattedDateTime in getAttributeContent', () => {
            const result = getAttributeContent(AttributeContentType.Datetime, [{ data: '2024-01-15T10:00:00' } as any]);
            expect(typeof result).toBe('string');
            expect((result as string).length).toBeGreaterThan(0);
        });

        test('returns Unknown data type when File data is not FileAttributeContentData', () => {
            const result = getAttributeContent(AttributeContentType.File, [{ data: 'not-a-file-object' } as any]);
            expect(result).toBe('Unknown data type');
        });

        test('returns CodeBlock React element for Codeblock content type', () => {
            const result = getAttributeContent(AttributeContentType.Codeblock, [{ data: { code: base64Encode('print(1)') } } as any]);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('object');
        });

        test('falls back to Unknown data type for unsupported content type mapping', () => {
            const result = getAttributeContent('unsupported' as any, [{ data: 'x' } as any]);
            expect(result).toBe('Unknown data type');
        });
    });

    describe('getAttributeFormValue', () => {
        test('truncates Integer numeric values from object data', () => {
            const result = getAttributeFormValue(AttributeContentType.Integer, undefined, { data: '12.9' }) as any;
            expect(result).toEqual({ data: 12 });
        });

        test('keeps original value when Integer parsing fails', () => {
            const result = getAttributeFormValue(AttributeContentType.Integer, undefined, { value: 'NaN-value' }) as any;
            expect(result).toEqual({ data: 'NaN-value' });
        });

        test('omits empty reference while normalizing content item', () => {
            const result = getAttributeFormValue(AttributeContentType.String, undefined, { data: 'abc', reference: '' }) as any;
            expect(result).toEqual({ data: 'abc' });
        });

        test('normalizes nested value object containing data and reference', () => {
            const result = getAttributeFormValue(AttributeContentType.Float, undefined, {
                value: { data: '3.50', reference: 'Threshold' },
            }) as any;
            expect(result).toEqual({ data: 3.5, reference: 'Threshold' });
        });
    });

    describe('transformAttributes', () => {
        test('flattens form attributes without dot into single key', () => {
            const data = [{ formAttributeName: 'name', formAttributeValue: 'v1' }];
            expect(transformAttributes(data)).toEqual({ name: 'v1' });
        });
        test('nests by last dot: parent.child', () => {
            const data = [{ formAttributeName: 'a.b', formAttributeValue: 'v' }];
            expect(transformAttributes(data)).toEqual({ a: { b: 'v' } });
        });
        test('multiple keys under same parent', () => {
            const data = [
                { formAttributeName: 'obj.x', formAttributeValue: 1 },
                { formAttributeName: 'obj.y', formAttributeValue: 2 },
            ];
            expect(transformAttributes(data)).toEqual({ obj: { x: 1, y: 2 } });
        });
    });

    describe('getCodeBlockLanguage', () => {
        test('returns form input language when set', () => {
            expect(getCodeBlockLanguage(ProgrammingLanguageEnum.Python, undefined)).toBe(ProgrammingLanguageEnum.Python);
        });
        test('returns language from descriptor content when form input undefined', () => {
            const descriptorContent = [{ data: { language: ProgrammingLanguageEnum.Java } }] as any;
            expect(getCodeBlockLanguage(undefined, descriptorContent)).toBe(ProgrammingLanguageEnum.Java);
        });
        test('defaults to Javascript when no language anywhere', () => {
            expect(getCodeBlockLanguage(undefined, undefined)).toBe(ProgrammingLanguageEnum.Javascript);
        });

        test('defaults to Javascript when descriptor content data is empty', () => {
            const descriptorContent = [{ data: null }] as any;
            expect(getCodeBlockLanguage(undefined, descriptorContent)).toBe(ProgrammingLanguageEnum.Javascript);
        });
    });

    describe('collectFormAttributes', () => {
        test('returns empty array when no descriptors', () => {
            expect(collectFormAttributes('id1', undefined, {})).toEqual([]);
        });
        test('returns empty array when no __attributes__id in values', () => {
            expect(collectFormAttributes('id1', [], {})).toEqual([]);
        });
        test('returns attributes when descriptors and values match', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'attr1',
                    uuid: 'u1',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { attr1: 'value1' } };
            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('attr1');
            expect(result[0].content).toEqual([{ data: 'value1' }]);
            expect(result[0].version).toBe(AttributeVersion.V2);
        });
        test('uses V3 content shape with contentType when existing attribute has version V3', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'attr1',
                    uuid: 'u1',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { attr1: 'value1' } };
            const existingAttributes = [{ name: 'attr1', version: AttributeVersion.V3 }] as any[];
            const result = collectFormAttributes('id1', descriptors, values, existingAttributes);
            expect(result).toHaveLength(1);
            expect(result[0].version).toBe(AttributeVersion.V3);
            expect(result[0].content).toEqual([{ data: 'value1', contentType: AttributeContentType.String }]);
        });
        test('uses V3 when descriptor has version V3 and no existing attribute', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'attr1',
                    uuid: 'u1',
                    version: AttributeVersion.V3,
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { attr1: 'value1' } };
            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].version).toBe(AttributeVersion.V3);
            expect(result[0].content).toEqual([{ data: 'value1', contentType: AttributeContentType.String }]);
        });
        test('uses V3 when descriptor has schemaVersion V3 and no existing attribute', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'attr1',
                    uuid: 'u1',
                    schemaVersion: AttributeVersion.V3,
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { attr1: 'value1' } };
            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].version).toBe(AttributeVersion.V3);
            expect(result[0].content).toEqual([{ data: 'value1', contentType: AttributeContentType.String }]);
        });
        test('skips deleted attributes', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'attr1',
                    uuid: 'u1',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = {
                __attributes__id1__: { attr1: 'value1' },
                deletedAttributes_id1: ['attr1'],
            };
            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(0);
        });

        test('casts Integer attributes to number in payload', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'parallelExecutions',
                    uuid: 'u-integer',
                    contentType: AttributeContentType.Integer,
                    content: [],
                    properties: { required: false, label: 'Parallel executions', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { parallelExecutions: '50' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content).toEqual([{ data: 50 }]);
        });

        test('casts Float attributes to number in payload', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'threshold',
                    uuid: 'u-float',
                    contentType: AttributeContentType.Float,
                    content: [],
                    properties: { required: false, label: 'Threshold', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { threshold: '3.14' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content).toEqual([{ data: 3.14 }]);
        });

        test('uses getDatetimeFormValue for Datetime contentType', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'runAt',
                    uuid: 'u-datetime',
                    contentType: AttributeContentType.Datetime,
                    content: [],
                    properties: { required: false, label: 'Run at', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { runAt: '2024-01-01T00:00:00.000Z' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content).toHaveLength(1);
            expect(result[0].content[0].data).toBeDefined();
            expect(typeof result[0].content[0].data).toBe('string');
        });

        test('uses getDateFormValue for Date contentType', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'validTo',
                    uuid: 'u-date',
                    contentType: AttributeContentType.Date,
                    content: [],
                    properties: { required: false, label: 'Valid to', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { validTo: '2024-01-10' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content[0].data).toBeDefined();
            expect(typeof result[0].content[0].data).toBe('string');
        });

        test('builds Codeblock content with base64 encoded code and language', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'script',
                    uuid: 'u-code',
                    contentType: AttributeContentType.Codeblock,
                    content: [{ data: { language: ProgrammingLanguageEnum.Python } }],
                    properties: { required: false, label: 'Script', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = {
                __attributes__id1__: {
                    script: {
                        code: 'print(1)',
                        language: ProgrammingLanguageEnum.Python,
                    },
                },
            };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            const contentItem = result[0].content[0] as any;
            expect(typeof contentItem.data.code).toBe('string');
            expect(contentItem.data.code).toBe(base64Encode('print(1)'));
            expect(contentItem.data.language).toBe(ProgrammingLanguageEnum.Python);
        });

        test('builds Secret content with secret field', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'password',
                    uuid: 'u-secret',
                    contentType: AttributeContentType.Secret,
                    content: [],
                    properties: { required: false, label: 'Password', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { password: 's3cr3t' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content[0].data).toEqual({ secret: 's3cr3t' });
        });

        test('normalizes numeric value when passed as object with data', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'retries',
                    uuid: 'u-retries',
                    contentType: AttributeContentType.Integer,
                    content: [],
                    properties: { required: false, label: 'Retries', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { retries: { data: '5' } } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content[0].data).toBe(5);
        });

        test('handles item with value wrapper object', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'tag',
                    uuid: 'u-tag',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Tag', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { tag: { value: 'blue' } } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content[0].data).toBe('blue');
        });

        test('skips attributes without matching descriptor', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'known',
                    uuid: 'u-known',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Known', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { unknown: 'value' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toEqual([]);
        });

        test('skips attributes with null value', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'known',
                    uuid: 'u-known',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Known', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { known: null } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toEqual([]);
        });

        test('processes Custom attribute descriptors', () => {
            const descriptors = [
                {
                    type: AttributeType.Custom,
                    name: 'customKey',
                    uuid: 'u-custom',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Custom', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { customKey: 'customValue' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('customKey');
            expect(result[0].content[0].data).toBe('customValue');
        });

        test('handles array attribute values for Data descriptors', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'tags',
                    uuid: 'u-tags',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Tags', readOnly: false, visible: true, list: true, multiSelect: true },
                },
            ] as any[];
            const values = { __attributes__id1__: { tags: ['a', 'b'] } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toHaveLength(1);
            expect(result[0].content).toEqual([{ data: 'a' }, { data: 'b' }]);
        });

        test('supports schemaVersion V3 on descriptor', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    schemaVersion: AttributeVersion.V3,
                    name: 'attr1',
                    uuid: 'u1',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'A', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { attr1: 'value1' } };
            const result = collectFormAttributes('id1', descriptors, values);

            expect(result).toHaveLength(1);
            expect(result[0].version).toBe(AttributeVersion.V3);
            expect(result[0].content).toEqual([{ data: 'value1', contentType: AttributeContentType.String }]);
        });

        test('ignores inherited keys on attributes object', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'inherited',
                    uuid: 'u-inherited',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Inherited', readOnly: false, visible: true, list: false },
                },
            ] as any[];

            const inheritedAttributes = Object.create({ inherited: 'value' });
            const values = { __attributes__id1__: inheritedAttributes };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toEqual([]);
        });

        test('skips descriptor types that are neither Data nor Custom', () => {
            const descriptors = [
                {
                    type: AttributeType.Group,
                    name: 'grouped',
                    uuid: 'u-group',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Grouped', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { grouped: 'value' } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toEqual([]);
        });

        test('skips content object without data and without array payload', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'emptyRef',
                    uuid: 'u-empty-ref',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'EmptyRef', readOnly: false, visible: true, list: false },
                },
            ] as any[];
            const values = { __attributes__id1__: { emptyRef: { reference: '' } } };

            const result = collectFormAttributes('id1', descriptors, values);
            expect(result).toEqual([]);
        });

        test('drops empty resource picker stubs so cleared selection serialises as empty content', () => {
            // Regression: when the operator clears a previously-selected resource (e.g. removes
            // the CA certificate on an authority), the picker leaves a stub entry in the form
            // value array. Serialising it produces { data: "" } which fails polymorphic
            // deserialisation on the backend with "missing type id property 'resource'".
            // The stub must be dropped so the request carries content: [] instead.
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'caCertificates',
                    uuid: 'u-resource',
                    contentType: AttributeContentType.Resource,
                    content: [],
                    properties: { required: false, label: 'CA', readOnly: false, visible: true, list: true },
                },
            ] as any[];
            // Every shape the picker is observed to leave behind when the operator clears a
            // selection — primitives, react-select-style { value }, and content-style { data }.
            const stubVariants: Array<unknown[]> = [
                [''],
                [null],
                [undefined],
                ['', null, undefined],
                [{ data: '' }],
                [{ data: null }],
                [{ data: undefined }],
                [{ data: '', reference: '' }],
                [{ value: '' }],
                [{ value: null }],
                [{ value: undefined }],
                [{ value: { data: '' } }],
            ];
            for (const value of stubVariants) {
                const values = { __attributes__id1__: { caCertificates: value } };
                const result = collectFormAttributes('id1', descriptors, values);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('caCertificates');
                expect(result[0].content).toEqual([]);
            }
        });

        test('drops single-pick resource attribute when its form value is an empty stub', () => {
            // Single-pick resource picker (multiSelect=false) holds a single object as the form
            // value. When the operator clears the selection the value is { data: '' } (or null).
            // The backend rejects { data: '' } with "missing type id property 'resource'" on
            // polymorphic deserialisation, so the entire attribute must be dropped from the
            // request rather than serialised as content: [{ data: '' }].
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'caCertificates',
                    uuid: 'u-resource',
                    contentType: AttributeContentType.Resource,
                    content: [],
                    properties: { required: false, label: 'CA', readOnly: false, visible: true, list: true, multiSelect: false },
                },
            ] as any[];
            const stubVariants: unknown[] = [
                '',
                null,
                undefined,
                { data: '' },
                { data: null },
                { data: '', reference: '' },
                { value: '' },
                { value: null },
            ];
            for (const value of stubVariants) {
                const values = { __attributes__id1__: { caCertificates: value } };
                const result = collectFormAttributes('id1', descriptors, values);
                expect(result).toEqual([]);
            }
        });

        test('keeps valid resource picker selections', () => {
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'caCertificates',
                    uuid: 'u-resource',
                    contentType: AttributeContentType.Resource,
                    content: [],
                    properties: { required: false, label: 'CA', readOnly: false, visible: true, list: true },
                },
            ] as any[];
            const selectedResource = {
                data: { uuid: 'cert-uuid-1', name: 'AAA Certificate Services', resource: 'certificates' },
                reference: 'AAA Certificate Services',
            };
            const values = { __attributes__id1__: { caCertificates: [selectedResource] } };

            const result = collectFormAttributes('id1', descriptors, values);

            expect(result).toHaveLength(1);
            expect(result[0].content).toHaveLength(1);
            expect(result[0].content[0].data).toMatchObject({ uuid: 'cert-uuid-1', resource: 'certificates' });
        });

        test('does not drop empty entries for non-resource list attributes', () => {
            // Defensive: the stub-filter is scoped to RESOURCE so primitive list types preserve
            // whatever the form sends today (no behaviour change for STRING / TEXT / etc.).
            const descriptors = [
                {
                    type: AttributeType.Data,
                    name: 'tags',
                    uuid: 'u-string-list',
                    contentType: AttributeContentType.String,
                    content: [],
                    properties: { required: false, label: 'Tags', readOnly: false, visible: true, list: true },
                },
            ] as any[];
            const values = { __attributes__id1__: { tags: ['', 'real-tag'] } };

            const result = collectFormAttributes('id1', descriptors, values);

            expect(result).toHaveLength(1);
            expect(result[0].content).toHaveLength(2);
            expect(result[0].content[0].data).toBe('');
            expect(result[0].content[1].data).toBe('real-tag');
        });
    });

    describe('mapAttributeContentToOptionValue', () => {
        test('returns label from reference when present', () => {
            const content = { data: 'x', reference: 'Display Label' } as any;
            const descriptor = {
                contentType: AttributeContentType.String,
                content: [],
                properties: {},
            } as any;
            const result = mapAttributeContentToOptionValue(content, descriptor);
            expect(result.label).toBe('Display Label');
            expect(result.value).toBe(content);
        });
        test('returns label from data when no reference', () => {
            const content = { data: 'plain', reference: undefined } as any;
            const descriptor = {
                contentType: AttributeContentType.String,
                content: [],
                properties: {},
            } as any;
            const result = mapAttributeContentToOptionValue(content, descriptor);
            expect(result.label).toBe('plain');
            expect(result.value).toBe(content);
        });

        test('formats Date label from content data', () => {
            const content = { data: '2024-01-10T00:00:00.000Z' } as any;
            const descriptor = {
                contentType: AttributeContentType.Date,
                content: [],
                properties: {},
            } as any;
            const result = mapAttributeContentToOptionValue(content, descriptor);
            expect(typeof result.label).toBe('string');
            expect((result.label as string).length).toBeGreaterThan(0);
        });

        test('formats Datetime label from content data', () => {
            const content = { data: '2024-01-10T12:15:00.000Z' } as any;
            const descriptor = {
                contentType: AttributeContentType.Datetime,
                content: [],
                properties: {},
            } as any;
            const result = mapAttributeContentToOptionValue(content, descriptor);
            expect(typeof result.label).toBe('string');
            expect((result.label as string).length).toBeGreaterThan(0);
        });
    });

    describe('testAttributeSetFunction', () => {
        test('returns formAttributeName and formAttributeValue for list+multiSelect when using descriptor default', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [{ data: 'a', reference: 'A' }],
                properties: { list: true, multiSelect: true, required: false },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'connector.attr1', true, true);
            expect(result.formAttributeName).toBe('connector.attr1');
            expect(Array.isArray(result.formAttributeValue)).toBe(true);
            expect(result.formAttributeValue).toHaveLength(1);
            expect(result.formAttributeValue[0].label).toBe('A');
        });
        test('returns formAttributeValue from attribute content (reference preferred over data)', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [],
                properties: { list: false, required: false },
            } as any;
            const attribute = { content: [{ data: 'set', reference: 'Set' }] } as any;
            const result = testAttributeSetFunction(descriptor, attribute, 'profile.x', false, false);
            expect(result.formAttributeName).toBe('profile.x');
            expect(result.formAttributeValue).toBe('Set');
        });

        test('for required Boolean without value sets false', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.Boolean,
                content: [],
                properties: { list: false, multiSelect: false, required: true, label: 'Flag', readOnly: false, visible: true },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'form.flag', true, false);
            expect(result.formAttributeValue).toBe(false);
        });

        test('for non-required Boolean without value keeps descriptor default when present', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.Boolean,
                content: [{ data: true }],
                properties: { list: false, multiSelect: false, required: false, label: 'Flag', readOnly: false, visible: true },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'form.flag', true, false);
            expect(result.formAttributeValue).toBe(true);
        });

        test('for list without value returns undefined formAttributeValue', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [],
                properties: { list: true, multiSelect: false, required: false },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'profile.x', true, false);
            expect(result.formAttributeValue).toBeUndefined();
        });

        test('decodes Codeblock default descriptor value', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.Codeblock,
                content: [{ data: { code: base64Encode('echo 1'), language: ProgrammingLanguageEnum.Bash } }],
                properties: { list: false, multiSelect: false, required: false },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'profile.script', false, true);
            expect(result.formAttributeValue).toEqual({ code: 'echo 1', language: ProgrammingLanguageEnum.Bash });
        });

        test('returns Codeblock language-only object when code is missing', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.Codeblock,
                content: [{ data: { language: ProgrammingLanguageEnum.Python } }],
                properties: { list: false, multiSelect: false, required: false },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'profile.script', false, true);
            expect(result.formAttributeValue).toEqual({ language: ProgrammingLanguageEnum.Python });
        });

        test('uses descriptor default even when not required if setDefaultOnRequiredValuesOnly is false', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [{ data: 'default-value' }],
                properties: { list: false, multiSelect: false, required: false },
            } as any;
            const result = testAttributeSetFunction(descriptor, undefined, 'profile.value', false, false);
            expect(result.formAttributeValue).toBe('default-value');
        });

        test('for list with applied content maps first option for single select', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [],
                properties: { list: true, multiSelect: false, required: false },
            } as any;
            const attribute = { content: [{ data: 'set', reference: 'Set label' }] } as any;
            const result = testAttributeSetFunction(descriptor, attribute, 'profile.select', true, false);
            expect(result.formAttributeValue).toEqual({ label: 'Set label', value: attribute.content[0] });
        });

        test('for multiSelect list with non-array applied content sets undefined', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.String,
                content: [{ data: 'x' }],
                properties: { list: true, multiSelect: true, required: false },
            } as any;
            const attribute = { content: { data: 'wrong-shape' } } as any;
            const result = testAttributeSetFunction(descriptor, attribute, 'profile.multi', true, false);
            expect(result.formAttributeValue).toBeUndefined();
        });

        test('for Boolean with applied content returns applied boolean value', () => {
            const descriptor = {
                type: AttributeType.Data,
                contentType: AttributeContentType.Boolean,
                content: [{ data: false }],
                properties: { list: false, multiSelect: false, required: true, label: 'Flag', readOnly: false, visible: true },
            } as any;
            const attribute = { content: [{ data: true }] } as any;
            const result = testAttributeSetFunction(descriptor, attribute, 'form.flag', true, false);
            expect(result.formAttributeValue).toBe(true);
        });
    });

    describe('mapProfileAttribute', () => {
        test('returns empty array when profile path is undefined', () => {
            const result = mapProfileAttribute(undefined, {}, 'resource', 'path.to.attrs', 'form');
            expect(result).toEqual([]);
        });
        test('maps profile attributes to form when custom attributes match', () => {
            const customAttr = {
                type: AttributeType.Custom,
                name: 'custom1',
                uuid: 'cu1',
                contentType: AttributeContentType.String,
                content: [],
                properties: { required: false, label: 'C', readOnly: false, visible: true, list: false },
            } as any;
            const profile = { section: { attributes: [{ uuid: 'cu1', name: 'custom1' }] } };
            const multipleResourceCustomAttributes = { resource: [customAttr] };
            const result = mapProfileAttribute(profile, multipleResourceCustomAttributes, 'resource', 'section.attributes', 'form');
            expect(result).toHaveLength(1);
            expect(result[0].formAttributeName).toBe('form.custom1');
        });
        test('filters out when uuid does not match', () => {
            const customAttr = {
                type: AttributeType.Custom,
                name: 'other',
                uuid: 'other-uuid',
                contentType: AttributeContentType.String,
                content: [],
                properties: {},
            } as any;
            const profile = { section: { attributes: [{ uuid: 'cu1', name: 'custom1' }] } };
            const multipleResourceCustomAttributes = { resource: [customAttr] };
            const result = mapProfileAttribute(profile, multipleResourceCustomAttributes, 'resource', 'section.attributes', 'form');
            expect(result).toHaveLength(0);
        });
    });
});
