import { expect, test, type Page } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';
import { chooseScheme, provider, submittedModel } from './oauth2ProviderTestFixtures';

const base = {
    name: 'provider',
    jwkSetUrl: 'https://issuer.example/jwks',
    jwkSetKeys: [],
};

const providerWithAllSchemes = { ...provider, applications: { enabled: true, clientId: 'ilm-apps', scopes: ['openid'] } };

function section(page: Page, legend: string) {
    return page.getByRole('group', { name: legend, exact: true });
}

test('creating shows only the general section until a scheme section is chosen', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await expect(section(page, 'General')).toBeHidden();

    await chooseScheme(page, 'JWT Bearer');

    await expect(section(page, 'General')).toBeVisible();
    await expect(section(page, 'JWT Bearer')).toBeVisible();
    await expect(section(page, 'OAuth2 Flow')).toBeHidden();
    await expect(section(page, 'Sign-in for applications')).toBeHidden();
});

test('choosing Application also chooses JWT Bearer', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);

    await chooseScheme(page, 'Application');

    await expect(page.getByTestId('select-schemes-trigger')).toContainText('JWT Bearer');
    await expect(page.getByTestId('select-schemes-trigger')).toContainText('Application');
    await expect(page.getByTestId('label-issuerUrl')).toHaveText('Issuer Url *');
});

test('JWT Bearer stays chosen while Application is chosen', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);
    await chooseScheme(page, 'Application');

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove JWT Bearer' }).click();

    await expect(page.getByTestId('select-schemes-trigger')).toContainText('JWT Bearer');
    await expect(section(page, 'JWT Bearer')).toBeVisible();
});

test('editing a provider with only a client id opens the OAuth2 Flow section with it', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...base, clientId: 'c' }} />);

    await expect(section(page, 'OAuth2 Flow')).toBeVisible();
    await expect(page.locator('#clientId')).toHaveValue('c');
});

test('editing an OAuth2 Flow provider with a custom delegate claim opens JWT Bearer with it', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...base, clientId: 'c', delegateClaim: 'azp' }} />);

    await expect(page.getByTestId('select-schemes-trigger')).toContainText('JWT Bearer');
    await expect(page.getByLabel('Delegate claim', { exact: true })).toHaveValue('azp');
});

test('removing a scheme warns and clears its settings', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={providerWithAllSchemes} />);
    await expect(page.getByTestId('scheme-removal-warning')).toHaveCount(0);

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove Application' }).click();

    await expect(page.getByTestId('scheme-removal-warning')).toHaveText('Saving removes the Application settings from this provider.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => submittedModel(page)).toBeDefined();
    expect((await submittedModel(page)).applications).toEqual({ enabled: false, scopes: [] });
});

test('each application field has its description', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);

    await chooseScheme(page, 'Application');

    const applications = section(page, 'Sign-in for applications');
    for (const description of [
        'The name applications show to users. The provider name is used when empty.',
        "The public client registered at the provider for applications, used with PKCE. Must differ from the provider's Client Id.",
        'The scopes applications request when they sign a user in.',
        'The RFC 8707 resource indicator applications send to the provider. Leave empty unless the provider needs one.',
    ]) {
        await expect(applications.getByText(description, { exact: true })).toBeVisible();
    }
});

test('removing an incomplete scheme enables saving with no other edit', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...base, issuerUrl: 'https://issuer.example', clientId: 'c' }} />);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove OAuth2 Flow' }).click();

    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
});

test('removing every scheme asks for JWT Bearer or OAuth2 Flow', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...base, issuerUrl: 'https://issuer.example' }} />);

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove JWT Bearer' }).click();
    await page.getByTestId('select-schemes-trigger').blur();

    await expect(page.getByText('Choose JWT Bearer or OAuth2 Flow', { exact: true })).toBeVisible();
});

test('creating shows no removal warning', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);

    await chooseScheme(page, 'JWT Bearer');
    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove JWT Bearer' }).click();

    await expect(page.getByTestId('scheme-removal-warning')).toHaveCount(0);
});

test('editing a provider with an incomplete scheme explains what to complete', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={{ ...base, issuerUrl: 'https://issuer.example', clientId: 'c' }} />);
    const warning = page.getByTestId('incomplete-schemes-warning');

    await expect(warning).toHaveText('Complete the OAuth2 Flow settings, or remove the scheme to drop them.');
    await expect(warning).toHaveAttribute('role', 'status');

    await page.getByTestId('select-schemes-trigger').getByRole('button', { name: 'Remove OAuth2 Flow' }).click();

    await expect(warning).toHaveCount(0);
});

test('editing a complete provider shows no incomplete scheme warning', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={providerWithAllSchemes} />);

    await expect(section(page, 'OAuth2 Flow')).toBeVisible();
    await expect(page.getByTestId('incomplete-schemes-warning')).toHaveCount(0);
});

test('creating shows no incomplete scheme warning', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="create" />);

    await chooseScheme(page, 'JWT Bearer');

    await expect(section(page, 'JWT Bearer')).toBeVisible();
    await expect(page.getByTestId('incomplete-schemes-warning')).toHaveCount(0);
});

test('clearing the schemes hides every section and asks for a scheme', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={providerWithAllSchemes} />);

    await page.getByTestId('select-schemes-clear').click();
    await page.getByTestId('select-schemes-trigger').blur();

    await expect(section(page, 'General')).toBeHidden();
    await expect(page.getByText('Choose JWT Bearer or OAuth2 Flow', { exact: true })).toBeVisible();
    await expect(page.getByTestId('scheme-removal-warning')).toHaveText(
        'Saving removes the JWT Bearer, OAuth2 Flow, Application settings from this provider.',
    );
});
