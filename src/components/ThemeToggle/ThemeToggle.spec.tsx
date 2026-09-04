import { expect, test } from '../../../playwright/ct-test';
import type { BrandingTheme } from 'types/branding';
import ThemeProvider from 'components/ThemeProvider';
import ThemeToggle from './index';

/**
 * Branding reaches the theme runtime as a default theme and nothing else. It does not add modes: the control offers
 * System, Light and Dark either way, and what changes is the palette those two render, which is the stylesheet's job.
 */
const branded = { defaultTheme: 'dark' as BrandingTheme };

test.describe('ThemeToggle', () => {
    test('should render with the system icon and label by default', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: System. Switch to Light.');
        await expect(toggle.locator('[data-theme-icon="system"].lucide-monitor')).toBeVisible();
    });

    test('should advance to light on the first click', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: Light. Switch to Dark.');
        await expect(toggle.locator('[data-theme-icon="light"].lucide-sun')).toBeVisible();
        await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('should advance to dark on the second click and darken the document', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await toggle.click();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: Dark. Switch to System.');
        await expect(toggle.locator('[data-theme-icon="dark"].lucide-moon')).toBeVisible();
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should return to system on the third click', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await toggle.click();
        await toggle.click();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: System. Switch to Light.');
    });

    test('should be reachable and operable by keyboard', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: Light. Switch to Dark.');
    });

    test('should show a keyboard focus indicator', async ({ mount, page }) => {
        await mount(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');
        await toggle.focus();

        const hasFocusIndicator = () =>
            toggle.evaluate(
                (element) =>
                    globalThis.getComputedStyle(element).outlineStyle !== 'none' ||
                    globalThis.getComputedStyle(element).boxShadow !== 'none',
            );

        await expect.poll(hasFocusIndicator).toBe(true);
        expect(await hasFocusIndicator()).toBe(true);
    });

    /**
     * On a branded instance the control starts on the operator's default rather than on System, because that is what
     * is actually being rendered. The OS is set to the opposite so the label can only be Dark if the operator default
     * won, not because the OS agreed with it.
     */
    test('should start on the operator default and cycle on from there', async ({ mount, page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await mount(
            <ThemeProvider branding={branded}>
                <ThemeToggle />
            </ThemeProvider>,
        );
        const toggle = page.getByTestId('theme-toggle');

        await expect(toggle).toHaveAttribute('aria-label', 'Theme: Dark. Switch to System.');
        await expect(page.locator('html')).toHaveClass(/dark/);

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-label', 'Theme: System. Switch to Light.');
        // System now follows the OS, which is light, so the operator default is genuinely out of the way.
        await expect(page.locator('html')).not.toHaveClass(/dark/);
    });
});
