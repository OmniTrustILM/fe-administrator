import { expect, test } from '../../../playwright/ct-test';
import { PageHeaderHarness } from './PageHeader.harness';

const MENU = [
    { id: 'import', label: 'Import', icon: 'upload' as const },
    { id: 'archive', label: 'Archive', icon: 'archive' as const, disabled: true, disabledReason: 'Select one or more certificates' },
    { id: 'delete', label: 'Delete', icon: 'trash' as const, destructive: true },
    { id: 'export', label: 'Export', icon: 'download' as const },
];

test.describe('PageHeader', () => {
    test('shows the breadcrumbs, then the title with the actions beside it', async ({ mount, page }) => {
        await mount(
            <PageHeaderHarness
                title="Certificates Inventory"
                primaryAction={{ id: 'create', label: 'Create', icon: 'plus' }}
                actions={MENU}
            />,
        );

        await expect(page.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/inventory');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificates Inventory');
        const actions = page.getByTestId('page-header-actions');
        await expect(actions.getByRole('button', { name: 'Create' })).toBeVisible();
        await expect(actions.getByRole('button', { name: 'More actions' })).toBeVisible();

        const titleBox = await page.getByRole('heading', { level: 1 }).boundingBox();
        const actionsBox = await actions.boundingBox();
        expect(actionsBox?.x).toBeGreaterThan(titleBox?.x ?? Number.POSITIVE_INFINITY);
    });

    test('runs the primary action with its button as the anchor', async ({ mount, page }) => {
        await mount(<PageHeaderHarness primaryAction={{ id: 'create', label: 'Create', icon: 'plus' }} />);

        await page.getByRole('button', { name: 'Create' }).click();

        await expect(page.getByTestId('ran')).toHaveText('create:BUTTON');
        await expect(page.getByRole('button', { name: 'More actions' })).toHaveCount(0);
    });

    test('renders no action area when the page has no actions', async ({ mount, page }) => {
        await mount(<PageHeaderHarness title="Certificates" />);

        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificates');
        await expect(page.getByTestId('page-header-actions')).toHaveCount(0);
    });
});

test.describe('ActionsMenu', () => {
    test('lists each entry with an icon and a label, destructive entries last after a separator', async ({ mount, page }) => {
        await mount(<PageHeaderHarness actions={MENU} />);
        await page.getByRole('button', { name: 'More actions' }).click();

        const items = page.getByRole('menuitem');
        await expect(items).toHaveCount(4);
        await expect(items.nth(0)).toContainText('Import');
        await expect(items.nth(2)).toContainText('Export');
        await expect(items.nth(3)).toContainText('Delete');
        for (const index of [0, 1, 2, 3]) {
            await expect(items.nth(index).locator('svg')).toHaveCount(1);
        }
        await expect(page.getByRole('separator')).toHaveCount(1);

        const separatorBox = await page.getByRole('separator').boundingBox();
        const deleteBox = await items.nth(3).boundingBox();
        expect(deleteBox?.y).toBeGreaterThan(separatorBox?.y ?? Number.POSITIVE_INFINITY);
        await expect(items.nth(3)).toHaveClass(/text-danger/);
        await expect(items.nth(0)).not.toHaveClass(/text-danger/);
    });

    test('shows why an entry is disabled and does not run it', async ({ mount, page }) => {
        await mount(<PageHeaderHarness actions={MENU} />);
        await page.getByRole('button', { name: 'More actions' }).click();

        const archive = page.getByRole('menuitem', { name: /Archive/ });
        await expect(archive).toHaveAttribute('aria-disabled', 'true');
        await expect(archive).toContainText('Select one or more certificates');

        await archive.dispatchEvent('click');

        await expect(page.getByRole('menu')).toBeVisible();
        await expect(page.getByTestId('ran')).toHaveText('');
    });

    test('is operable from the keyboard, reaching disabled entries too', async ({ mount, page }) => {
        await mount(<PageHeaderHarness actions={MENU} />);
        await page.getByRole('button', { name: 'More actions' }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('menuitem', { name: 'Import' })).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('menuitem', { name: /Archive/ })).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('menuitem', { name: 'Export' })).toBeFocused();
        await page.keyboard.press('Enter');

        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(page.getByTestId('ran')).toHaveText('export:BUTTON');
    });
});
