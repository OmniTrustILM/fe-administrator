import { test, expect } from '../../../playwright/ct-test';
import Dropdown from './index';
import { DropdownCloseFromInsideMenuHarness } from './Dropdown.harness';

test.describe('Dropdown', () => {
    test('renders trigger button with title', async ({ mount }) => {
        const component = await mount(<Dropdown title="Dropdown" items={[]} />);
        await expect(component.getByRole('button', { name: 'Dropdown' })).toBeVisible();
    });

    test('opens menu on click', async ({ mount, page }) => {
        const items = [
            { title: 'Item 1', onClick: () => {} },
            { title: 'Item 2', onClick: () => {} },
        ];
        await mount(<Dropdown title="Dropdown" items={items} />);
        await page.getByRole('button', { name: 'Dropdown' }).click();
        await expect(page.locator('button[data-state="open"]')).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Item 1' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Item 2' })).toBeVisible();
    });

    test('calls item onClick when selected', async ({ mount, page }) => {
        let item1Clicked = false;
        const items = [
            {
                title: 'Item 1',
                onClick: () => {
                    item1Clicked = true;
                },
            },
            { title: 'Item 2', onClick: () => {} },
        ];
        await mount(<Dropdown title="Dropdown" items={items} />);
        await page.getByRole('button', { name: 'Dropdown' }).click();
        await page.getByRole('menuitem', { name: 'Item 1' }).click();
        expect(item1Clicked).toBe(true);
    });

    test('renders custom menu ReactNode alongside items', async ({ mount, page }) => {
        const items = [{ title: 'Item 1', onClick: () => {} }];
        await mount(<Dropdown title="Dropdown" items={items} menu={<div>Custom menu content</div>} />);
        await page.getByRole('button', { name: 'Dropdown' }).click();
        await expect(page.getByText('Custom menu content')).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Item 1' })).toBeVisible();
    });

    test('does not open when disabled', async ({ mount, page }) => {
        const items = [{ title: 'Item 1', onClick: () => {} }];
        await mount(<Dropdown title="Dropdown" items={items} disabled={true} />);
        const trigger = page.getByRole('button', { name: 'Dropdown' });
        await expect(trigger).toBeDisabled();
        await trigger.click({ force: true }).catch(() => {});
        await expect(page.getByRole('menuitem')).toHaveCount(0);
    });

    test('hideArrow=true removes chevron svg', async ({ mount }) => {
        const component = await mount(<Dropdown title="Dropdown" items={[]} hideArrow={true} />);
        await expect(component.getByRole('button', { name: 'Dropdown' }).locator('svg')).toHaveCount(0);
    });

    test('btnStyle="transparent" applies transparent class', async ({ mount }) => {
        const component = await mount(<Dropdown title="Dropdown" items={[]} btnStyle="transparent" />);
        await expect(component.getByRole('button', { name: 'Dropdown' })).toHaveClass(/bg-transparent/);
    });

    test('onOpenChange(false) from inside the menu closes the dropdown', async ({ mount, page }) => {
        await mount(<DropdownCloseFromInsideMenuHarness />);
        const trigger = page.getByRole('button', { name: 'Dropdown' });
        await trigger.click();
        await expect(page.locator('button[data-state="open"]')).toBeVisible();
        await page.getByTestId('close-from-inside').click();
        await expect(page.locator('button[data-state="open"]')).toHaveCount(0);
    });
});
