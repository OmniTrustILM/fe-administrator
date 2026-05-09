import { test, expect } from '@playwright/experimental-ct-react';
import { CertificateState } from 'types/openapi';
import PendingActionButtonsWithStore from './PendingActionButtonsWithStore';

test.describe('PendingActionButtons', () => {
    test('renders nothing for non-pending state', async ({ mount }) => {
        const c = await mount(
            <PendingActionButtonsWithStore
                certificate={{
                    uuid: 'cert-1',
                    state: CertificateState.Issued,
                    raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any,
                }}
            />,
        );
        await expect(c.locator('button')).toHaveCount(0);
    });

    test('renders nothing when raProfile is undefined', async ({ mount }) => {
        const c = await mount(
            <PendingActionButtonsWithStore
                certificate={{
                    uuid: 'cert-1',
                    state: CertificateState.PendingIssue,
                    raProfile: undefined,
                }}
            />,
        );
        await expect(c.locator('button')).toHaveCount(0);
    });

    test('PENDING_ISSUE renders Finalise and Cancel buttons (no Confirm Revoke)', async ({ mount, page }) => {
        await mount(
            <PendingActionButtonsWithStore
                certificate={{
                    uuid: 'cert-1',
                    state: CertificateState.PendingIssue,
                    raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any,
                }}
            />,
        );
        await expect(page.getByRole('button', { name: /finalise issue/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel pending operation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /confirm revocation/i })).toHaveCount(0);
    });

    test('PENDING_REVOKE renders Confirm Revoke and Cancel buttons (no Finalise)', async ({ mount, page }) => {
        await mount(
            <PendingActionButtonsWithStore
                certificate={{
                    uuid: 'cert-1',
                    state: CertificateState.PendingRevoke,
                    raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any,
                }}
            />,
        );
        await expect(page.getByRole('button', { name: /confirm revocation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel pending operation/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /finalise issue/i })).toHaveCount(0);
    });
});
