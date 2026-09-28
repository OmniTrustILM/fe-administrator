import { expect, test } from '../../../playwright/ct-test';
import PassphraseFieldsWithForm from './PassphraseFieldsWithForm';
import type { PassphraseFormValues } from './index';

test.describe('PassphraseFields', () => {
    test('refuses mismatched values on submit and submits nothing', async ({ mount, page }) => {
        let submitted: PassphraseFormValues | undefined;
        await mount(
            <PassphraseFieldsWithForm
                onSubmit={(values) => {
                    submitted = values;
                }}
            />,
        );

        await page.getByTestId('text-input-passphrase').fill('correct horse battery');
        await page.getByTestId('text-input-passphraseConfirmation').fill('correct horse staple');
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page.getByText('The passwords do not match')).toBeVisible();
        expect(submitted).toBeUndefined();
    });

    test('re-checks the confirmation when the password changes, without touching it', async ({ mount, page }) => {
        let submitted: PassphraseFormValues | undefined;
        await mount(
            <PassphraseFieldsWithForm
                onSubmit={(values) => {
                    submitted = values;
                }}
            />,
        );

        await page.getByTestId('text-input-passphrase').fill('correct horse battery');
        await page.getByTestId('text-input-passphraseConfirmation').fill('correct horse staple');
        await expect(page.getByText('The passwords do not match')).toBeVisible();

        await page.getByTestId('text-input-passphraseConfirmation').fill('correct horse battery');
        await expect(page.getByText('The passwords do not match')).not.toBeVisible();

        await page.getByTestId('text-input-passphrase').fill('correct horse charger');
        await expect(page.getByText('The passwords do not match')).toBeVisible();

        expect(submitted).toBeUndefined();
    });

    test('shows the minimum-length message for a short password', async ({ mount, page }) => {
        await mount(<PassphraseFieldsWithForm onSubmit={() => {}} />);

        await page.getByTestId('text-input-passphrase').fill('short');

        await expect(page.getByText('Use at least 12 characters')).toBeVisible();
    });
});
