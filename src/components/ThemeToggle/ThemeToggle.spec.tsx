import { expect, test } from '../../../playwright/ct-test';
import ThemeProvider from 'components/ThemeProvider';
import ThemeToggle from './index';

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
});
