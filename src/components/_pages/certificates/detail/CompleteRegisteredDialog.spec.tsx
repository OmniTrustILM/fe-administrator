import { test, expect } from '../../../../../playwright/ct-test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { CompleteRegisteredDialogTestWrapper } from './CompleteRegisteredDialogTestWrapper';

const csrDataDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'dataField',
    uuid: 'csr-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Data Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

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

    test('keeps the modal open after submitting instead of closing optimistically', async ({ mount, page }) => {
        await mount(<CompleteRegisteredDialogTestWrapper />);

        await page.locator('#completeAuthorizationSecret').fill('super-secret-challenge');
        await page.locator('#completeCsrUpload__fileUpload__fileContent').fill('LS0tLS1CRUdJTi=');
        await page.getByTestId('completeRegisteredSubmit').click();

        // The dialog must not close on submit — closing happens only on success (via redirect) or cancel.
        await expect(page.getByTestId('dialog-closed')).toHaveCount(0);
        await expect(page.locator('#completeAuthorizationSecret')).toBeVisible();
        await expect(page.locator('#completeAuthorizationSecret')).toHaveValue('super-secret-challenge');
    });

    test('closes explicitly on a confirmed success instead of relying on the redirect', async ({ mount, page }) => {
        // Start mid-request; when isIssuing flips false with no error the completion succeeded and the
        // dialog must close itself — the success redirect is a same-URL no-op when the issued certificate
        // keeps the pre-registration uuid, so it cannot be relied on to unmount the dialog.
        await mount(
            <CompleteRegisteredDialogTestWrapper
                preloadedState={{ certificates: { ...testInitialState.certificates, isIssuing: true } }}
            />,
        );

        await expect(page.getByTestId('dialog-closed')).toHaveCount(0);

        await page.getByTestId('simulate-success').click();

        // The wrapper swaps the dialog body for an (empty) dialog-closed marker once onCancel fires.
        await expect(page.getByTestId('dialog-closed')).toBeAttached();
        await expect(page.getByTestId('completeRegisteredSubmit')).toHaveCount(0);
    });

    test('surfaces the backend error inline when completion fails', async ({ mount, page }) => {
        await mount(
            <CompleteRegisteredDialogTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, issueErrorMessage: 'Invalid authorization secret' },
                }}
            />,
        );

        const errorPanel = page.getByTestId('completeRegisteredError');
        await expect(errorPanel).toBeVisible();
        await expect(errorPanel).toContainText('Invalid authorization secret');
    });

    test('disables the Complete button and shows progress while issuing', async ({ mount, page }) => {
        await mount(
            <CompleteRegisteredDialogTestWrapper
                preloadedState={{ certificates: { ...testInitialState.certificates, isIssuing: true } }}
            />,
        );

        await page.locator('#completeAuthorizationSecret').fill('super-secret-challenge');
        await page.locator('#completeCsrUpload__fileUpload__fileContent').fill('LS0tLS1CRUdJTi=');

        const submitButton = page.getByTestId('completeRegisteredSubmit');
        await expect(submitButton).toBeDisabled();
        await expect(submitButton).toContainText('Completing');
    });

    test('existing-key path renders the resolved request-attribute descriptors as fields', async ({ mount, page }) => {
        // The dialog loads the RA profile's request attributes (getCsrAttributes) and, on the existing-key
        // path, renders them so the backend can build the CSR from the selected key plus this identity.
        await mount(
            <CompleteRegisteredDialogTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, csrAttributeDescriptors: [csrDataDescriptor] },
                }}
            />,
        );

        // Not shown on the CSR-upload (default) path.
        await expect(page.getByTestId('text-input-__attributes__csrAttributes__.dataField')).toHaveCount(0);

        await page.getByTestId('completeKeySource-trigger').click();
        await page.getByRole('option', { name: 'Existing Key' }).click();

        await expect(page.getByTestId('text-input-__attributes__csrAttributes__.dataField')).toBeVisible({ timeout: 15000 });
    });
});
