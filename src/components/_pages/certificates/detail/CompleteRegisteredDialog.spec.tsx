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

    test('key-source toggle switches between CSR upload and existing-key selectors', async ({ mount, page }) => {
        await mount(<CompleteRegisteredDialogTestWrapper />);

        // Default (Upload CSR): CSR input visible, token-profile/key selectors absent.
        await expect(page.locator('#completeCsrUpload__fileUpload__fileContent')).toBeVisible();
        await expect(page.getByTestId('select-tokenProfileUuid-trigger')).toHaveCount(0);

        await page.getByTestId('completeKeySource-trigger').click();
        await page.getByRole('option', { name: 'Existing Key' }).click();

        // Existing key: token-profile selector visible, CSR input hidden. Key selector stays hidden
        // until a token profile is chosen (RenderRequestKey renders null with no selection).
        await expect(page.locator('#completeCsrUpload__fileUpload__fileContent')).toHaveCount(0);
        await expect(page.getByTestId('select-tokenProfileUuid-trigger')).toBeVisible();
        await expect(page.getByTestId('select-keyUuid-trigger')).toHaveCount(0);

        // Challenge stays required and write-only in this mode too.
        await expect(page.locator('#completeAuthorizationSecret')).toHaveAttribute('type', 'password');
        await expect(page.getByTestId('completeRegisteredSubmit')).toBeDisabled();
    });

    test('selecting a token profile in existing-key mode reveals the key selector', async ({ mount, page }) => {
        await mount(
            <CompleteRegisteredDialogTestWrapper
                preloadedState={{
                    tokenprofiles: { tokenProfiles: [{ uuid: 'token-profile-uuid', name: 'Test Token Profile' }] } as any,
                }}
            />,
        );

        await page.getByTestId('completeKeySource-trigger').click();
        await page.getByRole('option', { name: 'Existing Key' }).click();

        await page.getByTestId('select-tokenProfileUuid-trigger').click();
        await page.getByRole('option', { name: 'Test Token Profile' }).click();

        await expect(page.getByTestId('select-keyUuid-trigger')).toBeVisible();
    });
});
