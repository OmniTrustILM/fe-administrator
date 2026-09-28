import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator } from 'playwright/ct-test';
import KeyExportDialogWithStore from './KeyExportDialogWithStore';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { AttributeContentType, AttributeType, type BaseAttributeDto } from 'types/openapi';

const pin: BaseAttributeDto = {
    uuid: 'export-pin-uuid',
    name: 'pin',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    properties: { label: 'PIN', visible: true, required: false, readOnly: false, list: false, multiSelect: false, extensibleList: false },
} as BaseAttributeDto;

const SCHEMA_FAILURE = 'Failed to get Attributes to export a key (503): The provider is unavailable';

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

const exportRequests = (actions: UnknownAction[]) => actions.filter(keyActions.exportKey.match).map((action) => action.payload);

test.describe('KeyExportDialog', () => {
    test("shows the key's name, algorithm, provider and the export format", async ({ mount, page }) => {
        await mount(<KeyExportDialogWithStore />);

        await expect(page.getByText('server-01 | RSA | Token instance')).toBeVisible();
        await expect(page.getByTestId('text-input-exportFormat')).toHaveValue('Encrypted PKCS8 – private key (PEM)');
    });

    test('refuses a short passphrase with a field error', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeyExportDialogWithStore onAction={(action) => actions.push(action)} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'short');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'short');
        await page.getByRole('button', { name: 'Export' }).click();

        await expect(page.getByText('Use at least 12 characters')).toBeVisible();
        expect(exportRequests(actions)).toHaveLength(0);
    });

    test('refuses a mismatched confirmation with a field error', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeyExportDialogWithStore onAction={(action) => actions.push(action)} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse staple');
        await page.getByRole('button', { name: 'Export' }).click();

        await expect(page.getByText('The passwords do not match')).toBeVisible();
        expect(exportRequests(actions)).toHaveLength(0);
    });

    test('stays open and busy while the export runs, and closes once it succeeds', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        let closed = 0;
        await mount(
            <KeyExportDialogWithStore
                keyUuid="key-uuid"
                exportAnswer={{ delay: 1000 }}
                onClose={() => {
                    closed += 1;
                }}
                onAction={(action) => actions.push(action)}
            />,
        );

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await page.getByRole('button', { name: 'Export' }).click();

        await expect(page.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
        expect(closed).toBe(0);
        expect(exportRequests(actions)).toEqual([
            {
                uuid: 'key-uuid',
                keyItemUuid: 'key-item-uuid',
                keyExportRequestDto: { passphrase: 'correct horse battery', exportAttributes: [] },
                fallbackName: 'server-01.pem',
            },
        ]);
        await expect.poll(() => closed).toBe(1);
        await expect(page.getByTestId('text-input-passphrase')).toHaveValue('');
        await expect(page.getByTestId('text-input-passphraseConfirmation')).toHaveValue('');
    });

    test("stays open with Core's refusal and clears the password fields when the export is refused", async ({ mount, page }) => {
        const refusal = 'Failed to export the key (422): The key is not exportable';
        let closed = 0;
        await mount(
            <KeyExportDialogWithStore
                exportAnswer={{ error: refusal }}
                onClose={() => {
                    closed += 1;
                }}
            />,
        );

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await page.getByRole('button', { name: 'Export' }).click();

        await expect(page.getByRole('alert')).toHaveText(refusal);
        await expect(page.getByTestId('text-input-passphrase')).toHaveValue('');
        await expect(page.getByTestId('text-input-passphraseConfirmation')).toHaveValue('');
        await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();
        expect(closed).toBe(0);
    });

    test('keeps Export disabled until the export attribute schema has loaded', async ({ mount, page }) => {
        await mount(<KeyExportDialogWithStore exportAttributeListings={[{ pending: true }]} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');

        await expect(page.getByRole('button', { name: 'Export' })).toBeDisabled();
    });

    test('says why the export attribute schema could not be listed, and lists it again on Retry', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(
            <KeyExportDialogWithStore
                exportAttributeListings={[{ error: SCHEMA_FAILURE }, { descriptors: [pin] }]}
                onAction={(action) => actions.push(action)}
            />,
        );

        await expect(page.getByRole('alert')).toContainText(SCHEMA_FAILURE);
        await expect(page.getByRole('button', { name: 'Export' })).toBeDisabled();

        await page.getByRole('button', { name: 'Retry' }).click();

        await expect(page.getByTestId('text-input-__attributes__exportKey__.pin')).toBeVisible();
        await expect(page.getByText(SCHEMA_FAILURE)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled();
        expect(actions.filter(keyActions.listExportKeyAttributeDescriptors.match).map((action) => action.payload)).toEqual([
            { uuid: 'key-uuid', keyItemUuid: 'key-item-uuid' },
            { uuid: 'key-uuid', keyItemUuid: 'key-item-uuid' },
        ]);
    });
});
