import { expect, test, type Locator } from 'playwright/ct-test';
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

test('a new provider explains refusal by default and submits the default delegate claim', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await page.getByTestId('select-scheme-trigger').click();
    await page.getByRole('option', { name: 'JWT Bearer', exact: true }).click();
    await expect(page.getByText('A provider without allowed delegates refuses delegation tokens.', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Allowed delegates', { exact: true })).toBeAttached();
    await expect(page.getByRole('textbox', { name: 'Add delegate', exact: true })).toBeVisible();
    await expect(page.getByLabel('Delegate claim', { exact: true })).toHaveAttribute('placeholder', 'client_id');
    await fillInput(page.getByLabel('Provider Name', { exact: false }), 'provider');
    await fillInput(page.getByLabel('JWK Set Url', { exact: false }), provider.jwkSetUrl);
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect
        .poll(async () => JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}'))
        .toMatchObject({
            providerName: 'provider',
            oauth2ProviderSettingsUpdateModel: { allowedDelegates: [], delegateClaim: 'client_id' },
        });
});

test('editing a provider preserves and updates exact-case delegates and a custom claim', async ({ mount, page }) => {
    await mount(
        <OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, allowedDelegates: ['Service-A'], delegateClaim: 'azp' }} />,
    );
    await expect(page.getByTestId('select-allowedDelegates-trigger')).toContainText('Service-A');
    await expect(page.getByLabel('Delegate claim', { exact: true })).toHaveValue('azp');
    await page.getByPlaceholder('Add delegate').fill('service-a');
    await page.getByPlaceholder('Add delegate').press('Enter');
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'client_name');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
        .poll(async () => JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}'))
        .toMatchObject({
            providerName: 'provider',
            oauth2ProviderSettingsUpdateModel: { allowedDelegates: ['Service-A', 'service-a'], delegateClaim: 'client_name' },
        });
});

test('clearing all allowed delegates submits an empty list and resets an empty claim to its default', async ({ mount, page }) => {
    await mount(
        <OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, allowedDelegates: ['automation'], delegateClaim: 'azp' }} />,
    );
    await page
        .getByTestId('select-allowedDelegates-trigger')
        .getByRole('button', { name: /remove/i })
        .click();
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), '');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect
        .poll(async () => JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}'))
        .toMatchObject({ oauth2ProviderSettingsUpdateModel: { allowedDelegates: [], delegateClaim: 'client_id' } });
});

test('provider detail displays configured delegation settings', async ({ mount, page }) => {
    await mount(
        <OAuth2DelegationTestHarness
            mode="detail"
            provider={{ ...provider, allowedDelegates: ['Service-A', 'service-a'], delegateClaim: 'azp' }}
        />,
    );

    await expect(page.getByRole('row').filter({ hasText: 'Allowed delegates' })).toHaveText('Allowed delegatesService-A, service-a');
    await expect(page.getByRole('row').filter({ hasText: 'Delegate claim' })).toHaveText('Delegate claimazp');
});

test('provider detail makes disabled delegation and the default claim visible for old settings', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(page.getByRole('row').filter({ hasText: 'Allowed delegates' })).toHaveText('Allowed delegatesNone');
    await expect(page.getByRole('row').filter({ hasText: 'Delegate claim' })).toHaveText('Delegate claimclient_id');
});
