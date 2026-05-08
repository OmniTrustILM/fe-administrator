import { test, expect } from '../../playwright/ct-test';
import { jsxInnerText } from './jsxInnerText';

test.describe('jsxInnerText', () => {
    test('should return string for string input', () => {
        expect(jsxInnerText('hello')).toBe('hello');
    });

    test('should return string for number input', () => {
        expect(jsxInnerText(42)).toBe('42');
    });

    test('should return string for zero number input', () => {
        expect(jsxInnerText(0)).toBe('0');
    });

    test('should return string for boolean input', () => {
        expect(jsxInnerText(true)).toBe('true');
    });

    test('should return empty string for null/undefined', () => {
        expect(jsxInnerText(null)).toBe('');
        expect(jsxInnerText(undefined)).toBe('');
    });

    test('should extract text from React element with string children', () => {
        expect(jsxInnerText(<span>Hello</span>)).toBe('Hello');
    });

    test('should extract text from nested React elements', () => {
        expect(
            jsxInnerText(
                <div>
                    <span>Hello </span>
                    <span>World</span>
                </div>,
            ),
        ).toBe('Hello World');
    });

    test('should handle array of elements', () => {
        expect(jsxInnerText([<span key="1">A</span>, <span key="2">B</span>])).toBe('AB');
    });

    test('should handle mixed content', () => {
        expect(
            jsxInnerText(
                <div>
                    Text<span> and </span>more
                </div>,
            ),
        ).toBe('Text and more');
    });

    test('should return empty string for empty array', () => {
        expect(jsxInnerText([])).toBe('');
    });

    test('should return empty string for self-closing element with no props', () => {
        expect(jsxInnerText(<br />)).toBe('');
    });

    test('should iterate own props for element without children', () => {
        const node = { props: { foo: 'bar', baz: 1 } } as unknown as React.ReactNode;
        expect(jsxInnerText(node)).toBe('foobarbaz1');
    });

    test('should return empty string for plain object without props or children', () => {
        const node = {} as unknown as React.ReactNode;
        expect(jsxInnerText(node)).toBe('');
    });

    test('should return empty string for unsupported types', () => {
        const node = (() => {}) as unknown as React.ReactNode;
        expect(jsxInnerText(node)).toBe('');
    });
});
