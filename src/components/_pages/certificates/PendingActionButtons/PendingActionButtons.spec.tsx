import { test, expect } from '@playwright/experimental-ct-react';
import { CertificateState } from 'types/openapi';
import PendingActionButtonsWithStore from './PendingActionButtonsWithStore';

const buildCert = (state: CertificateState, raProfile: any = { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' }) => ({
    uuid: 'cert-1',
    state,
    raProfile: raProfile as any,
});

const mountPendingButtons = (mount: any, state: CertificateState, preloadedState?: any) =>
    mount(<PendingActionButtonsWithStore preloadedState={preloadedState} certificate={buildCert(state)} />);

test.describe('PendingActionButtons', () => {
    test('renders nothing for non-pending state', async ({ mount }) => {
        const c = await mountPendingButtons(mount, CertificateState.Issued);
        await expect(c.locator('button')).toHaveCount(0);
    });

    test('renders nothing when raProfile is undefined', async ({ mount }) => {
        const c = await mount(
            <PendingActionButtonsWithStore certificate={{ uuid: 'cert-1', state: CertificateState.PendingIssue, raProfile: undefined }} />,
        );
        await expect(c.locator('button')).toHaveCount(0);
    });

    test('PENDING_ISSUE renders Finalize and Cancel buttons (no Confirm Revoke)', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await expect(page.getByRole('button', { name: /finalize issue/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel pending operation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /confirm revocation/i })).toHaveCount(0);
    });

    test('PENDING_REVOKE renders Confirm Revoke and Cancel buttons (no Finalize)', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingRevoke);
        await expect(page.getByRole('button', { name: /confirm revocation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel pending operation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /finalize issue/i })).toHaveCount(0);
    });

    test('clicking Finalize opens the upload dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /finalize issue/i }).click();
        // The CertificateUploadDialog renders a "Cancel" button + a Finalize OK button.
        await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
    });

    test('Finalize Issue dialog does not show the Custom Attributes section', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /finalize issue/i }).click();
        await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
        await expect(page.getByRole('tab', { name: /custom attributes/i })).toHaveCount(0);
        await expect(page.getByText(/custom attributes/i)).toHaveCount(0);
    });

    test('clicking Confirm Revoke opens the confirm dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingRevoke);
        await page.getByRole('button', { name: /confirm revocation/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toBeVisible();
    });

    test('clicking Cancel opens the cancel-pending dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /cancel pending operation/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toBeVisible();
    });

    test('button is disabled while the matching action is in flight for that UUID', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue, { finalizingIssueCertificateUuids: ['cert-1'] });
        const btn = page.getByRole('button', { name: /finalize issue/i });
        await expect(btn).toBeDisabled();
    });

    test('a different UUID in flight does not disable this row', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue, { finalizingIssueCertificateUuids: ['some-other-uuid'] });
        const btn = page.getByRole('button', { name: /finalize issue/i });
        await expect(btn).toBeEnabled();
    });

    test("clicking 'Keep pending' inside the cancel-pending dialog dismisses the dialog", async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /cancel pending operation/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toBeVisible();
        await page.getByRole('button', { name: /keep pending/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toHaveCount(0);
    });

    test('clicking Confirm inside the confirm-revoke dialog dismisses the dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingRevoke);
        await page.getByRole('button', { name: /confirm revocation/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toBeVisible();
        await page.getByRole('button', { name: /^confirm$/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toHaveCount(0);
    });

    test("clicking 'Cancel operation' inside the cancel-pending dialog dismisses the dialog", async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /cancel pending operation/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toBeVisible();
        await page.getByRole('button', { name: /cancel operation/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toHaveCount(0);
    });

    test('clicking close (×) dismisses the cancel-pending dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByRole('button', { name: /cancel pending operation/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toBeVisible();
        await page.getByRole('button', { name: /^close$/i }).click();
        await expect(page.getByText(/reason \(optional\)/i)).toHaveCount(0);
    });

    test('clicking Cancel inside the confirm-revoke dialog dismisses the dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingRevoke);
        await page.getByRole('button', { name: /confirm revocation/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toBeVisible();
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toHaveCount(0);
    });

    test('clicking close (×) dismisses the confirm-revoke dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingRevoke);
        await page.getByRole('button', { name: /confirm revocation/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toBeVisible();
        await page.getByRole('button', { name: /^close$/i }).click();
        await expect(page.getByText(/mark this certificate as revoked/i)).toHaveCount(0);
    });

    test('clicking Cancel inside the finalize-issue dialog dismisses the dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByTestId('finalize-issue-button').click();
        await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await expect(page.getByRole('button', { name: /^cancel$/i })).toHaveCount(0);
    });

    test('clicking close (×) dismisses the finalize-issue dialog', async ({ mount, page }) => {
        await mountPendingButtons(mount, CertificateState.PendingIssue);
        await page.getByTestId('finalize-issue-button').click();
        await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
        await page.getByRole('button', { name: /^close$/i }).click();
        await expect(page.getByRole('button', { name: /^cancel$/i })).toHaveCount(0);
    });

    test('renders nothing when raProfile.authorityInstanceUuid is undefined', async ({ mount }) => {
        // authorityInstanceUuid missing on raProfile
        const c = await mount(<PendingActionButtonsWithStore certificate={buildCert(CertificateState.PendingIssue, { uuid: 'ra-1' })} />);
        await expect(c.locator('button')).toHaveCount(0);
    });
});
