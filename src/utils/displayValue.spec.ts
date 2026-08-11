import { describe, expect, test } from 'vitest';
import { contentItemLabel, toDisplayString } from './displayValue';

describe('toDisplayString', () => {
    test('passes primitives through String()', () => {
        expect(toDisplayString('abc')).toBe('abc');
        expect(toDisplayString(42)).toBe('42');
        expect(toDisplayString(0)).toBe('0');
        expect(toDisplayString(true)).toBe('true');
        expect(toDisplayString(false)).toBe('false');
        expect(toDisplayString(undefined)).toBe('undefined');
    });

    test('serialises objects as JSON rather than [object Object]', () => {
        expect(toDisplayString({ a: 1 })).toBe('{"a":1}');
        expect(toDisplayString({ nested: { b: 2 } })).toBe('{"nested":{"b":2}}');
        expect(toDisplayString([1, 'two'])).toBe('[1,"two"]');
        expect(toDisplayString({})).toBe('{}');
    });

    test('treats null as the primitive branch, not an object', () => {
        expect(toDisplayString(null)).toBe('null');
    });
});

describe('contentItemLabel', () => {
    test('returns empty string for a missing item', () => {
        expect(contentItemLabel(undefined)).toBe('');
        expect(contentItemLabel(null)).toBe('');
        expect(contentItemLabel({})).toBe('');
    });

    test('prefers reference over data', () => {
        expect(contentItemLabel({ reference: 'ref-1' })).toBe('ref-1');
        expect(contentItemLabel({ reference: 'ref-1', data: 'ignored' })).toBe('ref-1');
    });

    test('ignores an empty reference and falls through to data', () => {
        expect(contentItemLabel({ reference: '', data: 'from-data' })).toBe('from-data');
    });

    test('returns empty string when data is null or undefined', () => {
        expect(contentItemLabel({ data: null })).toBe('');
        expect(contentItemLabel({ data: undefined })).toBe('');
    });

    test("uses a RESOURCE-style object's name", () => {
        expect(contentItemLabel({ data: { name: 'My CA', uuid: 'x' } })).toBe('My CA');
    });

    test('falls back to JSON for an object whose name is missing or not a string', () => {
        expect(contentItemLabel({ data: { uuid: 'x' } })).toBe('{"uuid":"x"}');
        expect(contentItemLabel({ data: { name: 7 } })).toBe('{"name":7}');
    });

    test('returns primitive data as a string', () => {
        expect(contentItemLabel({ data: 'plain' })).toBe('plain');
        expect(contentItemLabel({ data: 12 })).toBe('12');
        expect(contentItemLabel({ data: 0 })).toBe('0');
        expect(contentItemLabel({ data: true })).toBe('true');
        expect(contentItemLabel({ data: false })).toBe('false');
    });

    test('returns empty string for data types that have no sensible label', () => {
        expect(contentItemLabel({ data: 10n })).toBe('');
        expect(contentItemLabel({ data: Symbol('s') })).toBe('');
        expect(contentItemLabel({ data: () => 'x' })).toBe('');
    });
});
