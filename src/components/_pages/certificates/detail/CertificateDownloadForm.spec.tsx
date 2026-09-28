import type { UnknownAction } from '@reduxjs/toolkit';
import { test, expect, type Locator, type Page } from '../../../../../playwright/ct-test';
import { CertificateDownloadFormTestWrapper } from './CertificateDownloadFormTestWrapper';
import { actions as certificateActions } from 'ducks/certificates';
import { actions as userInterfaceActions } from 'ducks/user-interface';

const PKCS12_OPTION_LABEL = 'PKCS12 – certificate, private key and chain (.p12)';

const downloadCertificateRequests = (actions: UnknownAction[]) =>
    actions.filter(certificateActions.downloadCertificate.match).map((action) => action.payload);

async function chooseFormat(page: Page, optionName: string) {
    await page.getByTestId('select-certificateFormat-trigger').click();
    await page.getByRole('option', { name: optionName }).click();
}

/** A text field stays read-only until it is focused, so it is clicked before it is filled. */
async function enterText(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

test.describe('CertificateDownloadForm', () => {
    test('offers the PKCS12 format only when the certificate is keystoreAvailable', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable />);

        await page.getByTestId('select-certificateFormat-trigger').click();
        await expect(page.getByRole('option', { name: PKCS12_OPTION_LABEL })).toBeVisible();
    });

    test('does not offer the PKCS12 format when the certificate is not keystoreAvailable', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable={false} />);

        await page.getByTestId('select-certificateFormat-trigger').click();
        await expect(page.getByRole('option', { name: PKCS12_OPTION_LABEL })).toHaveCount(0);
    });

    test('does not offer the PKCS12 format when keystoreAvailable but the key has no private item', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable hasPrivateKeyItem={false} />);

        await page.getByTestId('select-certificateFormat-trigger').click();
        await expect(page.getByRole('option', { name: PKCS12_OPTION_LABEL })).toHaveCount(0);
    });

    test('choosing PKCS12 shows the password fields and the info text in place of the encoding choice', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable />);

        await chooseFormat(page, PKCS12_OPTION_LABEL);

        await expect(page.getByTestId('text-input-passphrase')).toBeVisible();
        await expect(page.getByTestId('text-input-passphraseConfirmation')).toBeVisible();
        await expect(
            page.getByText(
                'The container is protected with your password. Downloading requires the key export permission and is audit-logged.',
            ),
        ).toBeVisible();
        await expect(page.getByTestId('select-certificateEncoding-trigger')).toHaveCount(0);
    });

    test('keeps the modal open on Escape while a PKCS12 download runs, and closes it on Escape once it has ended', async ({
        mount,
        page,
    }) => {
        const refusal = 'Failed to download the certificate with its private key (403): The key export permission is missing';
        await mount(<CertificateDownloadFormTestWrapper inGlobalModal exportAnswer={{ delay: 1000, error: refusal }} />);
        const modal = page.getByRole('dialog', { name: 'Download' });
        await chooseFormat(page, PKCS12_OPTION_LABEL);
        await enterText(modal.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(modal.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await modal.getByRole('button', { name: 'Download' }).click();
        await expect(modal.getByRole('button', { name: 'Downloading...' })).toBeDisabled();

        await page.keyboard.press('Escape');

        await expect(modal.getByRole('alert')).toHaveText(refusal);
        await page.keyboard.press('Escape');
        await expect(modal).toHaveCount(0);
    });

    test('locks the format and the chain switch while a PKCS12 download runs', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper inGlobalModal />);
        const modal = page.getByRole('dialog', { name: 'Download' });
        await chooseFormat(page, PKCS12_OPTION_LABEL);
        await enterText(modal.getByTestId('text-input-passphrase'), 'correct horse battery');
        await enterText(modal.getByTestId('text-input-passphraseConfirmation'), 'correct horse battery');
        await modal.getByRole('button', { name: 'Download' }).click();
        await expect(modal.getByRole('button', { name: 'Downloading...' })).toBeDisabled();

        await expect(modal.getByLabel('Certificate Chain')).toBeDisabled();
        await expect(modal.getByTestId('select-certificateFormat-trigger')).toBeDisabled();
    });

    test('shows only the Format select until a format is chosen', async ({ mount, page }) => {
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable />);

        await expect(page.getByTestId('select-certificateFormat-trigger')).toBeVisible();
        await expect(page.getByTestId('select-certificateEncoding-trigger')).toHaveCount(0);
        await expect(page.getByTestId('text-input-passphrase')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(0);
    });

    test('offers Cancel, which closes the dialog, until a format is chosen', async ({ mount, page }) => {
        const actions: UnknownAction[] = [];
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable onAction={(action) => actions.push(action)} />);

        await page.getByRole('button', { name: 'Cancel' }).click();

        await expect.poll(() => actions.some((action) => userInterfaceActions.hideGlobalModal.match(action))).toBe(true);
        await chooseFormat(page, 'Raw');
        await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    });

    test('choosing a plain format reveals the encoding choice and requests the certificate in that format and encoding', async ({
        mount,
        page,
    }) => {
        const actions: UnknownAction[] = [];
        await mount(<CertificateDownloadFormTestWrapper keystoreAvailable onAction={(action) => actions.push(action)} />);

        await chooseFormat(page, 'Raw');
        await expect(page.getByTestId('select-certificateEncoding-trigger')).toBeVisible();

        await page.getByTestId('select-certificateEncoding-trigger').click();
        await page.getByRole('option', { name: 'PEM' }).click();
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect
            .poll(() => downloadCertificateRequests(actions))
            .toEqual([{ uuid: 'certificate-uuid', certificateFormat: 'raw', encoding: 'pem' }]);
    });
});
