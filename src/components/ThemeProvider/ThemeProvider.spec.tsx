import type { Page } from '@playwright/test';
import { expect, test } from '../../../playwright/ct-test';
import type { BrandingTheme } from 'types/branding';
import ThemeProvider from './index';
import Probe from './Probe';

const branded = (defaultTheme: BrandingTheme) => ({ configured: true, defaultTheme });
const unbranded = { configured: false };

const seed = (page: Page, values: Record<string, string>) =>
    page.evaluate((entries) => {
        for (const [key, value] of Object.entries(entries)) {
            globalThis.localStorage.setItem(key, value);
        }
    }, values);

test.describe('ThemeProvider', () => {
    test('should fall back to the OS preference when nothing else is set', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toHaveText('dark');
        await expect(page.getByTestId('resolved')).toHaveText('dark');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should follow OS changes live while on the fallback path', async ({ mount, page }) => {
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

    test('should apply the operator default over the OS preference', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toHaveText('systemDark');
        await expect(page.getByTestId('resolved')).toHaveText('dark');
    });

    test('should let a stored choice win over the operator default', async ({ mount, page }) => {
        await seed(page, { 'theme-mode': 'light' });
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toHaveText('light');
        await expect(page.getByTestId('resolved')).toHaveText('light');
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

        await page.emulateMedia({ colorScheme: 'light' });
        await expect(page.getByTestId('resolved')).toHaveText('dark');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should persist the chosen mode', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('light' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );
        await page.getByTestId('set-systemDark').click();
        await expect(page.getByTestId('mode')).toHaveText('systemDark');

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-mode'))).toBe('systemDark');
    });

    test('should not persist a mode the user never chose', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('mode')).toHaveText('systemDark');

        expect(await page.evaluate(() => globalThis.localStorage.getItem('theme-mode'))).toBeNull();
    });

    test('should offer only the platform modes without branding', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={unbranded}>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('modes')).toHaveText('light,dark');
    });

    test('should offer all four modes once branding is configured', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('light' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('modes')).toHaveText('light,dark,systemLight,systemDark');
    });

    test('should report a stored branded choice as its platform mode when branding is gone', async ({ mount, page }) => {
        await seed(page, { 'theme-mode': 'systemDark' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toHaveText('dark');
        await expect(page.getByTestId('resolved')).toHaveText('dark');
    });

    test('should cache the operator default for the next load', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBe('dark');
    });

    test('should clear the cached operator default once branding is removed', async ({ mount, page }) => {
        await seed(page, { 'theme-operator-default': 'dark' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <Probe />
            </ThemeProvider>,
        );

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBeNull();
    });

    test('should keep the cached operator default while no branding has been read', async ({ mount, page }) => {
        await seed(page, { 'theme-operator-default': 'dark' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toBeVisible();
        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBe('dark');
    });

    test('should apply the cached operator default before the branding read lands', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await seed(page, { 'theme-operator-default': 'dark' });
        await mount(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        );

        await expect(page.getByTestId('mode')).toHaveText('systemDark');
        await expect(page.getByTestId('modes')).toHaveText('light,dark,systemLight,systemDark');
    });
});
