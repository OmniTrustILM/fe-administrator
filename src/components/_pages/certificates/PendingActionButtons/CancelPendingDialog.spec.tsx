import { test, expect } from '@playwright/experimental-ct-react';
import CancelPendingDialogWithStore from './CancelPendingDialogWithStore';

test.describe('CancelPendingDialog', () => {
    test('confirm with empty reason dispatches reason: undefined', async ({ mount, page }) => {
        await mount(
            <CancelPendingDialogWithStore
                isOpen
                onClose={() => {}}
                certificate={{ uuid: 'cert-1', raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any }}
            />,
        );
        await page.evaluate(() => {
            (globalThis as any).__lastDispatchedAction = undefined;
        });
        await page.getByRole('button', { name: /cancel operation/i }).click();
        const dispatched = await page.evaluate(() => (globalThis as any).__lastDispatchedAction);
        expect(dispatched.type).toContain('cancelPendingCertificateOperation');
        expect(dispatched.payload).toMatchObject({ uuid: 'cert-1', reason: undefined });
    });

    test('confirm with reason text dispatches the trimmed reason', async ({ mount, page }) => {
        await mount(
            <CancelPendingDialogWithStore
                isOpen
                onClose={() => {}}
                certificate={{ uuid: 'cert-1', raProfile: { uuid: 'ra-1', authorityInstanceUuid: 'auth-1' } as any }}
            />,
        );
        await page.getByLabel(/reason/i).fill('  no longer needed  ');
        await page.evaluate(() => {
            (globalThis as any).__lastDispatchedAction = undefined;
        });
        await page.getByRole('button', { name: /cancel operation/i }).click();
        const dispatched = await page.evaluate(() => (globalThis as any).__lastDispatchedAction);
        expect(dispatched.payload.reason).toBe('no longer needed');
    });
});
