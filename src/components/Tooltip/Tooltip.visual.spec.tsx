import { test, expect } from '../../../playwright/ct-test';
import Tooltip from './index';

test.describe('Tooltip visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'visual tests run on chromium only');

    test('resting state', async ({ mount }) => {
        const component = await mount(
            <div style={{ padding: 40 }}>
                <Tooltip content="Tooltip text">
                    <button type="button">Hover me</button>
                </Tooltip>
            </div>,
        );
        await expect(component).toHaveScreenshot('tooltip-resting.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('hovered state', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 40 }}>
                <Tooltip content="Tooltip text">
                    <button type="button">Hover me</button>
                </Tooltip>
            </div>,
        );
        await page.getByRole('button', { name: 'Hover me' }).hover();
        await page.waitForTimeout(600);
        await expect(page).toHaveScreenshot('tooltip-hovered.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('disabled state', async ({ mount, page }) => {
        const component = await mount(
            <div style={{ padding: 40 }}>
                <Tooltip content="Tooltip text" disabled={true}>
                    <button type="button">Hover me</button>
                </Tooltip>
            </div>,
        );
        await page.getByRole('button', { name: 'Hover me' }).hover({ force: true });
        await page.waitForTimeout(600);
        await expect(component).toHaveScreenshot('tooltip-disabled.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });
});
