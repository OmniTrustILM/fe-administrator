import { test, expect } from '../../../playwright/ct-test';
import ThemeProvider from 'components/ThemeProvider';
import JsonViewer from './index';

test.describe('JsonViewer', () => {
    test('highlights key and primitive value types with the dark palette in dark mode', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        const component = await mount(
            <div>
                <ThemeProvider>
                    <JsonViewer value={JSON.stringify({ name: 'Alice', age: 5, active: true, extra: null })} />
                </ThemeProvider>
            </div>,
        );

        const highlightedHtml = await component.locator('code').innerHTML();
        expect(highlightedHtml).toContain('color:#7aa2f7');
        expect(highlightedHtml).toContain('color:#9ece6a');
        expect(highlightedHtml).toContain('color:#f7768e');
        expect(highlightedHtml).toContain('color:#bb9af7');
        expect(highlightedHtml).toContain('color:#e0af68');
    });

    test('highlights key and primitive value types with the light palette in light mode', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        const component = await mount(
            <div>
                <ThemeProvider>
                    <JsonViewer value={JSON.stringify({ name: 'Alice', age: 5, active: true, extra: null })} />
                </ThemeProvider>
            </div>,
        );

        const highlightedHtml = await component.locator('code').innerHTML();
        expect(highlightedHtml).toContain('color:#0550ae');
        expect(highlightedHtml).toContain('color:#0a7c42');
        expect(highlightedHtml).toContain('color:#b3246b');
        expect(highlightedHtml).toContain('color:#7c3aed');
        expect(highlightedHtml).toContain('color:#8a5a00');
    });

    test('shows original input when value is not valid json', async ({ mount }) => {
        const component = await mount(
            <div>
                <ThemeProvider>
                    <JsonViewer value="{not-valid-json}" />
                </ThemeProvider>
            </div>,
        );

        await expect(component.locator('pre')).toContainText('{not-valid-json}');
    });

    test('applies custom sizing props', async ({ mount }) => {
        const component = await mount(
            <div>
                <ThemeProvider>
                    <JsonViewer value="{}" height={278} paddingTop={44} />
                </ThemeProvider>
            </div>,
        );

        await expect(component.locator('pre')).toHaveCSS('height', '278px');
        await expect(component.locator('pre')).toHaveCSS('padding-top', '44px');
    });

    test('wraps long lines and hides horizontal scrollbar', async ({ mount }) => {
        const component = await mount(
            <div style={{ width: '240px' }}>
                <ThemeProvider>
                    <JsonViewer value={JSON.stringify({ veryLongKey: 'a'.repeat(600) })} />
                </ThemeProvider>
            </div>,
        );

        await expect(component.locator('pre')).toHaveCSS('white-space', 'pre-wrap');
        await expect(component.locator('pre')).toHaveCSS('overflow-x', 'hidden');
    });
});
