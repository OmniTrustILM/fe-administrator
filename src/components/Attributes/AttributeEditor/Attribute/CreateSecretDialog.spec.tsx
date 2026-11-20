import type { Page } from '@playwright/test';
import { SecretState, SecretType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CREATED_SECRET_UUID } from 'components/_pages/acme-profiles/eab/eabKeyFixture';
import { fillEabSecretForm } from 'components/_pages/acme-profiles/eab/eabKeyDialogSteps';
import CreateSecretDialogHarness from './CreateSecretDialogHarness';

const CONTENT = 'top-secret-content';

async function createSecret(page: Page) {
    await page.getByTestId('open').click();
    await expect(page.getByTestId('text-input-secret-type')).toHaveValue('Generic');
    await expect(page.getByTestId('text-input-secret-type')).toBeDisabled();
    await fillEabSecretForm(page, 'new-secret');
    await page.locator('#secret-generic-content').fill(CONTENT);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
}

const createdValue = { reference: 'new-secret', data: { uuid: CREATED_SECRET_UUID, name: 'new-secret', resource: 'secrets' } };

test.describe('CreateSecretDialog', () => {
    test('createsAndSelectsSecret', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness />);

        await createSecret(page);

        await expect(page.locator('#secret-generic-content')).toHaveCount(0);
        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
        await expect(page.getByTestId('select-secretSelect-trigger')).toContainText('new-secret');
        await page.getByTestId('select-secretSelect-trigger').click();
        await expect(page.getByRole('option', { name: 'new-secret' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'existing' })).toBeVisible();
    });

    test('adds the created secret to a multi-select picker', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness multiSelect />);

        await createSecret(page);

        await expect(page.getByTestId('value')).toHaveText(JSON.stringify([createdValue]));
    });

    test('reportsAwaitingApproval_andSelectsNothing', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness approvalRequired />);

        await createSecret(page);

        await expect(page.getByTestId('create-secret-outcome')).toHaveText('Secret created; it awaits approval and cannot be selected yet');
        await expect(page.getByTestId('value')).toHaveText('null');
        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        await expect(page.getByTestId('create-secret-outcome')).toHaveCount(0);
        await expect(page.getByTestId('value')).toHaveText('null');
    });

    test('reportsEnableFailure', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness enableFails />);

        await createSecret(page);

        await expect(page.getByTestId('create-secret-outcome')).toHaveText(
            'Secret created; it could not be enabled (Access Denied) and cannot be selected yet',
        );
        await expect(page.getByTestId('value')).toHaveText('null');
    });

    test('reports a secret its vault could not store', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness stateAfterCreate={SecretState.Failed} />);

        await createSecret(page);

        await expect(page.getByTestId('create-secret-outcome')).toContainText('cannot be selected');
        await expect(page.getByTestId('value')).toHaveText('null');
    });

    test('a failed create keeps the form for another try', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness createFails />);

        await createSecret(page);

        await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
        await expect(page.getByTestId('create-secret-outcome')).toHaveCount(0);
        await expect(page.getByTestId('value')).toHaveText('null');
    });

    test('a listed secret with the same name does not stand in for the created one', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness sameNameListed />);

        await createSecret(page);

        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
        await page.getByTestId('select-secretSelect-trigger').click();
        await page.getByRole('option', { name: 'existing' }).click();
        await page.getByTestId('select-secretSelect-trigger').click();
        await page.getByRole('option', { name: 'new-secret' }).click();
        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
    });

    test('the dialog cannot be closed while the secret is being created', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness holdCreate />);

        await createSecret(page);
        const dialog = page.getByTestId('create-secret-dialog');
        await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
        await page.keyboard.press('Escape');
        await expect(page.locator('#secret-generic-content')).toBeVisible();

        await page.getByTestId('resolve-create').dispatchEvent('click');
        await expect(page.locator('#secret-generic-content')).toHaveCount(0);
        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
    });

    test('the dialog can be closed once nothing is being created', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness />);

        await page.getByTestId('open').click();
        await page.keyboard.press('Escape');

        await expect(page.getByTestId('create-secret-dialog')).toHaveCount(0);
    });

    test('keeps a form already shown in the global modal', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness inGlobalModal />);
        await page.getByTestId('open-parent').click();
        const parent = page.getByTestId('global-modal');
        await expect(parent).toContainText('Create Credential');

        await createSecret(page);

        await expect(page.getByTestId('create-secret-dialog')).toHaveCount(0);
        await expect(parent).toContainText('Create Credential');
        await expect(parent.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
    });

    test('cancelling keeps a form already shown in the global modal', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness inGlobalModal />);
        await page.getByTestId('open-parent').click();
        await page.getByTestId('open').click();

        await page.getByTestId('create-secret-dialog').getByRole('button', { name: 'Cancel', exact: true }).click();

        await expect(page.getByTestId('create-secret-dialog')).toHaveCount(0);
        await expect(page.getByTestId('global-modal')).toContainText('Create Credential');
        await expect(page.getByTestId('value')).toHaveText('null');
    });

    test('neverDispatchesKeyToStore', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness />);

        await createSecret(page);

        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
        await expect(page.getByTestId('store-actions')).toContainText('vaultProfiles/listVaultProfiles');
        await expect(page.getByTestId('store-actions')).not.toContainText(CONTENT);
    });

    test('never dispatches a generated private key to the store', async ({ mount, page }) => {
        await mount(<CreateSecretDialogHarness secretType={SecretType.PrivateKey} />);
        await page.getByTestId('open').click();
        await fillEabSecretForm(page, 'new-secret');
        await page.getByRole('button', { name: 'Generate key' }).click();
        await expect(page.getByTestId('secret-generated-key')).toHaveText('Generated EC P-256 key');

        await page.getByRole('button', { name: 'Create', exact: true }).click();

        await expect(page.getByTestId('value')).toHaveText(JSON.stringify(createdValue));
        const content = await page.evaluate(() => (globalThis as unknown as Record<string, string>).createdSecretContent);
        expect(atob(content)).toContain('-----BEGIN PRIVATE KEY-----');
        const actions = await page.getByTestId('store-actions').textContent();
        expect(actions).toContain('vaultProfiles/listVaultProfiles');
        expect(actions).not.toContain(content);
        expect(actions).not.toContain('BEGIN PRIVATE KEY');
    });
});
