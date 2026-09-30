import { SecretState } from 'types/openapi';
import { EAB_CLIENT_HINT, EAB_KEY_NOTICE, EAB_SECRET_CREATED, EAB_SECRET_SELECTED } from 'utils/acme-eab';
import { expect, test } from '../../../../../playwright/ct-test';
import { CREATED_SECRET_UUID } from './eabKeyFixture';
import { createButton, fillEabSecretForm } from './eabKeyDialogSteps';
import GenerateEabKeyDialogHarness from './GenerateEabKeyDialogHarness';

test.describe('GenerateEabKeyDialog', () => {
    test('generates on open and offers a Secret Key secret holding the key', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();

        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        await expect(page.getByRole('button', { name: 'Copy key' })).toBeVisible();
        await expect(page.getByTestId('eab-key-notice')).toHaveText(EAB_KEY_NOTICE);
        await expect(page.getByTestId('text-input-secret-type')).toHaveValue('Secret Key');
        await expect(page.getByTestId('text-input-secret-type')).toBeDisabled();
        await expect(page.locator('#secret-secretkey-content')).toHaveValue('abc-1');
        await expect(page.locator('#secret-secretkey-content')).toBeDisabled();
        await expect(page.locator('#secret-secretkey-file__fileUpload__file')).toHaveCount(0);
        await expect(createButton(page)).toBeDisabled();
    });

    test('drops the key on close and generates a fresh one when reopened', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        const firstKey = await page.getByTestId('eab-key').innerText();
        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        await expect(page.getByTestId('eab-key')).toHaveCount(0);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        expect(await page.getByTestId('eab-key').innerText()).not.toBe(firstKey);
    });

    test('a parent re-render while open keeps the key already shown', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);

        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-');
        const shownKey = await page.getByTestId('eab-key').innerText();

        await page.getByTestId('rerender').dispatchEvent('click');
        await page.getByTestId('rerender').dispatchEvent('click');

        await expect(page.getByTestId('eab-key')).toHaveText(shownKey);
    });

    test('a failed generation closes the dialog without a key', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generateFails />);

        await page.getByTestId('open').click();

        await expect(page.getByTestId('state')).toHaveText('closed');
        await expect(page.getByTestId('eab-key')).toHaveCount(0);
    });

    test('creates the secret with the key as its content, enables it, selects it and shows its Key ID', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);
        await page.getByTestId('open').click();
        await expect(page.getByTestId('eab-key')).toContainText('abc-1');

        await page.getByTestId('text-input-secret-name').click();
        await page.getByTestId('text-input-secret-name').fill('acme-eab');
        await expect(createButton(page)).toBeDisabled();
        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(EAB_SECRET_SELECTED);
        const [request] = JSON.parse(await page.getByTestId('create-requests').innerText());
        expect(request).toMatchObject({
            vaultUuid: 'vault-1',
            vaultProfileUuid: 'vp-1',
            secretRequestDto: { name: 'acme-eab', secret: { type: 'secretKey', content: 'abc-1' } },
        });
        await expect(page.getByTestId('selected')).toHaveText(JSON.stringify([{ uuid: CREATED_SECRET_UUID, enabled: true }]));
        await expect(page.getByTestId('eab-key-id')).toContainText(CREATED_SECRET_UUID);
        await expect(page.getByRole('button', { name: 'Copy Key ID' })).toBeVisible();
        await expect(page.getByTestId('eab-key')).toContainText('abc-1');
        await expect(page.getByTestId('eab-client-hint')).toHaveText(EAB_CLIENT_HINT);
        await expect(page.getByTestId('text-input-secret-name')).toHaveCount(0);

        await page.getByTestId('generate-eab-key-dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
        await expect(page.getByTestId('state')).toHaveText('closed');
    });

    test('the key goes out with the create request only, and the secret listing is read again', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness generatedKey="abc" />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('store-actions')).toContainText('secrets/listSecretOptions');
        await expect(page.getByTestId('create-requests')).toContainText('abc-1');
        await expect(page.getByTestId('store-actions')).not.toContainText('abc-1');
    });

    test("the vault profile's attributes are filled here and sent with the secret", async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness vaultProfileHasAttribute />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await expect(createButton(page)).toBeDisabled();
        const path = page.getByTestId('text-input-__attributes__secret__.path');
        await path.click();
        await path.fill('acme/eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-key-id')).toBeVisible();
        const [request] = JSON.parse(await page.getByTestId('create-requests').innerText());
        expect(request.secretRequestDto.attributes).toMatchObject([{ name: 'path', content: [{ data: 'acme/eab' }] }]);
    });

    test('a secret its vault profile holds for approval is not selected, and the dialog says why', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness approvalRequired />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(
            'Not usable yet: vault profile Vault One requires approval of new secrets. Once this one is approved, add it to the profile.',
        );
        await expect(page.getByTestId('eab-key-id')).toContainText(CREATED_SECRET_UUID);
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('a secret its vault profile has already held for approval is not selected, whatever the lookup said', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness stateAfterCreate={SecretState.PendingApproval} />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toContainText('requires approval of new secrets');
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('a secret its vault could not store is not selected, and the dialog says why', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness stateAfterCreate={SecretState.Failed} />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(
            'Not usable: storing the secret in vault profile Vault One failed. Once that is fixed, add it to the profile.',
        );
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('an approval check that failed leaves the secret unselected instead of assuming no approval', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness approvalLookupFails />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toContainText('could not be checked');
        await expect(page.getByTestId('eab-key-id')).toContainText(CREATED_SECRET_UUID);
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('the dialog cannot be closed while the secret is being created', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness createDelayMs={1500} />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        const dialog = page.getByTestId('generate-eab-key-dialog');
        await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('state')).toHaveText('open');
        await expect(page.getByTestId('eab-key-id')).toHaveCount(0);

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(EAB_SECRET_SELECTED);
        await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
        await expect(page.getByTestId('state')).toHaveText('closed');
    });

    test("Create waits until the vault profile's attributes have loaded", async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness attributesLoading />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');

        await expect(page.getByText('Loading attributes...')).toBeVisible();
        await expect(createButton(page)).toBeDisabled();
    });

    test('a secret that could not be enabled is not selected, and the dialog says why', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness enableFails />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(
            'Not usable: the secret could not be enabled (Access Denied). Enable it, then add it to the profile.',
        );
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('a failed create keeps the form and the key for another try', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness createFails />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('create-requests')).not.toHaveText('[]');
        await expect(createButton(page)).toBeEnabled();
        await expect(page.getByTestId('eab-key')).toContainText('generated-key-1');
        await expect(page.getByTestId('eab-key-id')).toHaveCount(0);
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('Cancel closes without creating a secret', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await page.getByTestId('generate-eab-key-dialog').getByRole('button', { name: 'Cancel' }).click();

        await expect(page.getByTestId('state')).toHaveText('closed');
        await expect(page.getByTestId('create-requests')).toHaveText('[]');
        await expect(page.getByTestId('selected')).toHaveText('[]');
    });

    test('without a field to select in, the operator is sent to edit the profile', async ({ mount, page }) => {
        await mount(<GenerateEabKeyDialogHarness selectable={false} />);
        await page.getByTestId('open').click();

        await fillEabSecretForm(page, 'acme-eab');
        await createButton(page).click();

        await expect(page.getByTestId('eab-secret-outcome')).toHaveText(EAB_SECRET_CREATED);
    });
});
