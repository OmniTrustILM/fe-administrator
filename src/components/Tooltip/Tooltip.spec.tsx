import { test, expect } from '../../../playwright/ct-test';
import Tooltip from './index';

test.describe('Tooltip', () => {
    test('renders trigger children', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip text">
                <button type="button">Hover me</button>
            </Tooltip>,
        );
        await expect(component.getByText('Hover me')).toBeVisible();
    });

    test('shows content on hover', async ({ mount, page }) => {
        await mount(
            <Tooltip content="Tooltip text">
                <button type="button">Hover me</button>
            </Tooltip>,
        );
        await page.getByRole('button', { name: 'Hover me' }).hover();
        await expect(page.getByRole('tooltip')).toBeVisible();
        await expect(page.getByRole('tooltip')).toHaveText('Tooltip text');
    });

    test('renders ReactNode content', async ({ mount, page }) => {
        await mount(
            <Tooltip content={<span>React node content</span>}>
                <button type="button">Hover</button>
            </Tooltip>,
        );
        await page.getByRole('button', { name: 'Hover' }).hover();
        await expect(page.getByRole('tooltip')).toContainText('React node content');
    });

    test('does not show content when disabled', async ({ mount, page }) => {
        await mount(
            <Tooltip content="Tooltip text" disabled={true}>
                <button type="button">Hover me</button>
            </Tooltip>,
        );
        await page.getByRole('button', { name: 'Hover me' }).hover({ force: true });
        await page.waitForTimeout(800);
        await expect(page.getByRole('tooltip')).toHaveCount(0);
    });

    test('content has data-side="bottom" by default', async ({ mount, page }) => {
        await mount(
            <Tooltip content="Tooltip text">
                <button type="button">Hover me</button>
            </Tooltip>,
        );
        await page.getByRole('button', { name: 'Hover me' }).hover();
        await expect(page.locator('[data-side="bottom"]')).toBeVisible();
    });

    test('applies triggerClassName on wrapping span', async ({ mount }) => {
        const component = await mount(
            <Tooltip content="Tooltip text" triggerClassName="custom-trigger">
                <button type="button">Trigger</button>
            </Tooltip>,
        );
        await expect(component.locator('.custom-trigger')).toBeVisible();
    });
});
