import { type SecretDto, SecretState, SecretType } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { expect, test } from '../../../../../playwright/ct-test';
import BasicAuthSecretsField from './BasicAuthSecretsField';

const secret = (overrides: Partial<SecretDto>): SecretDto =>
    ({
        uuid: 's-1',
        name: 'RA one',
        type: SecretType.BasicAuth,
        enabled: true,
        state: SecretState.Active,
        sourceVaultProfile: { uuid: 'vp-1', name: 'Vault One' },
        ...overrides,
    }) as SecretDto;

const secrets = [
    secret({}),
    secret({ uuid: 's-2', name: 'HMAC key', type: SecretType.SecretKey }),
    secret({ uuid: 's-3', name: 'Disabled RA', enabled: false }),
    secret({ uuid: 's-4', name: 'Rejected RA', state: SecretState.Rejected }),
];

test.describe('BasicAuthSecretsField', () => {
    test('offers only usable basic-auth secrets', async ({ mount, page }) => {
        await mount(withProviders(<BasicAuthSecretsField value={[]} onChange={() => {}} secrets={secrets} />));

        await page.getByTestId('basicCredentialSecrets-trigger').click();

        await expect(page.getByRole('option', { name: /RA one/ })).toContainText('Vault One');
        await expect(page.getByRole('option', { name: /HMAC key/ })).toHaveCount(0);
        await expect(page.getByRole('option', { name: /Disabled RA/ })).toHaveCount(0);
        await expect(page.getByRole('option', { name: /Rejected RA/ })).toHaveCount(0);
    });

    test('a bound secret that is no longer usable is shown by its bound name and can be removed', async ({ mount, page }) => {
        let selected: string[] | undefined;
        await mount(
            withProviders(
                <BasicAuthSecretsField
                    value={['gone']}
                    onChange={(uuids) => {
                        selected = uuids;
                    }}
                    secrets={secrets}
                    bound={[{ uuid: 'gone', name: 'Removed RA' }]}
                />,
            ),
        );

        await page.getByLabel('Remove Removed RA', { exact: true }).click();

        await expect(() => expect(selected).toEqual([])).toPass();
    });
});
