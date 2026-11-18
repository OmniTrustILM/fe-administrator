import { expect, test } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';
import { provider, row } from './oauth2ProviderTestFixtures';

const jwtOnlyProvider = { name: 'provider', issuerUrl: 'https://issuer.example', jwkSetUrl: 'https://issuer.example/jwks', jwkSetKeys: [] };

test('shows lists as pills', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, audiences: ['a', 'b'] }} />);

    await expect(row(page, 'Audiences').getByTestId('badge')).toHaveText(['a', 'b']);
});

test('shows durations and defaults', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(row(page, 'Skew')).toContainText('30 sdefault');
    await expect(row(page, 'Session Max Inactive Interval')).toContainText('15 mindefault');
});

test('formats a stored duration', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, skew: 60 }} />);

    await expect(row(page, 'Skew')).toContainText('1 min');
    await expect(row(page, 'Skew')).not.toContainText('default');
});

test('hides the rows of an unused scheme', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={jwtOnlyProvider} />);

    await expect(row(page, 'Issuer Url')).toBeVisible();
    await expect(row(page, 'Token Url')).toHaveCount(0);
    await expect(row(page, 'Client Id')).toHaveCount(0);
});

test('hides sign-in for applications unless enabled', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, applications: { enabled: false, scopes: [] } }} />);
    await expect(page.getByRole('heading', { name: 'Sign-in for Applications' })).toHaveCount(0);
});

test('shows sign-in for applications without an enabled row', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, applications: { enabled: true, scopes: [] } }} />);

    await expect(page.getByRole('heading', { name: 'Sign-in for Applications' })).toBeVisible();
    await expect(row(page, 'Advertised to applications')).toHaveCount(0);
});

test('offers copying a url', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(row(page, 'Issuer Url').getByRole('button', { name: 'Copy Issuer Url' })).toBeVisible();
});

test('names the authentication schemes row as the form does', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={provider} />);

    await expect(row(page, 'Authentication schemes')).toContainText('JWT Bearer');
    await expect(row(page, 'Authentication Scheme')).toHaveCount(0);
});

test('falls back to the provider name for the application display name', async ({ mount, page }) => {
    await mount(<OAuth2DelegationTestHarness mode="detail" provider={{ ...provider, applications: { enabled: true, scopes: [] } }} />);

    await expect(row(page, 'Display name')).toHaveText('Display nameproviderdefault');
});

test('offers copying the application resource', async ({ mount, page }) => {
    await mount(
        <OAuth2DelegationTestHarness
            mode="detail"
            provider={{ ...provider, applications: { enabled: true, scopes: [], resource: 'https://ilm.example/api' } }}
        />,
    );

    await expect(row(page, 'Resource').getByRole('button', { name: 'Copy Resource' })).toBeVisible();
});
