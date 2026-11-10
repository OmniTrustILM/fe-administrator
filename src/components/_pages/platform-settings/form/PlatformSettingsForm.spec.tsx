import type { Page } from '@playwright/test';
import { test, expect } from '../../../../../playwright/ct-test';
import { PlatformSettingsFormTestWrapper } from './PlatformSettingsFormTestWrapper';

const storedSettings = (overrides = {}) => ({
    settings: {
        platformSettings: { signing: { maxItemsPerRequest: 250 } },
        isFetchingPlatform: false,
        isUpdatingPlatform: false,
        ...overrides,
    },
});

const saveSigningLimit = async (page: Page, value: string) => {
    await page.getByRole('tab', { name: 'Signing' }).click();
    const field = page.locator('#maxItemsPerRequest');
    await field.click();
    await field.fill(value);
    await field.blur();
    await page.getByRole('button', { name: 'Save' }).click();
};

test.describe('PlatformSettingsForm', () => {
    test('announces a failed update inside the dialog', async ({ mount, page }) => {
        await mount(<PlatformSettingsFormTestWrapper preloadedState={storedSettings()} />);

        await saveSigningLimit(page, '500');
        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByRole('alert')).toHaveText('Failed to update platform settings');
    });

    test('shows each message of a failed update on its own line', async ({ mount, page }) => {
        const twoRefusals = 'Failed to update platform settings (422): first refusal\nsecond refusal';
        await mount(<PlatformSettingsFormTestWrapper preloadedState={storedSettings()} failureMessage={twoRefusals} />);

        await saveSigningLimit(page, '500');
        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByRole('alert')).toHaveJSProperty('innerText', twoRefusals);
    });

    test('withdraws the failure while the next update is in flight', async ({ mount, page }) => {
        await mount(<PlatformSettingsFormTestWrapper preloadedState={storedSettings()} />);
        await saveSigningLimit(page, '500');
        await page.getByTestId('simulate-update-failure').click();
        await expect(page.getByRole('alert')).toBeVisible();

        await saveSigningLimit(page, '600');

        await expect(page.getByTestId('platform-settings-update-error')).toBeHidden();
    });

    test('shows no failure of an update that finished before the form opened', async ({ mount, page }) => {
        const earlierError = 'Failed to update platform settings';
        await mount(<PlatformSettingsFormTestWrapper preloadedState={storedSettings({ platformSettingsUpdateError: earlierError })} />);

        await expect(page.getByRole('tab', { name: 'Signing' })).toBeVisible();
        await expect(page.getByTestId('platform-settings-update-error')).toBeHidden();
    });
});
