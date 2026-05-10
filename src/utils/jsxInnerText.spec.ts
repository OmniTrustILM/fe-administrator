import { describe, expect, test } from 'vitest';
import { jsxInnerText } from './jsxInnerText';

// React elements at runtime are plain objects: { props: { children: ... } }
const el = (children?: unknown) => ({ props: { children } });

describe('jsxInnerText', () => {
    test('returns empty string for null', () => {
        expect(jsxInnerText(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
        expect(jsxInnerText(undefined)).toBe('');
    });

    test('returns string for string input', () => {
        expect(jsxInnerText('hello')).toBe('hello');
    });

    test('returns string for number input', () => {
        expect(jsxInnerText(42)).toBe('42');
    });

    test('returns string for zero', () => {
        expect(jsxInnerText(0)).toBe('0');
    });

    test('returns string for boolean', () => {
        expect(jsxInnerText(true)).toBe('true');
    });

    test('returns empty string for function (unsupported type)', () => {
        expect(jsxInnerText((() => {}) as unknown as React.ReactNode)).toBe('');
    });

    test('returns empty string for empty array', () => {
        expect(jsxInnerText([])).toBe('');
    });

    test('extracts text from array of strings', () => {
        expect(jsxInnerText(['A', 'B'] as unknown as React.ReactNode)).toBe('AB');
    });

    test('extracts text from element with string child', () => {
        expect(jsxInnerText(el('Hello') as unknown as React.ReactNode)).toBe('Hello');
    });

    test('extracts text from nested elements', () => {
        const node = el([el('Hello '), el('World')]);
        expect(jsxInnerText(node as unknown as React.ReactNode)).toBe('Hello World');
    });

    test('extracts text from array of elements', () => {
        const node = [el('A'), el('B')];
        expect(jsxInnerText(node as unknown as React.ReactNode)).toBe('AB');
    });

    test('handles mixed content (text nodes and element children)', () => {
        const node = el(['Text', el(' and '), 'more']);
        expect(jsxInnerText(node as unknown as React.ReactNode)).toBe('Text and more');
    });

    test('returns empty string for element with no props', () => {
        expect(jsxInnerText({} as unknown as React.ReactNode)).toBe('');
    });

    test('returns empty string for element with empty props (no children)', () => {
        const node = { props: {} };
        expect(jsxInnerText(node as unknown as React.ReactNode)).toBe('');
    });

    test('iterates own prop names for element without children', () => {
        const node = { props: { foo: 'bar', baz: 1 } };
        expect(jsxInnerText(node as unknown as React.ReactNode)).toBe('foobarbaz1');
    });
});
