import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateListWithStore } from './CertificateListWithStore';

const BULK_ACTIONS = [
    'Override groups',
    'Override owner',
    'Override RA profile',
    'Download PEM (.pem)',
    'Download DER (.cer)',
    'Archive',
    'Unarchive',
    'Delete',
];

test.describe('Certificates toolbar', () => {
    test('offers Create as the primary action and every other action in the actions menu', async ({ mount, page }) => {
        await mount(<CertificateListWithStore />);

        const header = page.getByTestId('page-header-actions');
        await expect(header.getByRole('button', { name: 'Create' })).toBeEnabled();
        await header.getByRole('button', { name: 'More actions' }).click();

        const entries = ['Import certificates and keys', ...BULK_ACTIONS];
        await expect(page.getByRole('menuitem')).toHaveCount(entries.length);
        for (const [index, label] of entries.entries()) {
            await expect(page.getByRole('menuitem').nth(index)).toHaveAccessibleName(label);
        }
        await expect(page.getByRole('menuitem', { name: 'Import certificates and keys', exact: true })).not.toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });

    test('keeps the bulk actions unavailable until certificates are selected', async ({ mount, page }) => {
        await mount(<CertificateListWithStore />);

        await page.getByRole('button', { name: 'More actions' }).click();
        for (const label of BULK_ACTIONS) {
            const entry = page.getByRole('menuitem', { name: label, exact: true });
            await expect(entry).toHaveAttribute('aria-disabled', 'true');
            await expect(entry).toHaveAccessibleDescription('Select one or more certificates');
        }
        await page.keyboard.press('Escape');

        await page.getByTestId('select-certificate').click();
        await page.getByRole('button', { name: 'More actions' }).click();
        for (const label of BULK_ACTIONS) {
            await expect(page.getByRole('menuitem', { name: label, exact: true })).not.toHaveAttribute('aria-disabled', 'true');
        }
    });

    test('shows no page header when the list is a certificate picker', async ({ mount, page }) => {
        await mount(<CertificateListWithStore pickerMode />);

        await expect(page.getByTestId('page-header-actions')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'More actions' })).toHaveCount(0);
    });
});
