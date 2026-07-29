import { test, expect } from '../../../../../playwright/ct-test';
import TokenProfileFormWithStore from './TokenProfileFormWithStore';

test.describe('TokenProfileForm', () => {
    test('stays in create mode in the global modal, where the route :id belongs to another resource', async ({ mount, page }) => {
        // Opened via "+ Add new" from the Complete Registration dialog: the page underneath is
        // /certificates/detail/:id, so the route param is a certificate uuid, not a token profile.
        await mount(<TokenProfileFormWithStore usesGlobalModal />);

        await expect(page.locator('#name')).toBeEnabled();
        await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    });

    test('still enters edit mode from its own route', async ({ mount, page }) => {
        await mount(
            <TokenProfileFormWithStore
                initialRoute="/tokenprofiles/detail/token-uuid/token-profile-uuid"
                routePath="/tokenprofiles/detail/:tokenId/:id"
            />,
        );

        // The name of an existing profile is not editable, and the action is an update.
        await expect(page.locator('#name')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();
    });
});
