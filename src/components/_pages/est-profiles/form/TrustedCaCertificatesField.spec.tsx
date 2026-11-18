import { expect, test } from '../../../../../playwright/ct-test';
import TrustedCaCertificatesFieldHarness from './TrustedCaCertificatesFieldHarness';

test.describe('TrustedCaCertificatesField', () => {
    test('offers the listed CA certificates with their subject and serial number', async ({ mount, page }) => {
        await mount(<TrustedCaCertificatesFieldHarness />);

        await page.getByTestId('trustedCaCertificates-trigger').click();

        await expect(page.getByRole('option', { name: /Root CA/ })).toContainText('CN=Root CA · ca-1-serial');
        await expect(page.getByRole('option', { name: /Issuing CA/ })).toBeVisible();
    });

    test('selects certificates and removes them again', async ({ mount, page }) => {
        await mount(<TrustedCaCertificatesFieldHarness />);

        await page.getByTestId('trustedCaCertificates-trigger').click();
        await page.getByRole('option', { name: /Issuing CA/ }).click();
        await page.getByRole('option', { name: /Root CA/ }).click();
        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(['ca-2', 'ca-1']));
        await page.keyboard.press('Escape');

        await page.getByLabel('Remove Issuing CA', { exact: true }).click();

        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(['ca-1']));
    });

    test('a bound certificate outside the CA search is shown by name, cannot be picked again, and can be removed', async ({
        mount,
        page,
    }) => {
        await mount(<TrustedCaCertificatesFieldHarness initialValue={['leaf-1']} bound={[{ uuid: 'leaf-1', name: 'Leaf certificate' }]} />);

        await page.getByTestId('trustedCaCertificates-trigger').click();
        await expect(page.getByRole('option', { name: /Leaf certificate/ })).toHaveAttribute('aria-disabled', 'true');
        await expect(page.getByRole('option', { name: /Leaf certificate/ })).toContainText('Not a listed CA certificate');
        await page.keyboard.press('Escape');

        await page.getByLabel('Remove Leaf certificate', { exact: true }).click();

        await expect(page.getByTestId('value')).toHaveText('[]');
    });

    test('a bound certificate without a known name is shown by uuid', async ({ mount, page }) => {
        await mount(<TrustedCaCertificatesFieldHarness initialValue={['missing-uuid']} />);

        await expect(page.getByTestId('trustedCaCertificates')).toContainText('missing-uuid');
    });

    test('shows the listing error and the hint', async ({ mount, page }) => {
        await mount(<TrustedCaCertificatesFieldHarness listError="Failed to list CA certificates" />);

        await expect(page.getByTestId('trustedCaCertificates-list-error')).toHaveText('Failed to list CA certificates');
        await expect(page.getByTestId('trustedCaCertificates-hint')).toContainText('root and intermediate CA certificates');
    });

    test('a disabled field cannot be opened', async ({ mount, page }) => {
        await mount(<TrustedCaCertificatesFieldHarness disabled />);

        await expect(page.getByTestId('trustedCaCertificates-trigger')).toBeDisabled();
    });
});
