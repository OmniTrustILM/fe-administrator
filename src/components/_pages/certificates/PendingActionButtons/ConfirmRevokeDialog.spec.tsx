import { test, expect } from '@playwright/experimental-ct-react';
import ConfirmRevokeDialogWithStore from './ConfirmRevokeDialogWithStore';

test.describe('ConfirmRevokeDialog', () => {
    test('confirm dispatches manuallyConfirmRevoke with the certificate UUIDs', async ({ mount, page }) => {
        const cert = { uuid: 'cert-1', raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any };
        await mount(<ConfirmRevokeDialogWithStore isOpen onClose={() => {}} certificate={cert} />);
        await page.evaluate(() => {
            (globalThis as any).__lastDispatchedAction = undefined;
        });
        await page.getByRole('button', { name: /^confirm$/i }).click();
        const dispatched = await page.evaluate(() => (globalThis as any).__lastDispatchedAction);
        expect(dispatched.type).toContain('manuallyConfirmRevoke');
        expect(dispatched.payload).toMatchObject({ uuid: 'cert-1', raProfileUuid: 'ra-1', authorityUuid: 'auth-1' });
    });

    test('cancel button calls onClose without dispatching the action', async ({ mount, page }) => {
        let closed = false;
        await mount(
            <ConfirmRevokeDialogWithStore
                isOpen
                onClose={() => {
                    closed = true;
                }}
                certificate={{ uuid: 'cert-1', raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any }}
            />,
        );
        await page.evaluate(() => {
            (globalThis as any).__lastDispatchedAction = undefined;
        });
        await page.getByRole('button', { name: /^cancel$/i }).click();
        await page.waitForTimeout(50);
        const dispatched = await page.evaluate(() => (globalThis as any).__lastDispatchedAction);
        expect(dispatched).toBeUndefined();
        expect(closed).toBe(true);
    });
});
