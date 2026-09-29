import { expect, test, type Locator } from '../../../playwright/ct-test';
import PassphraseFieldsWithForm from './PassphraseFieldsWithForm';
import type { PassphraseFormValues } from './index';

const boxOf = async (locator: Locator) => (await locator.boundingBox())!;

test.describe('PassphraseFields', () => {
    test('puts each field under its label, the two side by side on a wide page', async ({ mount, page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await mount(<PassphraseFieldsWithForm onSubmit={() => {}} />);

        const passwordLabel = await boxOf(page.locator('label[for="passphrase"]'));
        const password = await boxOf(page.getByTestId('text-input-passphrase'));
        const confirmationLabel = await boxOf(page.locator('label[for="passphraseConfirmation"]'));
        const confirmation = await boxOf(page.getByTestId('text-input-passphraseConfirmation'));

        expect(password.y).toBeGreaterThanOrEqual(passwordLabel.y + passwordLabel.height);
        expect(Math.abs(password.x - passwordLabel.x)).toBeLessThan(2);
        expect(Math.abs(confirmation.x - confirmationLabel.x)).toBeLessThan(2);
        expect(confirmation.x).toBeGreaterThanOrEqual(password.x + password.width);
        expect(Math.abs(confirmation.y - password.y)).toBeLessThan(2);
    });

    test('stacks the confirmation under the password on a narrow page', async ({ mount, page }) => {
        await page.setViewportSize({ width: 390, height: 800 });
        await mount(<PassphraseFieldsWithForm onSubmit={() => {}} />);

        const password = await boxOf(page.getByTestId('text-input-passphrase'));
        const confirmationLabel = await boxOf(page.locator('label[for="passphraseConfirmation"]'));
        const confirmation = await boxOf(page.getByTestId('text-input-passphraseConfirmation'));

        expect(confirmationLabel.y).toBeGreaterThanOrEqual(password.y + password.height);
        expect(Math.abs(confirmation.x - password.x)).toBeLessThan(2);
    });

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
