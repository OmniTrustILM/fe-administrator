import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import PlatformSettingsDetailWithStore from './PlatformSettingsDetailWithStore';

test.describe('PlatformSettingsDetail actions by permission', () => {
    test('disables Edit and leaves out Appearance for a user who may only view settings', async ({ mount, page }) => {
        await mount(<PlatformSettingsDetailWithStore settingsActions={[ResourceAction.List, ResourceAction.Detail]} />);

        await expect(page.getByTestId('pencil-button')).toBeDisabled();
        await expect(page.getByRole('tab', { name: 'Utils' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Appearance' })).toHaveCount(0);
    });

    test('offers Edit and Appearance to a user holding every grant on settings', async ({ mount, page }) => {
        await mount(<PlatformSettingsDetailWithStore settingsActions={Object.values(ResourceAction)} />);

        await expect(page.getByTestId('pencil-button')).toBeEnabled();
        await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible();
    });
});
