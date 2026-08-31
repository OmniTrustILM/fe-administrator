import { describe, expect, test } from 'vitest';
import { applyMarkdownAction, type EditState, type MarkdownAction, markdownShortcut } from './markdown-editing';

/** Builds a state from a string with `[` and `]` marking the selection. */
const at = (marked: string): EditState => {
    const selectionStart = marked.indexOf('[');
    const selectionEnd = marked.indexOf(']') - 1;
    return { value: marked.replace('[', '').replace(']', ''), selectionStart, selectionEnd };
};

/** Renders a state back to the marked form, so expectations read like the input. */
const show = ({ value, selectionStart, selectionEnd }: EditState) =>
    `${value.slice(0, selectionStart)}[${value.slice(selectionStart, selectionEnd)}]${value.slice(selectionEnd)}`;

const apply = (marked: string, action: MarkdownAction) => show(applyMarkdownAction(at(marked), action));

/** One row per transform: [what it shows, action, input with selection, expected output with selection]. */
const cases: [string, MarkdownAction, string, string][] = [
    ['bold wraps the selection and keeps it selected', 'bold', 'say [hello] there', 'say **[hello]** there'],
    ['bold on an empty selection inserts the markers around the caret', 'bold', 'say [] there', 'say **[]** there'],
    ['bold on a selection wrapped outside unwraps it', 'bold', 'say **[hello]** there', 'say [hello] there'],
    ['bold on a selection wrapped inside unwraps it', 'bold', 'say [**hello**] there', 'say [hello] there'],
    ['italic uses its own marker', 'italic', '[x]', '_[x]_'],
    ['strikethrough uses its own marker', 'strikethrough', '[x]', '~~[x]~~'],
    ['code wraps a single line inline', 'code', 'run [ls -la] now', 'run `[ls -la]` now'],
    ['code wraps a multi-line selection in a fence', 'code', '[a\nb]', '```\n[a\nb]\n```'],
    ['link wraps selected text and selects the URL placeholder', 'link', 'see [the docs] here', 'see [the docs]([https://]) here'],
    ['link with no selection inserts a placeholder text and selects the URL', 'link', 'see [] here', 'see [text]([https://]) here'],
    [
        'link on a selected URL uses it as the target and puts the caret in the text slot',
        'link',
        '[https://example.com/a]',
        '[[]](https://example.com/a)',
    ],
    ['link on a selected mailto uses it as the target', 'link', '[mailto:a@b.c]', '[[]](mailto:a@b.c)'],
    ['heading prefixes the current line and selects it', 'heading', 'intro\nti[t]le\nbody', 'intro\n[# title]\nbody'],
    ['heading on a heading line removes it', 'heading', '[## title]', '[title]'],
    ['bulleted list prefixes every selected line', 'bulletList', '[a\nb\nc]', '[- a\n- b\n- c]'],
    ['bulleted list on a list removes the markers, accepting * as a marker too', 'bulletList', '[- a\n* b]', '[a\nb]'],
    ['a partially listed block gains the marker on every line', 'bulletList', '[- a\nb]', '[- - a\n- b]'],
    ['numbered list numbers the lines from one', 'numberedList', '[a\nb]', '[1. a\n2. b]'],
    ['numbered list on a numbered list removes the numbers', 'numberedList', '[1. a\n2. b]', '[a\nb]'],
    ['quote prefixes every selected line', 'quote', '[a\nb]', '[> a\n> b]'],
    ['quote on a quote removes it', 'quote', '[> a]', '[a]'],
    ['line actions work on the line under a collapsed caret', 'quote', 'first\nsec[]ond\nthird', 'first\n[> second]\nthird'],
    ['line actions at the end of the text without a trailing newline', 'heading', 'a\n[b]', 'a\n[# b]'],
];

describe('applyMarkdownAction', () => {
    test.each(cases)('%s', (_, action, input, expected) => {
        expect(apply(input, action)).toBe(expected);
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

    test.each([
        ['Ctrl+B is bold', key('b', { ctrlKey: true }), 'bold'],
        ['Cmd+I is italic, case-insensitively', key('I', { metaKey: true }), 'italic'],
        ['Ctrl+K is link', key('k', { ctrlKey: true }), 'link'],
        ['an unmodified key is ignored', key('b'), undefined],
        ['an Alt combination is ignored', key('b', { ctrlKey: true, altKey: true }), undefined],
        ['an unmapped key is ignored', key('s', { ctrlKey: true }), undefined],
    ])('%s', (_, event, expected) => {
        expect(markdownShortcut(event)).toBe(expected);
    });
});
