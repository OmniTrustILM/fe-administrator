import type { Page } from '@playwright/test';
import { expect, test } from '../../../playwright/ct-test';
import type { BrandingTheme } from 'types/branding';
import { DARK_SCHEME_QUERY } from 'utils/theme';
import ThemeProvider from './index';
import Probe from './Probe';

const branded = (defaultTheme: BrandingTheme) => ({ configured: true, defaultTheme });
const unbranded = { configured: false };

/**
 * Switches the OS preference and returns once the page has dispatched the change to a listener. An expectation that
 * the theme did *not* move is satisfied by the state before the switch as well, so it has to be made after the event
 * the provider would have reacted to rather than racing it.
 */
const switchOsPreference = async (page: Page, colorScheme: 'light' | 'dark') => {
    await page.evaluate((query) => {
        Object.assign(globalThis, { __osChangeSeen: false });
        globalThis.matchMedia(query).addEventListener('change', () => Object.assign(globalThis, { __osChangeSeen: true }));
    }, DARK_SCHEME_QUERY);
    await page.emulateMedia({ colorScheme });
    await expect.poll(async () => page.evaluate(() => Reflect.get(globalThis, '__osChangeSeen'))).toBe(true);
};

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
        await page.getByTestId('set-light').click();
        await expect(page.getByTestId('resolved')).toHaveText('light');

        // The same transition the fallback-path test above follows. Without the choice made first, the theme would
        // move with it, so what is asserted below holds only because the chosen mode outranks the OS.
        await switchOsPreference(page, 'dark');

        await expect(page.getByTestId('resolved')).toHaveText('light');
        await expect(page.locator('html')).not.toHaveClass(/dark/);
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
