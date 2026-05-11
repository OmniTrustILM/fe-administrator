import { test, expect } from '../../../playwright/ct-test';
import Dropdown from './index';

test.describe('Dropdown visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'visual tests run on chromium only');

    test('closed', async ({ mount }) => {
        const items = [
            { title: 'Item 1', onClick: () => {} },
            { title: 'Item 2', onClick: () => {} },
        ];
        const component = await mount(
            <div style={{ padding: 40 }}>
                <Dropdown title="Dropdown" items={items} />
            </div>,
        );
        await expect(component).toHaveScreenshot('dropdown-closed.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open with items', async ({ mount, page }) => {
        const items = [
            { title: 'Item 1', onClick: () => {} },
            { title: 'Item 2', onClick: () => {} },
            { title: 'Item 3', onClick: () => {} },
        ];
        await mount(
            <div style={{ padding: 40 }}>
                <Dropdown title="Dropdown" items={items} />
            </div>,
        );
        await page.getByRole('button', { name: 'Dropdown' }).click();
        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot('dropdown-open-items.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open with custom menu', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 40 }}>
                <Dropdown
                    title="Dropdown"
                    menu={
                        <div style={{ padding: 12 }}>
                            <p>Custom menu content</p>
                            <button type="button">Custom action</button>
                        </div>
                    }
                />
            </div>,
        );
        await page.getByRole('button', { name: 'Dropdown' }).click();
        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot('dropdown-open-custom-menu.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('disabled', async ({ mount }) => {
        const items = [{ title: 'Item 1', onClick: () => {} }];
        const component = await mount(
            <div style={{ padding: 40 }}>
                <Dropdown title="Dropdown" items={items} disabled={true} />
            </div>,
        );
        await expect(component).toHaveScreenshot('dropdown-disabled.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });
});
