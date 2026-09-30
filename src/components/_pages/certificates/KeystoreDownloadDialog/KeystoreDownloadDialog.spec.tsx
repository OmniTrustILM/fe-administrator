import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator } from '../../../../../playwright/ct-test';
import KeystoreDownloadDialogWithStore from './KeystoreDownloadDialogWithStore';
import { actions as certificateActions } from 'ducks/certificates';
import { AttributeContentType, AttributeType, type BaseAttributeDto } from 'types/openapi';

const pin: BaseAttributeDto = {
    uuid: 'export-pin-uuid',
    name: 'pin',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    properties: {
        label: 'PIN',
        visible: true,
        required: false,
        readOnly: false,
        list: false,
        multiSelect: false,
        extensibleList: false,
    },
} as BaseAttributeDto;

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

const downloadRequests = (actions: UnknownAction[]) =>
    actions.filter(certificateActions.downloadKeystore.match).map((action) => action.payload);

test.describe('KeystoreDownloadDialog', () => {
    test('refuses a short passphrase with a field error', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeystoreDownloadDialogWithStore onAction={(action) => actions.push(action)} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'short');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'short');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect(page.getByText('Use at least 12 characters')).toBeVisible();
        expect(downloadRequests(actions)).toHaveLength(0);
    });

    test('refuses a mismatched confirmation with a field error', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeystoreDownloadDialogWithStore onAction={(action) => actions.push(action)} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse staple');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect(page.getByText('The passwords do not match')).toBeVisible();
        expect(downloadRequests(actions)).toHaveLength(0);
    });

    test('refuses a passphrase outside printable ASCII with a field error', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeystoreDownloadDialogWithStore onAction={(action) => actions.push(action)} />);

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse caf\u00e9');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse caf\u00e9');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect(
            page.getByText('Use printable ASCII characters only, so every tool, including Java keytool, can open the file'),
        ).toBeVisible();
        expect(downloadRequests(actions)).toHaveLength(0);
    });

    test('stays open and busy while the download runs, and closes once it succeeds', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        let closed = 0;
        await mount(
            <KeystoreDownloadDialogWithStore
                certificateUuid="certificate-uuid"
                certificateName="web-server-01.omnitrust.com"
                exportAnswer={{ delay: 1000 }}
                onClose={() => {
                    closed += 1;
                }}
                onAction={(action) => actions.push(action)}
            />,
        );

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect(page.getByRole('button', { name: 'Downloading...' })).toBeDisabled();
        expect(closed).toBe(0);
        expect(downloadRequests(actions)).toEqual([
            {
                uuid: 'certificate-uuid',
                certificateKeystoreRequestDto: { passphrase: 'correct horse battery', exportAttributes: [] },
                fallbackName: 'web-server-01.omnitrust.com.p12',
            },
        ]);
        await expect.poll(() => closed).toBe(1);
        await expect(page.getByTestId('text-input-passphrase')).toHaveValue('');
        await expect(page.getByTestId('text-input-passphraseConfirmation')).toHaveValue('');
    });

    test("stays open with Core's refusal and clears the password fields when the download is refused", async ({ mount, page }) => {
        const refusal = 'Failed to download the certificate with its private key (403): The key export permission is missing';
        let closed = 0;
        await mount(
            <KeystoreDownloadDialogWithStore
                exportAnswer={{ error: refusal }}
                onClose={() => {
                    closed += 1;
                }}
            />,
        );

        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect(page.getByRole('alert')).toHaveText(refusal);
        await expect(page.getByTestId('text-input-passphrase')).toHaveValue('');
        await expect(page.getByTestId('text-input-passphraseConfirmation')).toHaveValue('');
        await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled();
        expect(closed).toBe(0);
    });

    test('shows a listed export attribute and sends its value', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<KeystoreDownloadDialogWithStore exportAttributeDescriptors={[pin]} onAction={(action) => actions.push(action)} />);

        await expect(page.getByTestId('text-input-__attributes__exportKey__.pin')).toBeVisible();
        await enterText(page.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await enterText(page.getByTestId('text-input-__attributes__exportKey__.pin'), '1234');
        await page.getByRole('button', { name: 'Download' }).click();

        await expect.poll(() => downloadRequests(actions)).toHaveLength(1);
        expect(downloadRequests(actions)[0].certificateKeystoreRequestDto.exportAttributes).toEqual([
            expect.objectContaining({ name: 'pin', content: [expect.objectContaining({ data: '1234' })] }),
        ]);
    });

    test('shows no export attribute section when the schema lists none', async ({ mount, page }) => {
        await mount(<KeystoreDownloadDialogWithStore exportAttributeDescriptors={[]} />);

        await expect(page.getByTestId('text-input-passphrase')).toBeVisible();
        await expect(page.locator('[data-testid^="text-input-__attributes__exportKey__"]')).toHaveCount(0);
    });
});
