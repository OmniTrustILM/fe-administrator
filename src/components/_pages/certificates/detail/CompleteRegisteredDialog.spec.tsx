import { test, expect } from '../../../../../playwright/ct-test';
import { CompleteRegisteredDialogTestWrapper } from './CompleteRegisteredDialogTestWrapper';

test.describe('CompleteRegisteredDialog', () => {
    test('renders the Challenge input and CSR upload input', async ({ mount, page }) => {
        await mount(<CompleteRegisteredDialogTestWrapper />);

        await expect(page.locator('#completeAuthorizationSecret')).toBeVisible();
        await expect(page.locator('#completeAuthorizationSecret')).toHaveAttribute('type', 'password');
        await expect(page.locator('#completeCsrUpload__fileUpload__fileContent')).toBeVisible();
    });

    test('submit is disabled until both challenge and CSR content are provided', async ({ mount, page }) => {
        await mount(<CompleteRegisteredDialogTestWrapper />);

        const submitButton = page.getByTestId('completeRegisteredSubmit');
        await expect(submitButton).toBeDisabled();

        await page.locator('#completeAuthorizationSecret').fill('super-secret-challenge');
        await expect(submitButton).toBeDisabled();

        await page.locator('#completeCsrUpload__fileUpload__fileContent').fill('LS0tLS1CRUdJTi=');
        await expect(submitButton).toBeEnabled();
    });
});
