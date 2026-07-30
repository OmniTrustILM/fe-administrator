import { test, expect } from '../../../../../playwright/ct-test';
import CryptographicKeyFormWithStore from './CryptographicKeyFormWithStore';

test.describe('CryptographicKeyForm', () => {
    test('stays in create mode in the global modal, where the route :id belongs to another resource', async ({ mount, page }) => {
        // Opened via "+" in the Key dropdown of the Complete Registration dialog: the page underneath
        // is /certificates/detail/:id, so the route param is a certificate uuid, not a key.
        await mount(<CryptographicKeyFormWithStore usesGlobalModal />);

        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
        // Token Profile is required only for a new key — edit mode drops the marker and locks the field.
        await expect(page.getByText('Token Profile *')).toBeVisible();
    });

    test('still enters edit mode from its own route', async ({ mount, page }) => {
        await mount(<CryptographicKeyFormWithStore initialRoute="/keys/detail/key-uuid" routePath="/keys/detail/:id" />);

        await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    });
});
