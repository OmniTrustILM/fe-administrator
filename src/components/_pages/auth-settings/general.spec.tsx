import { expect, test } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';
import { chooseScheme, fillInput, provider, submittedModel } from './oauth2ProviderTestFixtures';

test('a JWK Set makes the JWK Set Url optional and disables it', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await chooseScheme(page, 'JWT Bearer');
    await expect(page.getByTestId('label-jwkSetUrl')).toHaveText('JWK Set Url *');

    await fillInput(page.getByLabel('JWK Set', { exact: false }).and(page.locator('#jwkSet')), 'eyJrZXlzIjpbXX0=');

    await expect(page.locator('#jwkSetUrl')).toBeDisabled();
    await expect(page.getByTestId('label-jwkSetUrl')).toHaveText('JWK Set Url');
    await fillInput(page.getByLabel('Provider Name', { exact: false }), provider.name);
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toMatchObject({ jwkSet: 'eyJrZXlzIjpbXX0=' });
    expect(await submittedModel(page)).not.toHaveProperty('jwkSetUrl');
});

test('an empty JWK Set Url without a JWK Set is refused', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await chooseScheme(page, 'JWT Bearer');

    await fillInput(page.locator('#jwkSetUrl'), provider.jwkSetUrl);
    await page.locator('#jwkSetUrl').fill('');
    await page.locator('#jwkSetUrl').blur();

    await expect(page.getByText('JWK Set URL is required if JWK Set is not provided', { exact: true })).toBeVisible();
    await expect(page.locator('#jwkSet')).toBeEnabled();
});

test('editing keeps the stored audiences and offers them as values', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, audiences: ['ilm', 'api'] }} />);
    await expect(page.getByTestId('select-audiences-trigger')).toContainText('ilm');
    await expect(page.getByTestId('select-audiences-trigger')).toContainText('api');

    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toMatchObject({ audiences: ['ilm', 'api'] });
});
