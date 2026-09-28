import { test, expect } from '../../../../../playwright/ct-test';
import CertificateImportDialogWithStore from './CertificateImportDialogWithStore';

test.describe('CertificateImportDialog', () => {
    test('opens captioned with the subtitle and the wizard inside', async ({ mount, page }) => {
        await mount(<CertificateImportDialogWithStore inspectAnswers={[]} />);

        await expect(page.getByRole('heading', { name: 'Import certificates and keys' })).toBeVisible();
        await expect(page.getByText('PEM, DER, PKCS7, PKCS12 or PKCS8 files. Content is shown before anything is imported.')).toBeVisible();
        await expect(
            page.getByText('Select or drag & drop certificate or key file to drop zone or paste file content in the text area.'),
        ).toBeVisible();
    });
});
