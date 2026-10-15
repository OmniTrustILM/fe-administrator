import type { Page } from '@playwright/test';
import { KeyUsage, TokenInstanceStatus, type TokenInstanceDto } from 'types/openapi';
import { test, expect } from '../../../../../playwright/ct-test';
import TokenProfileFormWithStore from './TokenProfileFormWithStore';

const v1Token: TokenInstanceDto = {
    uuid: 'token-v1',
    name: 'V1 Token',
    status: TokenInstanceStatus.Connected,
    tokenProfiles: 0,
    connectorUuid: 'connector-v1',
    connectorName: 'V1 Connector',
    kind: 'Software',
};

const v2Token: TokenInstanceDto = {
    uuid: 'token-v2',
    name: 'V2 Token',
    status: TokenInstanceStatus.Connected,
    tokenProfiles: 0,
    connectorUuid: 'connector-v2',
    connectorName: 'V2 Connector',
};

const pickToken = async (page: Page, token: TokenInstanceDto) => {
    await page.getByTestId('select-tokenSelect-trigger').click();
    await page.locator(`#tokenSelect-option-${token.uuid}`).click();
};

const openKeyUsageOptions = async (page: Page) => {
    await page.getByTestId('select-usagesSelect-trigger').click();
    return page.getByRole('option');
};

const expectEveryKeyUsageOffered = async (page: Page) => {
    const options = await openKeyUsageOptions(page);
    await expect(options).toHaveCount(Object.values(KeyUsage).length);
    for (const usage of Object.values(KeyUsage)) {
        await expect(page.locator(`#usagesSelect-option-${usage}`)).toBeVisible();
    }
};

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

    for (const [version, token] of [
        ['V1', v1Token],
        ['V2', v2Token],
    ] as const) {
        test(`offers every key usage for a ${version} token`, async ({ mount, page }) => {
            await mount(<TokenProfileFormWithStore usesGlobalModal tokens={[v1Token, v2Token]} />);

            await pickToken(page, token);

            await expectEveryKeyUsageOffered(page);
            await expect(page.getByTestId('token-profile-actions')).toHaveText('');
        });
    }

    test('offers every key usage for a token preselected by the route', async ({ mount, page }) => {
        await mount(
            <TokenProfileFormWithStore initialRoute="/tokens/detail/token-v2" routePath="/tokens/detail/:tokenId" tokens={[v2Token]} />,
        );

        await expect(page.getByTestId('select-tokenSelect-trigger')).toContainText(v2Token.name);
        await expectEveryKeyUsageOffered(page);
        await expect(page.getByTestId('token-profile-actions')).toHaveText('');
    });

    test('keeps the selected key usages when the token changes', async ({ mount, page }) => {
        await mount(<TokenProfileFormWithStore usesGlobalModal tokens={[v1Token, v2Token]} />);
        await pickToken(page, v1Token);
        await openKeyUsageOptions(page);
        await page.locator(`#usagesSelect-option-${KeyUsage.Sign}`).click();
        await page.locator(`#usagesSelect-option-${KeyUsage.Verify}`).click();
        await page.keyboard.press('Escape');

        await pickToken(page, v2Token);

        await expect(page.getByTestId('select-tokenSelect-trigger')).toContainText(v2Token.name);
        await expect(page.locator(`[data-tag-value="${KeyUsage.Sign}"]`)).toBeVisible();
        await expect(page.locator(`[data-tag-value="${KeyUsage.Verify}"]`)).toBeVisible();
    });

    test('offers every key usage when editing a profile, fetching only its detail', async ({ mount, page }) => {
        await mount(
            <TokenProfileFormWithStore
                initialRoute="/tokenprofiles/detail/token-v1/token-profile-uuid"
                routePath="/tokenprofiles/detail/:tokenId/:id"
                tokens={[v1Token]}
                tokenProfile={{
                    uuid: 'token-profile-uuid',
                    name: 'Signing Profile',
                    tokenInstanceUuid: v1Token.uuid,
                    tokenInstanceName: v1Token.name,
                    tokenInstanceStatus: TokenInstanceStatus.Connected,
                    enabled: true,
                    usages: [KeyUsage.Sign],
                    attributes: [],
                }}
            />,
        );

        await expect(page.locator(`[data-tag-value="${KeyUsage.Sign}"]`)).toBeVisible();
        await expectEveryKeyUsageOffered(page);
        await expect(page.getByTestId('token-profile-actions')).toHaveText('tokenprofiles/getTokenProfileDetail');
    });
});
