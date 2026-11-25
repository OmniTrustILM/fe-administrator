import { expect, test } from '../../../../../playwright/ct-test';
import AcmeProfileFormHarness from './AcmeProfileFormHarness';

test.describe('AcmeProfileForm renewal information', () => {
    test('keeps the stored renewal information when the RA profile list is empty', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.locator('#renewalInfoEnabled')).toBeChecked();
    });

    test('submits the stored renewal information once the RA profiles arrive after the profile', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness raProfilesDelayMs={800} profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.locator('#name')).toHaveValue('ACME profile');
        await page.locator('#description').fill('Edited');
        await page.getByRole('button', { name: 'Update' }).click();

        const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
        expect(request).toMatchObject({ description: 'Edited', renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 });
    });

    test('cannot be saved before the RA profiles let the form initialise', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled();
    });
});
