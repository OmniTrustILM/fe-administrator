import { expect, test } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';
import { chooseScheme, fillInput, provider, row, submittedModel } from './oauth2ProviderTestFixtures';

const applications = {
    enabled: true,
    name: 'Example sign-in',
    clientId: 'ilm-apps',
    scopes: ['openid', 'ilm'],
    resource: 'https://ilm.example/api',
};

test('saving another change on a provider without the block submits it disabled', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await expect(page.getByTestId('select-schemes-trigger')).not.toContainText('Application');
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual({ enabled: false, scopes: [] });
});

test('enabling sign-in for applications submits the trimmed block', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await chooseScheme(page, 'Application');
    await fillInput(page.getByLabel('Display name', { exact: true }), ` ${applications.name} `);
    await fillInput(page.getByLabel('Public client Id', { exact: true }), applications.clientId);
    for (const scope of applications.scopes) {
        await page.getByPlaceholder('Add application scope').fill(scope);
        await page.getByPlaceholder('Add application scope').press('Enter');
    }
    await fillInput(page.getByLabel('Resource', { exact: true }), applications.resource);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual(applications);
});

test('editing keeps a stored block unchanged when another field changes', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, applications }} />);
    await expect(page.getByTestId('select-schemes-trigger')).toContainText('Application');
    await expect(page.getByLabel('Public client Id', { exact: true })).toHaveValue(applications.clientId);
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual(applications);
});

test('enabling sign-in for applications requires the issuer url', async ({ mount, page }) => {
    const oauth2FlowProviderWithoutIssuer = { ...provider, issuerUrl: undefined };
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={oauth2FlowProviderWithoutIssuer} />);
    await chooseScheme(page, 'Application');

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
});

test('a public client id equal to the provider client id is refused', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await chooseScheme(page, 'Application');
    await fillInput(page.getByLabel('Public client Id', { exact: true }), provider.clientId);
    await page.getByLabel('Public client Id', { exact: true }).blur();

    await expect(page.getByText("Must differ from the provider's Client Id", { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});

test('the public client id check applies only while OAuth2 Flow is chosen', async ({ mount, page }) => {
    const mustDiffer = page.getByText("Must differ from the provider's Client Id", { exact: true });
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...provider, applications }} />);
    await fillInput(page.getByLabel('Public client Id', { exact: true }), provider.clientId);
    await page.getByLabel('Public client Id', { exact: true }).blur();
    await expect(mustDiffer).toBeVisible();

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove OAuth2 Flow' }).click();
    await expect(mustDiffer).toBeHidden();

    await chooseScheme(page, 'OAuth2 Flow');
    await page.getByLabel('Public client Id', { exact: true }).blur();
    await expect(mustDiffer).toBeVisible();

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove OAuth2 Flow' }).click();
    await expect(mustDiffer).toBeHidden();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => submittedModel(page)).toBeDefined();
    const model = await submittedModel(page);
    expect(model.clientId).toBeUndefined();
    expect(model.applications.clientId).toBe(provider.clientId);
});

test('a resource with a fragment is refused', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await chooseScheme(page, 'Application');
    await fillInput(page.getByLabel('Resource', { exact: true }), 'https://ilm.example/api#part');
    await page.getByLabel('Resource', { exact: true }).blur();

    await expect(page.getByText('Value must be an absolute http or https URL without credentials or a fragment')).toBeVisible();
});

test('changing the provider client id clears the public client id refusal', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await chooseScheme(page, 'Application');
    await fillInput(page.getByLabel('Public client Id', { exact: true }), provider.clientId);
    await page.getByLabel('Public client Id', { exact: true }).blur();
    await expect(page.getByText("Must differ from the provider's Client Id", { exact: true })).toBeVisible();

    await fillInput(page.locator('#clientId'), 'ilm-login-renamed');

    await expect(page.getByText("Must differ from the provider's Client Id", { exact: true })).toBeHidden();
});

test('provider detail displays the configured sign-in for applications', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, applications }} />);

    await expect(row(page, 'Display name')).toContainText(applications.name);
    await expect(row(page, 'Public client Id')).toContainText(applications.clientId);
    await expect(row(page, 'Application scopes').getByTestId('badge')).toHaveText(['openid', 'ilm']);
    await expect(row(page, 'Resource')).toContainText(applications.resource);
});

test('provider detail hides sign-in for applications when the block is unset', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(page.getByRole('heading', { name: 'Sign-in for Applications' })).toHaveCount(0);
});
