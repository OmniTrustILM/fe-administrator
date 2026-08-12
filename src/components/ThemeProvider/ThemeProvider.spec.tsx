import { expect, test } from '../../../playwright/ct-test';
import ThemeProvider from './index';
import Probe from './Probe';

test.describe('ThemeProvider', () => {
    test('should default to system mode', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('mode')).toHaveText('system');
    });

    test('should resolve system mode to the OS preference', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('resolved')).toHaveText('dark');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should follow OS changes live while in system mode', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('resolved')).toHaveText('light');

        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(page.getByTestId('resolved')).toHaveText('dark');
    });

    test('should ignore the OS preference once a mode is chosen', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        await page.getByTestId('set-dark').click();

        await expect(page.getByTestId('resolved')).toHaveText('dark');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should cycle system to light to dark and back', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        const mode = page.getByTestId('mode');

        await page.getByTestId('cycle').click();
        await expect(mode).toHaveText('light');
        await page.getByTestId('cycle').click();
        await expect(mode).toHaveText('dark');
        await page.getByTestId('cycle').click();
        await expect(mode).toHaveText('system');
    });

    test('should persist the chosen mode', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );
        await page.getByTestId('set-dark').click();
        await expect(page.getByTestId('mode')).toHaveText('dark');

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-mode'))).toBe('dark');
    });
});
