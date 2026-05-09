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
});
