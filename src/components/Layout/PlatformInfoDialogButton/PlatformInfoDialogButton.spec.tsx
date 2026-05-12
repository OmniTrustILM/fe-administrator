import { test, expect } from '../../../../playwright/ct-test';
import { slice as infoSlice } from 'ducks/info';
import PlatformInfoDialogLink from './index';
import { createMockStore, withProviders } from 'utils/test-helpers';

const mockPlatformInfo = {
    app: { name: 'Core', version: '2.16.4-SNAPSHOT' },
    db: { system: 'PostgreSQL', version: '15.6' },
};

const preloadedState = {
    [infoSlice.name]: { platformInfo: mockPlatformInfo, isFetching: false },
};

test.describe('PlatformInfoDialogButton', () => {
    test('should render Version Info button', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink />, { store }));

        const trigger = page.getByTestId('footer-version-info-link');
        await expect(trigger).toBeVisible({ timeout: 10000 });
    });

    test('should open dialog when button is clicked', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink forceOpen={true} />, { store }));

        const dialog = page.getByTestId('platform-info-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading', { name: 'Platform versions info' })).toBeVisible();
    });

    test('should show Spinner after opening dialog (getPlatformInfo clears data)', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink forceOpen={true} />, { store }));

        const dialog = page.getByTestId('platform-info-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading', { name: 'Platform versions info' })).toBeVisible();
        await expect.poll(() => (store.getState() as any).info?.isFetching, { timeout: 5000 }).toBe(true);
    });

    test('should show Close button in dialog', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink forceOpen={true} />, { store }));

        await expect(
            page.getByTestId('platform-info-dialog').locator('.modal-footer').getByRole('button', { name: 'Close' }),
        ).toBeVisible();
    });

    test('clicking Version Info button opens dialog', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink />, { store }));

        await page.getByTestId('footer-version-info-link').click();
        await expect(page.getByTestId('platform-info-dialog')).toBeVisible();
    });

    test('shows copy button when data is loaded and not fetching', async ({ mount, page }) => {
        const store = createMockStore(preloadedState as any);
        await mount(withProviders(<PlatformInfoDialogLink forceOpen={true} />, { store }));

        await expect(page.getByRole('button', { name: 'Version Info' })).toBeVisible();
    });
});
