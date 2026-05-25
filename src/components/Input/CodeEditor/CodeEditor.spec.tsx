import type { Locator } from '@playwright/test';
import { test, expect } from '../../../../playwright/ct-test';
import { Harness, SessionRefProbe } from './CodeEditorHarness';

type HarnessProps = Parameters<typeof Harness>[0];

async function mountWithCalls(mount: any, props: Partial<HarnessProps> = {}) {
    const calls: string[] = [];
    const component = await mount(<Harness {...props} onValueChange={(v) => calls.push(v)} />);
    const ta = component.locator('textarea') as Locator;
    return { component, calls, ta };
}

async function setSelection(ta: Locator, start: number, end: number) {
    await ta.focus();
    await ta.evaluate((el: HTMLTextAreaElement, range: { s: number; e: number }) => el.setSelectionRange(range.s, range.e), {
        s: start,
        e: end,
    });
}

test.describe('CodeEditor', () => {
    test('renders textarea and pre (highlight as string)', async ({ mount }) => {
        const component = await mount(<Harness initial="hello" />);
        await expect(component.locator('textarea')).toBeAttached();
        await expect(component.locator('pre')).toBeAttached();
        await expect(component.locator('pre em')).toHaveText('hello');
    });

    test('renders highlight as React node', async ({ mount }) => {
        const component = await mount(<Harness initial="abc" highlightAs="node" />);
        await expect(component.locator('[data-testid=rn-highlight]')).toHaveText('abc');
    });

    test('emits onValueChange on typing', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount);
        await ta.pressSequentially('hi');
        expect(calls.at(-1)).toBe('hi');
    });

    test('forwards textareaId, textareaClassName, name, placeholder, maxLength, minLength', async ({ mount }) => {
        const component = await mount(
            <Harness
                textareaId="ed-1"
                textareaClassName="extra-class"
                name="snippet"
                placeholder="write code"
                maxLength={50}
                minLength={1}
            />,
        );
        const ta = component.locator('textarea');
        await expect(ta).toHaveAttribute('id', 'ed-1');
        await expect(ta).toHaveClass(/extra-class/);
        await expect(ta).toHaveAttribute('name', 'snippet');
        await expect(ta).toHaveAttribute('placeholder', 'write code');
        await expect(ta).toHaveAttribute('maxlength', '50');
        await expect(ta).toHaveAttribute('minlength', '1');
    });

    test('forwards preClassName to pre element', async ({ mount }) => {
        const component = await mount(<Harness preClassName="custom-pre" />);
        await expect(component.locator('pre.custom-pre')).toBeAttached();
    });

    test('disabled and readOnly props are forwarded', async ({ mount }) => {
        const component = await mount(<Harness disabled readOnly />);
        const ta = component.locator('textarea');
        await expect(ta).toBeDisabled();
        await expect(ta).toHaveAttribute('readonly', '');
    });

    test('required prop is forwarded', async ({ mount }) => {
        const component = await mount(<Harness required />);
        await expect(component.locator('textarea')).toHaveAttribute('required', '');
    });

    for (const [label, padding, expected] of [
        ['number applies to all sides', 12, { top: '12px', right: '12px', bottom: '12px', left: '12px' }],
        ['object applies per side', { top: 1, right: 2, bottom: 3, left: 4 }, { top: '1px', right: '2px', bottom: '3px', left: '4px' }],
    ] as const) {
        test(`padding as ${label}`, async ({ mount }) => {
            const component = await mount(<Harness padding={padding} />);
            const pre = component.locator('pre');
            await expect(pre).toHaveCSS('padding-top', expected.top);
            await expect(pre).toHaveCSS('padding-right', expected.right);
            await expect(pre).toHaveCSS('padding-bottom', expected.bottom);
            await expect(pre).toHaveCSS('padding-left', expected.left);
        });
    }

    test('Tab inserts two spaces by default', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: 'ab' });
        await setSelection(ta, 2, 2);
        await ta.press('Tab');
        expect(calls.at(-1)).toBe('ab  ');
    });

    test('Tab with insertSpaces=false inserts a tab character', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: 'ab', insertSpaces: false });
        await setSelection(ta, 2, 2);
        await ta.press('Tab');
        expect(calls.at(-1)).toBe('ab\t\t');
    });

    test('Tab with tabSize=4 inserts four spaces', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: '', tabSize: 4 });
        await ta.focus();
        await ta.press('Tab');
        expect(calls.at(-1)).toBe('    ');
    });

    test('Tab over multi-line selection indents each line', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: 'foo\nbar' });
        await setSelection(ta, 0, 7);
        await ta.press('Tab');
        expect(calls.at(-1)).toBe('  foo\n  bar');
    });

    test('Shift+Tab over multi-line selection unindents each line', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: '  foo\n  bar' });
        await setSelection(ta, 0, 11);
        await ta.press('Shift+Tab');
        expect(calls.at(-1)).toBe('foo\nbar');
    });

    test('ignoreTabKey lets focus leave on Tab', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: '', ignoreTabKey: true });
        await ta.focus();
        await ta.press('Tab');
        expect(calls.length).toBe(0);
    });

    test('Backspace removes the tab character when caret follows it', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: 'ab  ' });
        await setSelection(ta, 4, 4);
        await ta.press('Backspace');
        expect(calls.at(-1)).toBe('ab');
    });

    test('Enter preserves leading whitespace indentation', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: '  line' });
        await setSelection(ta, 6, 6);
        await ta.press('Enter');
        expect(calls.at(-1)).toBe('  line\n  ');
    });

    for (const { name, key, expected } of [
        { name: 'parentheses on Shift+9', key: 'Shift+9', expected: '(abc)' },
        { name: 'square brackets on [', key: 'BracketLeft', expected: '[abc]' },
        { name: 'curly braces on Shift+[', key: 'Shift+BracketLeft', expected: '{abc}' },
        { name: 'single quotes on Quote', key: 'Quote', expected: "'abc'" },
        { name: 'double quotes on Shift+Quote', key: 'Shift+Quote', expected: '"abc"' },
        { name: 'backticks on Backquote', key: 'Backquote', expected: '`abc`' },
    ]) {
        test(`wraps selection with ${name}`, async ({ mount }) => {
            const { ta, calls } = await mountWithCalls(mount, { initial: 'abc' });
            await setSelection(ta, 0, 3);
            await ta.press(key);
            expect(calls.at(-1)).toBe(expected);
        });
    }

    test('does not wrap when there is no selection', async ({ mount }) => {
        const { ta, calls } = await mountWithCalls(mount, { initial: '' });
        await ta.focus();
        await ta.press('Shift+9');
        expect(calls.every((c) => !c.includes('('))).toBe(true);
    });

    test('Escape blurs the textarea', async ({ mount }) => {
        const component = await mount(<Harness />);
        const ta = component.locator('textarea');
        await ta.focus();
        await expect(ta).toBeFocused();
        await ta.press('Escape');
        await expect(ta).not.toBeFocused();
    });

    test('forwards onKeyDown handler to consumers', async ({ mount }) => {
        let keyCount = 0;
        let lastKey: string | undefined;
        const component = await mount(
            <Harness
                initial=""
                onKeyDown={(e) => {
                    keyCount++;
                    lastKey = e.key;
                }}
            />,
        );
        const ta = component.locator('textarea');
        await ta.focus();
        await ta.press('a');
        expect(keyCount).toBeGreaterThan(0);
        expect(lastKey).toBe('a');
    });

    test('Undo (Mod+Z) restores previous value after edits', async ({ mount }) => {
        const { ta, calls, component } = await mountWithCalls(mount, { initial: '' });
        await ta.focus();
        await ta.pressSequentially('hello', { delay: 5 });
        expect(await ta.inputValue()).toBe('hello');

        const isMac = await component.page().evaluate(() => /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
        await ta.press(isMac ? 'Meta+KeyZ' : 'Control+KeyZ');

        expect(calls.at(-1)).not.toBe('hello');
    });

    test('imperative session ref exposes history with stack and offset', async ({ mount }) => {
        const component = await mount(<SessionRefProbe />);
        await expect(component.locator('[data-testid=ref-info]')).toHaveText(/stack:\d+,offset:-?\d+/);
    });
});
