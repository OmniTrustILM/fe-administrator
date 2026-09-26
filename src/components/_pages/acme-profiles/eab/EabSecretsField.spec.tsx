import { type SecretDto, SecretState, SecretType } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { expect, test } from '../../../../../playwright/ct-test';
import { EAB_HINT } from 'utils/acme-eab';
import EabSecretsField from './EabSecretsField';

const secret = (overrides: Partial<SecretDto>): SecretDto =>
    ({
        uuid: 's-1',
        name: 'EAB key one',
        type: SecretType.SecretKey,
        enabled: true,
        state: SecretState.Active,
        sourceVaultProfile: { uuid: 'vp-1', name: 'Vault One' },
        ...overrides,
    }) as SecretDto;

const secrets = [
    secret({}),
    secret({ uuid: 's-2', name: 'Generic key', type: SecretType.Generic }),
    secret({ uuid: 's-3', name: 'Basic auth', type: SecretType.BasicAuth }),
    secret({ uuid: 's-4', name: 'Disabled key', enabled: false }),
    secret({ uuid: 's-5', name: 'Rejected key', state: SecretState.Rejected }),
];

test.describe('EabSecretsField', () => {
    test('offers only usable secretKey and generic secrets', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsField value={[]} onChange={() => {}} secrets={secrets} />));

        await page.getByTestId('eabSecrets-trigger').click();

        await expect(page.getByRole('option', { name: /EAB key one/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /Generic key/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /Basic auth/ })).toHaveCount(0);
        await expect(page.getByRole('option', { name: /Disabled key/ })).toHaveCount(0);
        await expect(page.getByRole('option', { name: /Rejected key/ })).toHaveCount(0);
    });

    test('a secret without a vault profile is still offered', async ({ mount, page }) => {
        await mount(
            withProviders(<EabSecretsField value={[]} onChange={() => {}} secrets={[secret({ sourceVaultProfile: undefined })]} />),
        );

        await page.getByTestId('eabSecrets-trigger').click();

        await expect(page.getByRole('option', { name: /EAB key one/ })).toBeVisible();
    });

    test('reports the selected uuids', async ({ mount, page }) => {
        let selected: string[] = [];
        await mount(
            withProviders(
                <EabSecretsField
                    value={[]}
                    onChange={(uuids) => {
                        selected = uuids;
                    }}
                    secrets={secrets}
                />,
            ),
        );

        await page.getByTestId('eabSecrets-trigger').click();
        await page.getByRole('option', { name: /Generic key/ }).click();

        await expect.poll(() => selected).toEqual(['s-2']);
        expect(selected).toEqual(['s-2']);
    });

    test('a bound secret that is no longer usable can still be removed, but not picked again', async ({ mount, page }) => {
        let selected: string[] | undefined;
        await mount(
            withProviders(
                <EabSecretsField
                    value={['s-4']}
                    onChange={(uuids) => {
                        selected = uuids;
                    }}
                    secrets={[secrets[3]]}
                />,
            ),
        );

        await page.getByTestId('eabSecrets-trigger').click();
        await expect(page.getByRole('option', { name: /Disabled key/ })).toHaveAttribute('aria-disabled', 'true');
        await page.keyboard.press('Escape');

        await page.getByLabel('Remove Disabled key', { exact: true }).click();

        await expect.poll(() => selected).toEqual([]);
        expect(selected).toEqual([]);
    });

    test('a bound secret stays removable when the listing returned nothing', async ({ mount, page }) => {
        let selected: string[] | undefined;
        await mount(
            withProviders(
                <EabSecretsField
                    value={['missing-uuid']}
                    onChange={(uuids) => {
                        selected = uuids;
                    }}
                    secrets={[]}
                    listError="Failed to list secrets"
                />,
            ),
        );

        await page.getByLabel('Remove missing-uuid', { exact: true }).click();

        await expect.poll(() => selected).toEqual([]);
        expect(selected).toEqual([]);
    });

    test('shows the selected secrets by name, or by uuid when the secret is not listed', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsField value={['s-1', 'missing-uuid']} onChange={() => {}} secrets={secrets} />));

        await expect(page.getByTestId('eabSecrets')).toContainText('EAB key one');
        await expect(page.getByTestId('eabSecrets')).toContainText('missing-uuid');
    });

    test('a disabled field cannot be opened', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsField value={[]} onChange={() => {}} secrets={secrets} disabled />));

        await expect(page.getByTestId('eabSecrets-trigger')).toBeDisabled();
    });

    test('explains what the list does', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsField value={[]} onChange={() => {}} secrets={[]} />));

        await expect(page.getByTestId('eabSecrets-hint')).toHaveText(EAB_HINT);
    });

    test('a failed secret listing is surfaced with its reason', async ({ mount, page }) => {
        await mount(
            withProviders(
                <EabSecretsField
                    value={[]}
                    onChange={() => {}}
                    secrets={[]}
                    listError="Failed to list secrets (403): Access Denied. Required 'List' permission for 'Secret'"
                />,
            ),
        );

        await expect(page.getByTestId('eabSecrets-error')).toContainText("Required 'List' permission");
    });
});
