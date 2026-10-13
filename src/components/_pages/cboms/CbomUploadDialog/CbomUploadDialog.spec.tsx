import { test, expect } from 'playwright/ct-test';
import CbomUploadDialogWithStore from './CbomUploadDialogWithStore';

const cbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    metadata: { component: { name: 'Příklad Пример 🔐' } },
};

test.describe('CbomUploadDialog', () => {
    test('uploads pasted content with characters outside Latin-1 intact', async ({ mount, page }) => {
        const uploads: unknown[] = [];
        await mount(<CbomUploadDialogWithStore onUpload={({ content }) => uploads.push(content)} />);

        const textarea = page.locator('textarea');
        await textarea.click();
        await textarea.fill(JSON.stringify(cbom));
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([cbom]);
    });

    test('uploads a UTF-8 file with characters outside Latin-1 intact', async ({ mount, page }) => {
        const uploads: unknown[] = [];
        await mount(<CbomUploadDialogWithStore onUpload={({ content }) => uploads.push(content)} />);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'cbom.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(cbom), 'utf8'),
        });
        await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled();
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([cbom]);
    });
});
