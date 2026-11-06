import { expect, test, type Locator, type Page } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';

const provider = {
    name: 'provider',
    issuerUrl: 'https://issuer.example',
    jwkSetUrl: 'https://issuer.example/jwks',
    jwkSetKeys: [],
};

async function fillInput(input: Locator, value: string) {
    await input.focus();
    await input.fill(value);
}

async function submittedModel(page: Page) {
    return JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}').oauth2ProviderSettingsUpdateModel;
}

test('a new provider without a username claim leaves it to the platform default', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await page.getByTestId('select-scheme-trigger').click();
    await page.getByRole('option', { name: 'JWT Bearer', exact: true }).click();
    await expect(page.getByLabel('Username claim', { exact: true })).toHaveAttribute('placeholder', 'username');
    await fillInput(page.getByLabel('Provider Name', { exact: false }), 'provider');
    await fillInput(page.getByLabel('JWK Set Url', { exact: false }), provider.jwkSetUrl);
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect(await submittedModel(page)).not.toHaveProperty('usernameClaim');
});

test('a new provider submits a trimmed username claim', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await page.getByTestId('select-scheme-trigger').click();
    await page.getByRole('option', { name: 'JWT Bearer', exact: true }).click();
    await fillInput(page.getByLabel('Provider Name', { exact: false }), 'provider');
    await fillInput(page.getByLabel('JWK Set Url', { exact: false }), provider.jwkSetUrl);
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await fillInput(page.getByLabel('Username claim', { exact: true }), ' oid ');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect(await submittedModel(page)).toMatchObject({ usernameClaim: 'oid' });
});

test('saving another change keeps the stored username claim', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, usernameClaim: 'oid' }} />);
    await expect(page.getByLabel('Username claim', { exact: true })).toHaveValue('oid');
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toMatchObject({ usernameClaim: 'oid', delegateClaim: 'azp' });
});

test('clearing the username claim returns the provider to the platform default', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, usernameClaim: 'oid' }} />);
    await fillInput(page.getByLabel('Username claim', { exact: true }), '');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect(await submittedModel(page)).not.toHaveProperty('usernameClaim');
});

test('editing warns only while the effective username claim differs from the stored one', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, usernameClaim: 'oid' }} />);
    const warning = page.getByTestId('username-claim-change-warning');
    await expect(page.getByLabel('Username claim', { exact: true })).toHaveValue('oid');
    await expect(warning).toHaveCount(0);

    await fillInput(page.getByLabel('Username claim', { exact: true }), 'email');
    await expect(warning).toBeVisible();

    await fillInput(page.getByLabel('Username claim', { exact: true }), ' oid ');
    await expect(warning).toHaveCount(0);
});

test('editing treats an explicit default username claim as no change', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    const warning = page.getByTestId('username-claim-change-warning');

    await fillInput(page.getByLabel('Username claim', { exact: true }), 'username');
    await expect(warning).toHaveCount(0);

    await fillInput(page.getByLabel('Username claim', { exact: true }), 'oid');
    await expect(warning).toBeVisible();
});

test('creating a provider does not warn about the username claim', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await page.getByTestId('select-scheme-trigger').click();
    await page.getByRole('option', { name: 'JWT Bearer', exact: true }).click();
    await fillInput(page.getByLabel('Username claim', { exact: true }), 'oid');

    await expect(page.getByLabel('Username claim', { exact: true })).toHaveValue('oid');
    await expect(page.getByTestId('username-claim-change-warning')).toHaveCount(0);
});

test('provider detail displays the configured username claim', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, usernameClaim: 'oid' }} />);

    await expect(page.getByRole('row').filter({ hasText: 'Username claim' })).toHaveText('Username claimoid');
});

test('provider detail shows the default username claim when none is configured', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(page.getByRole('row').filter({ hasText: 'Username claim' })).toHaveText('Username claimusername');
});
