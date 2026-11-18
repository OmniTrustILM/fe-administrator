import { CertificateState, ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateDetailsContentTestWrapper } from './CertificateDetailsContentTestWrapper';

test.describe('CertificateDetailsContent — operations by permission', () => {
    const readOnly = [ResourceAction.List, ResourceAction.Detail];
    const owned = [
        ResourceAction.Detail,
        ResourceAction.Update,
        ResourceAction.Delete,
        ResourceAction.Renew,
        ResourceAction.Revoke,
        ResourceAction.Archive,
    ];

    test('disables owner update for a read-only user', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper allowedActions={readOnly} />);
        await expect(page.getByRole('button', { name: 'Update Owner' })).toBeDisabled();
    });

    test('offers owner update when the certificate answer allows it', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper allowedActions={owned} />);
        await expect(page.getByRole('button', { name: 'Update Owner' })).toBeEnabled();
    });

    test('locks the trusted switch unless the certificate answer allows update', async ({ mount, page }) => {
        const trusted = { trustedCa: false };
        const denied = await mount(<CertificateDetailsContentTestWrapper allowedActions={readOnly} certificateOverrides={trusted} />);
        await expect(page.locator('#trustedCa')).toBeDisabled();
        await denied.unmount();

        await mount(<CertificateDetailsContentTestWrapper allowedActions={owned} certificateOverrides={trusted} />);
        await expect(page.locator('#trustedCa')).toBeEnabled();
    });

    test('follows the certificate answer for a pending revocation', async ({ mount, page }) => {
        const pendingRevoke = { state: CertificateState.PendingRevoke };
        const denied = await mount(<CertificateDetailsContentTestWrapper allowedActions={readOnly} certificateOverrides={pendingRevoke} />);
        await expect(page.getByTestId('confirm-revoke-button')).toBeDisabled();
        await denied.unmount();

        await mount(<CertificateDetailsContentTestWrapper allowedActions={owned} certificateOverrides={pendingRevoke} />);
        await expect(page.getByTestId('confirm-revoke-button')).toBeEnabled();
    });
});
