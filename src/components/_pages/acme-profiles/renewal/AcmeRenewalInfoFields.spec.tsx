import { expect, test } from '../../../../../playwright/ct-test';
import AcmeRenewalInfoFieldsHarness from './AcmeRenewalInfoFieldsHarness';

test.describe('AcmeRenewalInfoFields', () => {
    test('a new profile is off with a retry-after of 21600', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness />);

        await expect(page.locator('#renewalInfoEnabled')).not.toBeChecked();
        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('21600');
        await expect(page.locator('#renewalInfoRetryAfter')).toBeDisabled();
    });

    test('shows the stored values', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 3600 }} />);

        await expect(page.locator('#renewalInfoEnabled')).toBeChecked();
        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('3600');
        await expect(page.locator('#renewalInfoRetryAfter')).toBeEnabled();
    });

    test('refuses 299 and accepts 300', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 3600 }} />);

        const input = page.locator('#renewalInfoRetryAfter');
        await input.click();
        await input.fill('299');
        await input.blur();
        await expect(page.getByText('Value must be between 300 and 86400')).toBeVisible();
        await expect(page.getByTestId('valid')).toHaveText('false');

        await input.fill('300');
        await expect(page.getByTestId('valid')).toHaveText('true');
        await expect(page.getByTestId('request')).toHaveText('{"renewalInfoEnabled":true,"renewalInfoRetryAfter":300}');
    });

    test('keeps the retry-after value when the switch is turned off', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await page.getByText('Enable renewal information').click();

        await expect(page.locator('#renewalInfoRetryAfter')).toBeDisabled();
        await expect(page.getByTestId('request')).toHaveText('{"renewalInfoEnabled":false,"renewalInfoRetryAfter":7200}');
    });

    test('restores the stored retry-after when switched off after an invalid edit', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        const input = page.locator('#renewalInfoRetryAfter');
        await input.click();
        await input.fill('');
        await expect(page.getByTestId('valid')).toHaveText('false');

        await page.getByText('Enable renewal information').click();

        await expect(page.getByTestId('valid')).toHaveText('true');
        await expect(input).toHaveValue('7200');
        await expect(page.getByTestId('request')).toHaveText('{"renewalInfoEnabled":false,"renewalInfoRetryAfter":7200}');
    });

    test('keeps a valid edit when switched off', async ({ mount, page }) => {
        await mount(<AcmeRenewalInfoFieldsHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        const input = page.locator('#renewalInfoRetryAfter');
        await input.click();
        await input.fill('600');
        await page.getByText('Enable renewal information').click();

        await expect(page.getByTestId('request')).toHaveText('{"renewalInfoEnabled":false,"renewalInfoRetryAfter":600}');
    });
});
