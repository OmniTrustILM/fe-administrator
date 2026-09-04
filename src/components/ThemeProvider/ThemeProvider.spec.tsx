import type { Page } from '@playwright/test';
import { expect, test } from '../../../playwright/ct-test';
import type { BrandingTheme } from 'types/branding';
import { DARK_SCHEME_QUERY } from 'utils/theme';
import ThemeProvider from './index';
import Probe from './Probe';

/**
 * Branding reaches the provider as its default theme and nothing else: it decides which palette light and dark render,
 * not which modes exist, so `configured` is not something the theme runtime consults.
 */
const branded = (defaultTheme: BrandingTheme) => ({ defaultTheme });
const unbranded = {};

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

        await expect(page.getByTestId('mode')).toHaveText('system');
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

    /**
     * The precedence order as the table it is. Every row sets the OS to something the expected outcome does *not*
     * agree with where that is possible, so a row can only pass because the rule under test won rather than because
     * the OS happened to match.
     */
    const PRECEDENCE = [
        {
            because: 'the operator default beats the OS preference',
            stored: undefined,
            operatorDefault: 'dark',
            os: 'light',
            mode: 'dark',
            resolved: 'dark',
        },
        {
            because: 'a stored choice beats the operator default',
            stored: 'light',
            operatorDefault: 'dark',
            os: 'dark',
            mode: 'light',
            resolved: 'light',
        },
        {
            // A stored `system` is a choice like any other, so it outranks the operator and hands control back to
            // the OS. This is the row that stops "no preference" and "chose System" being conflated.
            because: 'a stored system choice beats the operator default and returns to the OS',
            stored: 'system',
            operatorDefault: 'dark',
            os: 'light',
            mode: 'system',
            resolved: 'light',
        },
        {
            // A stored value outside the three supported modes is not a choice at all, so the operator default applies.
            because: 'an unsupported stored mode is not a choice',
            stored: 'systemDark',
            operatorDefault: 'dark',
            os: 'light',
            mode: 'dark',
            resolved: 'dark',
        },
    ] as const;

    for (const { because, stored, operatorDefault, os, mode, resolved } of PRECEDENCE) {
        test(`should resolve to ${mode} because ${because}`, async ({ mount, page }) => {
            await page.emulateMedia({ colorScheme: os });

            if (stored !== undefined) {
                await seed(page, { 'theme-mode': stored });
            }

            await mount(
                <ThemeProvider branding={branded(operatorDefault as BrandingTheme)}>
                    <Probe />
                </ThemeProvider>,
            );

            await expect(page.getByTestId('mode')).toHaveText(mode);
            await expect(page.getByTestId('resolved')).toHaveText(resolved);
        });
    }

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
        await page.getByTestId('set-dark').click();
        await expect(page.getByTestId('mode')).toHaveText('dark');

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-mode'))).toBe('dark');
    });

    test('should not persist a mode the user never chose', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('mode')).toHaveText('dark');

        expect(await page.evaluate(() => globalThis.localStorage.getItem('theme-mode'))).toBeNull();
    });

    test('should cycle on from the operator default rather than from system', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('light' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );
        await expect(page.getByTestId('mode')).toHaveText('light');

        await page.getByTestId('cycle').click();
        await expect(page.getByTestId('mode')).toHaveText('dark');

        await page.getByTestId('cycle').click();
        await expect(page.getByTestId('mode')).toHaveText('system');
    });

    test('should cache the operator default for the next load', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded('dark' as BrandingTheme)}>
                <Probe />
            </ThemeProvider>,
        );

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBe('dark');
        expect(await page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBe('dark');
    });

    test('should clear the cached operator default once branding is removed', async ({ mount, page }) => {
        await seed(page, { 'theme-operator-default': 'dark' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <Probe />
            </ThemeProvider>,
        );

        await expect.poll(async () => page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBeNull();
        expect(await page.evaluate(() => globalThis.localStorage.getItem('theme-operator-default'))).toBeNull();
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

        await expect(page.getByTestId('mode')).toHaveText('dark');
        await expect(page.getByTestId('resolved')).toHaveText('dark');
    });
});
