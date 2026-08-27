import { describe, expect, test } from 'vitest';
import { applyMarkdownAction, type EditState, markdownShortcut } from './markdown-editing';

/** Builds a state from a string with `[` and `]` marking the selection. */
const at = (marked: string): EditState => {
    const selectionStart = marked.indexOf('[');
    const selectionEnd = marked.indexOf(']') - 1;
    return { value: marked.replace('[', '').replace(']', ''), selectionStart, selectionEnd };
};

/** Renders a state back to the marked form, so expectations read like the input. */
const show = ({ value, selectionStart, selectionEnd }: EditState) =>
    `${value.slice(0, selectionStart)}[${value.slice(selectionStart, selectionEnd)}]${value.slice(selectionEnd)}`;

const apply = (marked: string, action: Parameters<typeof applyMarkdownAction>[1]) => show(applyMarkdownAction(at(marked), action));

describe('inline wrappers', () => {
    test('bold wraps the selection and keeps it selected', () => {
        expect(apply('say [hello] there', 'bold')).toBe('say **[hello]** there');
    });

    test('bold on an empty selection inserts the markers around the caret', () => {
        expect(apply('say [] there', 'bold')).toBe('say **[]** there');
    });

    test('bold on an already bold selection unwraps it', () => {
        expect(apply('say **[hello]** there', 'bold')).toBe('say [hello] there');
        expect(apply('say [**hello**] there', 'bold')).toBe('say [hello] there');
    });

    test('italic and strikethrough use their own markers', () => {
        expect(apply('[x]', 'italic')).toBe('_[x]_');
        expect(apply('[x]', 'strikethrough')).toBe('~~[x]~~');
    });

    test('code wraps a single line inline and a multi-line selection in a fence', () => {
        expect(apply('run [ls -la] now', 'code')).toBe('run `[ls -la]` now');
        expect(apply('[a\nb]', 'code')).toBe('```\n[a\nb]\n```');
    });
});

describe('links', () => {
    test('wraps selected text and selects the URL placeholder', () => {
        expect(apply('see [the docs] here', 'link')).toBe('see [the docs]([https://]) here');
    });

    test('with no selection inserts a placeholder text and selects the URL', () => {
        expect(apply('see [] here', 'link')).toBe('see [text]([https://]) here');
    });

    test('a selected URL becomes the target and the caret lands in the text slot', () => {
        expect(apply('[https://example.com/a]', 'link')).toBe('[[]](https://example.com/a)');
        expect(apply('[mailto:a@b.c]', 'link')).toBe('[[]](mailto:a@b.c)');
    });
});

describe('line prefixes', () => {
    test('heading prefixes the current line and selects it', () => {
        expect(apply('intro\nti[t]le\nbody', 'heading')).toBe('intro\n[# title]\nbody');
    });

    test('heading on a heading line removes it', () => {
        expect(apply('[## title]', 'heading')).toBe('[title]');
    });

    test('bulleted list prefixes every selected line', () => {
        expect(apply('[a\nb\nc]', 'bulletList')).toBe('[- a\n- b\n- c]');
    });

    test('bulleted list on a list removes the markers, accepting * as a marker too', () => {
        expect(apply('[- a\n* b]', 'bulletList')).toBe('[a\nb]');
    });

    test('a partially listed block gains the marker on every line', () => {
        expect(apply('[- a\nb]', 'bulletList')).toBe('[- - a\n- b]');
    });

    test('numbered list numbers the lines from one', () => {
        expect(apply('[a\nb]', 'numberedList')).toBe('[1. a\n2. b]');
        expect(apply('[1. a\n2. b]', 'numberedList')).toBe('[a\nb]');
    });

    test('quote prefixes and toggles', () => {
        expect(apply('[a\nb]', 'quote')).toBe('[> a\n> b]');
        expect(apply('[> a]', 'quote')).toBe('[a]');
    });

    test('line actions work on the line under a collapsed caret', () => {
        expect(apply('first\nsec[]ond\nthird', 'quote')).toBe('first\n[> second]\nthird');
    });

    test('line actions at the end of the text without a trailing newline', () => {
        expect(apply('a\n[b]', 'heading')).toBe('a\n[# b]');
    });
});

describe('shortcuts', () => {
    const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
        key: k,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        ...mods,
    });

    test('Ctrl and Cmd map B, I and K', () => {
        expect(markdownShortcut(key('b', { ctrlKey: true }))).toBe('bold');
        expect(markdownShortcut(key('I', { metaKey: true }))).toBe('italic');
        expect(markdownShortcut(key('k', { ctrlKey: true }))).toBe('link');
    });

    test('other keys and Alt combinations are ignored', () => {
        expect(markdownShortcut(key('b'))).toBeUndefined();
        expect(markdownShortcut(key('b', { ctrlKey: true, altKey: true }))).toBeUndefined();
        expect(markdownShortcut(key('s', { ctrlKey: true }))).toBeUndefined();
    });
});
