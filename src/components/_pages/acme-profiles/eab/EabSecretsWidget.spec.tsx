import { type SecretDto, SecretState, SecretType } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { expect, test } from '../../../../../playwright/ct-test';
import EabSecretsWidget from './EabSecretsWidget';

const secrets = [{ uuid: 's-1', name: 'EAB key one', type: SecretType.SecretKey, enabled: true }] as SecretDto[];

test.describe('EabSecretsWidget', () => {
    test('an empty list means binding is not required and lists nothing', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsWidget secretUuids={[]} secrets={secrets} isLoading={false} onGenerateKey={() => {}} />));

        await expect(page.getByTestId('eab-status')).toContainText('Not required');
        await expect(page.getByRole('table')).toHaveCount(0);
    });

    test('a non-empty list is shown as required, with the secret name linked and a copyable kid', async ({ mount, page }) => {
        await mount(
            withProviders(<EabSecretsWidget secretUuids={['s-1', 's-2']} secrets={secrets} isLoading={false} onGenerateKey={() => {}} />),
        );

        await expect(page.getByTestId('eab-status')).toContainText('Required');
        await expect(page.getByRole('link', { name: 'EAB key one' })).toHaveAttribute('href', /secrets\/detail\/s-1$/);
        await expect(page.getByText('Not available to you')).toBeVisible();
        const firstRow = page.getByRole('row').filter({ hasText: 'EAB key one' });
        await expect(firstRow.getByRole('button', { name: 'Copy kid' })).toBeVisible();
        await expect(firstRow).toContainText('s-1');
        await expect(page.getByText('s-2', { exact: true })).toBeVisible();
    });

    test('a bound secret that can no longer verify a binding is still linked, and marked not usable', async ({ mount, page }) => {
        const bound = [
            ...secrets,
            { uuid: 's-2', name: 'Disabled key', type: SecretType.SecretKey, enabled: false },
            { uuid: 's-3', name: 'Rejected key', type: SecretType.Generic, enabled: true, state: SecretState.Rejected },
        ] as SecretDto[];
        await mount(
            withProviders(
                <EabSecretsWidget secretUuids={['s-1', 's-2', 's-3']} secrets={bound} isLoading={false} onGenerateKey={() => {}} />,
            ),
        );

        const row = (name: string) => page.getByRole('row').filter({ hasText: name });
        await expect(row('EAB key one').getByText('Not usable')).toHaveCount(0);
        await expect(row('Disabled key').getByText('Not usable')).toBeVisible();
        await expect(row('Rejected key').getByText('Not usable')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Disabled key' })).toHaveAttribute('href', /secrets\/detail\/s-2$/);
    });

    test('while secrets are loading a missing name reads as loading, not as a permission problem', async ({ mount, page }) => {
        await mount(withProviders(<EabSecretsWidget secretUuids={['s-2']} secrets={[]} isLoading onGenerateKey={() => {}} />));

        await expect(page.getByText('Loading…')).toBeVisible();
        await expect(page.getByText('Not available to you')).toHaveCount(0);
    });

    test('a failed secret listing is reported, not passed off as a permission problem', async ({ mount, page }) => {
        await mount(
            withProviders(
                <EabSecretsWidget
                    secretUuids={['s-2']}
                    secrets={[]}
                    isLoading={false}
                    listError="Failed to list secrets (500)"
                    onGenerateKey={() => {}}
                />,
            ),
        );

        await expect(page.getByTestId('eab-list-error')).toContainText('Failed to list secrets');
        await expect(page.getByText('Secrets could not be listed')).toBeVisible();
        await expect(page.getByText('Not available to you')).toHaveCount(0);
    });

    test('the key button asks for a key', async ({ mount, page }) => {
        let asked = false;
        await mount(
            withProviders(
                <EabSecretsWidget
                    secretUuids={[]}
                    secrets={[]}
                    isLoading={false}
                    onGenerateKey={() => {
                        asked = true;
                    }}
                />,
            ),
        );

        await page.getByRole('button', { name: 'Generate key' }).click();

        await expect.poll(() => asked).toBe(true);
        expect(asked).toBe(true);
    });
});
