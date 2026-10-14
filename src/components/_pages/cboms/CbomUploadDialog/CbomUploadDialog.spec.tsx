import { test, expect, type Page } from 'playwright/ct-test';
import type { CustomAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType, AttributeVersion, type CbomUploadRequestDto } from 'types/openapi';
import CbomUploadDialogWithStore from './CbomUploadDialogWithStore';

const cbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    metadata: { component: { name: 'Příklad Пример 🔐' } },
};

const cbomYaml = ['bomFormat: CycloneDX', "specVersion: '1.6'", 'metadata:', '  component:', '    name: Příklad Пример 🔐'].join('\n');

const owner = {
    uuid: '6f0e2b1c-8d4a-4c3e-9b7f-1a2d3c4e5f60',
    name: 'owner',
    version: 3,
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Owner', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const migrationWave = {
    uuid: '0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d',
    name: 'migrationWave',
    version: 3,
    type: AttributeType.Custom,
    contentType: AttributeContentType.String,
    properties: { label: 'Migration wave', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
} as CustomAttributeModel;

const OWNER_FIELD = 'text-input-__attributes__customCbom__.owner';
const WAVE_FIELD = 'text-input-__attributes__customCbom__.migrationWave';

const ADD_ATTRIBUTE = 'select-selectAddCustomAttribute-trigger';

/** An optional custom attribute is asked for only once it is picked from the add select. */
async function addAttribute(page: Page, label: string) {
    await page.getByTestId(ADD_ATTRIBUTE).click();
    await page.getByRole('option', { name: label }).click();
}

/** The attribute inputs stay read-only until focused, so a field is clicked before it is filled. */
async function enterText(page: Page, testId: string, value: string) {
    const field = page.getByTestId(testId);
    await field.click();
    await field.fill(value);
}

const attribute = (descriptor: CustomAttributeModel, data: string) => ({
    uuid: descriptor.uuid,
    name: descriptor.name,
    contentType: descriptor.contentType,
    version: AttributeVersion.V3,
    content: [{ data, contentType: descriptor.contentType }],
});

test.describe('CbomUploadDialog', () => {
    test('uploads pasted content with characters outside Latin-1 intact', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore onUpload={(request) => uploads.push(request)} />);

        const textarea = page.locator('textarea');
        await textarea.click();
        await textarea.fill(JSON.stringify(cbom));
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads.map((request) => request.content)).toEqual([cbom]);
    });

    test('uploads a UTF-8 file with characters outside Latin-1 intact', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore onUpload={(request) => uploads.push(request)} />);

        await page.locator('input[type="file"]').setInputFiles({
            name: 'cbom.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(cbom), 'utf8'),
        });
        await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled();
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads.map((request) => request.content)).toEqual([cbom]);
    });

    test('with no custom attributes defined, asks for none and uploads the document alone', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore onUpload={(request) => uploads.push(request)} />);

        await page.locator('textarea').fill(JSON.stringify(cbom));
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [] }]);
        await expect(page.getByRole('region', { name: 'Custom attributes' })).toHaveCount(0);
    });

    test('sends an optional custom attribute with a JSON document', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore customAttributes={[owner]} onUpload={(request) => uploads.push(request)} />);

        await page.locator('textarea').fill(JSON.stringify(cbom));
        await addAttribute(page, 'Owner');
        await enterText(page, OWNER_FIELD, 'Inventory team');
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [attribute(owner, 'Inventory team')] }]);
    });

    test('sends an optional custom attribute with a YAML document', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore customAttributes={[owner]} onUpload={(request) => uploads.push(request)} />);

        await page.locator('textarea').fill(cbomYaml);
        await addAttribute(page, 'Owner');
        await enterText(page, OWNER_FIELD, 'Inventory team');
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [attribute(owner, 'Inventory team')] }]);
    });

    test('leaves an optional custom attribute out when it is not filled', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore customAttributes={[owner]} onUpload={(request) => uploads.push(request)} />);

        await expect(page.getByTestId(ADD_ATTRIBUTE)).toBeVisible();
        await page.locator('textarea').fill(JSON.stringify(cbom));
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [] }]);
    });

    test('does not upload until a required custom attribute is filled', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(<CbomUploadDialogWithStore customAttributes={[owner, migrationWave]} onUpload={(request) => uploads.push(request)} />);

        await page.locator('textarea').fill(JSON.stringify(cbom));
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect(page.getByText('Required Field')).toBeVisible();
        expect(uploads).toEqual([]);

        await enterText(page, WAVE_FIELD, 'Wave 2');
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [attribute(migrationWave, 'Wave 2')] }]);
    });

    test('waits for the custom attribute definitions before it uploads, without a section for them yet', async ({ mount, page }) => {
        await mount(<CbomUploadDialogWithStore pendingListing onUpload={() => {}} />);

        await page.locator('textarea').fill(JSON.stringify(cbom));

        await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled();
        await expect(page.getByRole('region', { name: 'Custom attributes' })).toHaveCount(0);
    });

    test('says why the custom attribute definitions could not be listed, and keeps the document on Retry', async ({ mount, page }) => {
        const uploads: CbomUploadRequestDto[] = [];
        await mount(
            <CbomUploadDialogWithStore
                customAttributes={[migrationWave]}
                failedListings={1}
                onUpload={(request) => uploads.push(request)}
            />,
        );
        const section = page.getByRole('region', { name: 'Custom attributes' });

        await page.locator('textarea').fill(JSON.stringify(cbom));

        await expect(section.getByRole('alert')).toContainText('Failed to get Resource Custom Attributes list (503): Service unavailable');
        await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled();

        await section.getByRole('button', { name: 'Retry' }).click();

        await expect(page.locator('textarea')).toHaveValue(JSON.stringify(cbom));
        await enterText(page, WAVE_FIELD, 'Wave 2');
        await page.getByRole('button', { name: 'Upload' }).click();

        await expect.poll(() => uploads.length).toBe(1);
        expect(uploads).toEqual([{ content: cbom, customAttributes: [attribute(migrationWave, 'Wave 2')] }]);
    });
});
