import { expect, test, type Locator, type Page } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';

const provider = {
    name: 'provider',
    clientId: 'ilm-login',
    issuerUrl: 'https://issuer.example',
    jwkSetUrl: 'https://issuer.example/jwks',
    jwkSetKeys: [],
};

const applications = {
    enabled: true,
    name: 'Example sign-in',
    clientId: 'ilm-apps',
    scopes: ['openid', 'ilm'],
    resource: 'https://ilm.example/api',
};

async function fillInput(input: Locator, value: string) {
    await input.focus();
    await input.fill(value);
}

async function submittedModel(page: Page) {
    return JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}').oauth2ProviderSettingsUpdateModel;
}

function row(page: Page, property: string) {
    return page.getByRole('row').filter({ has: page.getByRole('cell', { name: property, exact: true }) });
}

test('saving another change on a provider without the block submits it disabled', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await expect(page.getByTestId('switch-applicationsEnabled-input')).not.toBeChecked();
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual({ enabled: false, scopes: [] });
});

test('enabling sign-in for applications submits the trimmed block', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await page.getByTestId('switch-applicationsEnabled').locator('label').last().click();
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
    await expect(page.getByTestId('switch-applicationsEnabled-input')).toBeChecked();
    await expect(page.getByLabel('Public client Id', { exact: true })).toHaveValue(applications.clientId);
    await fillInput(page.getByLabel('Delegate claim', { exact: true }), 'azp');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual(applications);
});

test('enabling sign-in for applications requires the issuer url', async ({ mount, page }) => {
    const oauth2FlowProviderWithoutIssuer = {
        ...provider,
        issuerUrl: undefined,
        authorizationUrl: 'https://issuer.example/auth',
        tokenUrl: 'https://issuer.example/token',
        logoutUrl: 'https://issuer.example/logout',
        postLogoutUrl: 'https://ilm.example',
    };
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={oauth2FlowProviderWithoutIssuer} />);
    await page.getByTestId('switch-applicationsEnabled').locator('label').last().click();

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await fillInput(page.getByLabel('Issuer Url', { exact: false }), provider.issuerUrl);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
});

test('a public client id equal to the provider client id is refused', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await fillInput(page.getByLabel('Public client Id', { exact: true }), provider.clientId);
    await page.getByLabel('Public client Id', { exact: true }).blur();

    await expect(page.getByText("Must differ from the provider's Client Id")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});

test('a resource with a fragment is refused', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await fillInput(page.getByLabel('Resource', { exact: true }), 'https://ilm.example/api#part');
    await page.getByLabel('Resource', { exact: true }).blur();

    await expect(page.getByText('Value must be an absolute http or https URL without credentials or a fragment')).toBeVisible();
});

test('changing the provider client id clears the public client id refusal', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} />);
    await fillInput(page.getByLabel('Public client Id', { exact: true }), provider.clientId);
    await page.getByLabel('Public client Id', { exact: true }).blur();
    await expect(page.getByText("Must differ from the provider's Client Id")).toBeVisible();

    await fillInput(page.getByLabel('Client Id', { exact: true }), 'ilm-login-renamed');

    await expect(page.getByText("Must differ from the provider's Client Id")).toBeHidden();
});

test('provider detail displays the configured sign-in for applications', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, applications }} />);

    await expect(row(page, 'Advertised to applications')).toContainText('Enabled');
    await expect(row(page, 'Display name')).toContainText(applications.name);
    await expect(row(page, 'Public client Id')).toContainText(applications.clientId);
    await expect(row(page, 'Application scopes')).toContainText('openid, ilm');
    await expect(row(page, 'Resource')).toContainText(applications.resource);
});

test('provider detail shows an unset block as disabled', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(row(page, 'Advertised to applications')).toContainText('Disabled');
    await expect(row(page, 'Display name')).toContainText(provider.name);
    await expect(row(page, 'Public client Id')).toContainText('Not set');
    await expect(row(page, 'Application scopes')).toContainText('None');
    await expect(row(page, 'Resource')).toContainText('Not set');
});
