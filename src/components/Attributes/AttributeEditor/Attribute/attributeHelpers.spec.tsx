import React from 'react';
import { test, expect } from '../../../../../playwright/ct-test';
import {
    transformInputValueForDescriptor,
    getSelectValueFromField,
    getFormTypeFromAttributeContentType,
    buildAttributeValidators,
    getUpdatedOptionsForEditSelect,
    parseListValueByContentType,
} from './attributeHelpers';
import AttributeHelpersCoverageRunner from './AttributeHelpersCoverageRunner';
import { AttributeContentType, AttributeConstraintType } from 'types/openapi';

const minimalDataDescriptor = (contentType: AttributeContentType, required = false) =>
    ({
        type: 'data',
        contentType,
        properties: { required, label: 'Test', readOnly: false, visible: true, list: false, multiSelect: false },
    }) as any;

test.describe('attributeHelpers', () => {
    test.describe('transformInputValueForDescriptor', () => {
        test('returns value as-is for String', () => {
            const d = minimalDataDescriptor(AttributeContentType.String);
            expect(transformInputValueForDescriptor('hello', d)).toBe('hello');
        });

        test('formats Datetime via getFormattedDateTime', () => {
            const d = minimalDataDescriptor(AttributeContentType.Datetime);
            const result = transformInputValueForDescriptor('2024-01-15T10:00:00', d);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        test('returns value ?? false for Boolean when required', () => {
            const d = minimalDataDescriptor(AttributeContentType.Boolean, true);
            expect(transformInputValueForDescriptor(undefined, d)).toBe(false);
            expect(transformInputValueForDescriptor(true, d)).toBe(true);
        });

        test('returns value as-is for Boolean when not required', () => {
            const d = minimalDataDescriptor(AttributeContentType.Boolean, false);
            expect(transformInputValueForDescriptor(undefined, d)).toBeUndefined();
            expect(transformInputValueForDescriptor(true, d)).toBe(true);
        });
    });

    test.describe('getSelectValueFromField', () => {
        test('multiSelect: returns empty array for empty value', () => {
            expect(getSelectValueFromField(undefined, true)).toEqual([]);
            expect(getSelectValueFromField(null, true)).toEqual([]);
        });

        test('multiSelect: maps array of objects to { value, label }', () => {
            const result = getSelectValueFromField([{ value: 1, label: 'One' }], true);
            expect(result).toEqual([{ value: 1, label: 'One' }]);
        });

        test('multiSelect: maps array of primitives to { value, label }', () => {
            const result = getSelectValueFromField([1, 'a'], true);
            expect(result).toEqual([
                { value: 1, label: '1' },
                { value: 'a', label: 'a' },
            ]);
        });

        test('multiSelect: maps array of objects with reference to { value, label }', () => {
            const result = getSelectValueFromField([{ reference: 'ref-1' }], true);
            expect(result).toEqual([{ value: { reference: 'ref-1' }, label: 'ref-1' }]);
        });

        test('multiSelect: returns empty array for non-array value', () => {
            expect(getSelectValueFromField({ value: 1 }, true)).toEqual([]);
        });

        test('single: returns empty string for empty value', () => {
            expect(getSelectValueFromField(undefined, false)).toBe('');
        });

        test('single: returns .value from object', () => {
            expect(getSelectValueFromField({ value: 42, label: 'X' }, false)).toBe(42);
        });

        test('single: returns primitive as-is', () => {
            expect(getSelectValueFromField('hello', false)).toBe('hello');
            expect(getSelectValueFromField(123, false)).toBe(123);
        });

        test('single: returns object with reference when .value is undefined', () => {
            const obj = { reference: 'ref-123' };
            expect(getSelectValueFromField(obj, false)).toBe(obj);
        });
    });

    test.describe('getFormTypeFromAttributeContentType', () => {
        test('maps Boolean to checkbox', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Boolean)).toBe('checkbox');
        });
        test('maps Integer and Float to number', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Integer)).toBe('number');
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Float)).toBe('number');
        });
        test('maps String to text', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.String)).toBe('text');
        });
        test('maps Text and Codeblock to textarea', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Text)).toBe('textarea');
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Codeblock)).toBe('textarea');
        });
        test('maps Date, Time, Datetime', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Date)).toBe('date');
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Time)).toBe('time');
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Datetime)).toBe('datetime-local');
        });
        test('maps Secret to password', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Secret)).toBe('password');
        });

        test('maps Credential and Object to text', () => {
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Credential)).toBe('text');
            expect(getFormTypeFromAttributeContentType(AttributeContentType.Object)).toBe('text');
        });

        test('returns text for unknown type (default)', () => {
            expect(getFormTypeFromAttributeContentType('unknown' as AttributeContentType)).toBe('text');
        });
    });

    test.describe('buildAttributeValidators', () => {
        test('returns a function for undefined descriptor', () => {
            const fn = buildAttributeValidators(undefined);
            expect(typeof fn).toBe('function');
        });

        test('returns a function for data descriptor', () => {
            const d = minimalDataDescriptor(AttributeContentType.String, true);
            const fn = buildAttributeValidators(d);
            expect(typeof fn).toBe('function');
        });

        test('returns validator that passes for non-Data non-Custom descriptor', () => {
            const d = { type: 'info', contentType: AttributeContentType.String, properties: {} } as any;
            const fn = buildAttributeValidators(d);
            expect(fn(undefined)).toBeUndefined();
            expect(fn('any')).toBeUndefined();
        });

        test('required validator rejects empty value', () => {
            const d = minimalDataDescriptor(AttributeContentType.String, true);
            const fn = buildAttributeValidators(d);
            expect(fn(undefined)).toBe('Required Field');
            expect(fn('')).toBe('Required Field');
            expect(fn('ok')).toBeUndefined();
        });

        test('Integer validator rejects non-integer', () => {
            const d = minimalDataDescriptor(AttributeContentType.Integer, false);
            const fn = buildAttributeValidators(d);
            expect(fn('1.5')).toBe('Value must be an integer');
            expect(fn('42')).toBeUndefined();
        });

        test('Float validator rejects non-float', () => {
            const d = minimalDataDescriptor(AttributeContentType.Float, false);
            const fn = buildAttributeValidators(d);
            expect(fn('abc')).toBe('Value must be a float without an exponent.');
            expect(fn('3.14')).toBeUndefined();
        });

        test('RegExp constraint adds pattern validator', () => {
            const d = {
                ...minimalDataDescriptor(AttributeContentType.String, false),
                constraints: [
                    {
                        type: AttributeConstraintType.RegExp,
                        data: '^[a-z]+$',
                        errorMessage: 'Lowercase only',
                    },
                ],
            } as any;
            const fn = buildAttributeValidators(d);
            expect(fn('ABC')).toBe('Lowercase only');
            expect(fn('abc')).toBeUndefined();
        });

        test('Range constraint adds validator when from and to present', () => {
            const d = {
                ...minimalDataDescriptor(AttributeContentType.Integer, false),
                constraints: [
                    {
                        type: AttributeConstraintType.Range,
                        data: { from: 1, to: 10 },
                        errorMessage: 'Between 1 and 10',
                    },
                ],
            } as any;
            const fn = buildAttributeValidators(d);
            expect(typeof fn).toBe('function');
        });
    });

    test.describe('getUpdatedOptionsForEditSelect', () => {
        test('returns options when valuesRecieved is empty', () => {
            const opts = [{ label: 'A', value: 1 }];
            expect(getUpdatedOptionsForEditSelect([], opts)).toBe(opts);
        });

        test('returns undefined when options is undefined', () => {
            expect(getUpdatedOptionsForEditSelect([])).toBeUndefined();
            expect(getUpdatedOptionsForEditSelect([{ label: 'A', value: 1 }])).toBeUndefined();
        });

        test('filters out options that appear in valuesRecieved', () => {
            const opts = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const result = getUpdatedOptionsForEditSelect([{ label: 'A', value: 1 }], opts);
            expect(result).toHaveLength(1);
            expect(result![0].label).toBe('B');
        });

        test('matches by JSON.stringify of value', () => {
            const opts = [
                { label: 'A', value: { id: 1 } },
                { label: 'B', value: { id: 2 } },
            ];
            const result = getUpdatedOptionsForEditSelect([{ label: 'A', value: { id: 1 } }], opts);
            expect(result).toHaveLength(1);
            expect(result![0].label).toBe('B');
        });
    });

    test.describe('parseListValueByContentType', () => {
        test('returns undefined for empty-like values', () => {
            expect(parseListValueByContentType(AttributeContentType.String, '')).toBeUndefined();
            expect(parseListValueByContentType(AttributeContentType.String, undefined)).toBeUndefined();
            expect(parseListValueByContentType(AttributeContentType.String, null as unknown as string)).toBeUndefined();
        });

        test('Integer parses string and option objects', () => {
            expect(parseListValueByContentType(AttributeContentType.Integer, '42')).toBe(42);
            expect(
                parseListValueByContentType(AttributeContentType.Integer, {
                    value: 7,
                    label: 'Seven',
                }),
            ).toBe(7);
        });

        test('Float parses string', () => {
            expect(parseListValueByContentType(AttributeContentType.Float, '3.14')).toBeCloseTo(3.14);
        });

        test('Boolean parses common true/false strings', () => {
            expect(parseListValueByContentType(AttributeContentType.Boolean, 'true')).toBe(true);
            expect(parseListValueByContentType(AttributeContentType.Boolean, '1')).toBe(true);
            expect(parseListValueByContentType(AttributeContentType.Boolean, 'false')).toBe(false);
            expect(parseListValueByContentType(AttributeContentType.Boolean, '0')).toBe(false);
        });

        test('String/Text/Date variants return trimmed string', () => {
            expect(parseListValueByContentType(AttributeContentType.String, ' hello ')).toBe('hello');
            expect(parseListValueByContentType(AttributeContentType.Text, ' body ')).toBe('body');
            expect(parseListValueByContentType(AttributeContentType.Date, '2024-01-01')).toBe('2024-01-01');
        });
    });

    test('runs attributeHelpers in browser for coverage', async ({ mount, page }) => {
        await mount(<AttributeHelpersCoverageRunner />);
        await expect(page.getByTestId('attribute-helpers-coverage-done')).toBeAttached();
    });
});
