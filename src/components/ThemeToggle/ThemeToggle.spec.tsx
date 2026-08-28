import { expect, test } from '../../../playwright/ct-test';
import type { BrandingTheme } from 'types/branding';
import ThemeProvider from 'components/ThemeProvider';
import ThemeToggle from './index';

const branded = { configured: true, defaultTheme: 'light' as BrandingTheme };
const unbranded = { configured: false };

test.describe('ThemeToggle', () => {
    test('should show the current mode on the trigger', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await expect(trigger).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-label', 'Theme: Light');
        await expect(trigger.locator('[data-theme-icon="light"].lucide-sun')).toBeVisible();
    });

    test('should show a keyboard focus indicator on the trigger', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');
        await trigger.focus();

        await expect
            .poll(async () =>
                trigger.evaluate(
                    (element) =>
                        globalThis.getComputedStyle(element).outlineStyle !== 'none' ||
                        globalThis.getComputedStyle(element).boxShadow !== 'none',
                ),
            )
            .toBe(true);
    });

    test('should offer only Light and Dark without branding', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        await page.getByTestId('theme-toggle').locator('button').click();

        await expect(page.getByTestId('theme-option-light')).toBeVisible();
        await expect(page.getByTestId('theme-option-dark')).toBeVisible();
        await expect(page.getByTestId('theme-option-systemLight')).toHaveCount(0);
        await expect(page.getByTestId('theme-option-systemDark')).toHaveCount(0);
    });

    test('should offer all four modes once branding is configured', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        await page.getByTestId('theme-toggle').locator('button').click();

        await expect(page.getByRole('menuitemradio')).toHaveCount(4);
        await expect(page.getByTestId('theme-option-systemLight')).toBeVisible();
        await expect(page.getByTestId('theme-option-systemDark')).toBeVisible();
    });

    test('should mark the active mode', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        await page.getByTestId('theme-toggle').locator('button').click();

        await expect(page.getByTestId('theme-option-systemLight')).toHaveAttribute('aria-checked', 'true');
        await expect(page.getByTestId('theme-option-dark')).toHaveAttribute('aria-checked', 'false');
    });

    test('should apply the mode the user selects', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await trigger.click();
        await page.getByTestId('theme-option-dark').click();

        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(trigger).toHaveAttribute('aria-label', 'Theme: Dark');
        await expect(trigger.locator('[data-theme-icon="dark"].lucide-moon')).toBeVisible();
    });

    test('should select a branded mode and report it on the trigger', async ({ mount, page }) => {
        await mount(
            <ThemeProvider branding={branded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await trigger.click();
        await page.getByTestId('theme-option-systemDark').click();

        await expect(trigger).toHaveAttribute('aria-label', 'Theme: System Dark');
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    /**
     * Arrow and typeahead navigation *inside* an open Radix menu does not move focus under Playwright CT - bare
     * `DropdownMenu` behaves the same way as this component and as the shared `Dropdown`, so it is an artefact of the
     * environment rather than something to pin here. What is asserted is the part that does work and is the actual
     * accessibility contract: the trigger opens by keyboard, focus lands on the active option, Enter activates it and
     * Escape dismisses without changing anything.
     */
    test('should open by keyboard with focus in the menu', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={branded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await trigger.focus();
        await page.keyboard.press('Enter');

        // Located by CSS, not by role: while the menu is open Radix marks the rest of the page aria-hidden, which
        // takes the trigger out of the accessibility tree and with it any getByRole locator.
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        // Opening focuses the first option rather than the checked one, which is Radix's behaviour, not a choice made
        // here. What matters for a screen reader is that focus enters the menu and the active mode is marked.
        await expect(page.getByTestId('theme-option-light')).toBeFocused();
        await expect(page.getByTestId('theme-option-systemLight')).toHaveAttribute('aria-checked', 'true');
    });

    test('should activate the focused option with Enter', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('theme-option-light')).toBeFocused();
        await page.keyboard.press('Enter');

        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(trigger).toHaveAttribute('aria-label', 'Theme: Light');
    });

    test('should dismiss with Escape without changing the theme', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={unbranded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const trigger = page.getByTestId('theme-toggle').locator('button');

        await trigger.click();
        await expect(page.getByTestId('theme-option-dark')).toBeVisible();
        await page.keyboard.press('Escape');

        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(trigger).toHaveAttribute('aria-label', 'Theme: Light');
        await expect(page.locator('html')).not.toHaveClass(/dark/);
    });
});
