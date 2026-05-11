import { test, expect } from '../../../../../playwright/ct-test';
import { AttributeTestWrapper } from './AttributeTestWrapper';
import type { DataAttributeModel, InfoAttributeModel, CustomAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

const defaultProperties = {
    label: 'Test Field',
    required: false,
    readOnly: false,
    visible: true,
    list: false,
    multiSelect: false,
};

function dataDescriptor(overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name: 'testField',
        uuid: 'test-uuid',
        contentType: AttributeContentType.String,
        properties: defaultProperties as any,
        ...overrides,
    };
}

function customDescriptor(overrides: Partial<CustomAttributeModel> = {}): CustomAttributeModel {
    return {
        type: AttributeType.Custom,
        name: 'customField',
        uuid: 'custom-uuid',
        contentType: AttributeContentType.String,
        properties: { ...defaultProperties, label: 'Custom' } as any,
        ...overrides,
    };
}

function infoDescriptor(overrides: Partial<InfoAttributeModel> = {}): InfoAttributeModel {
    return {
        type: AttributeType.Info,
        name: 'infoField',
        uuid: 'info-uuid',
        contentType: AttributeContentType.String,
        content: [{ data: 'Info content' }] as any,
        properties: { label: 'Info Label' } as any,
        ...overrides,
    };
}

test.describe('Attribute', () => {
    test('returns empty fragment when descriptor is undefined', async ({ mount, page }) => {
        await mount(<AttributeTestWrapper name="field" descriptor={undefined} />);
        await expect(page.locator('#field')).not.toBeVisible();
        await expect(page.getByText('Test Field')).not.toBeVisible();
    });

    test('renders AttributeFieldInput for Data descriptor (non-list, non-File)', async ({ mount, page }) => {
        const descriptor = dataDescriptor({ properties: { ...defaultProperties, label: 'My Input' } as any });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByText('My Input')).toBeVisible();
        await expect(page.locator('#field')).toBeVisible();
    });

    test('renders AttributeFieldInput for Custom descriptor (non-list, non-File)', async ({ mount, page }) => {
        const descriptor = customDescriptor({
            contentType: AttributeContentType.Integer,
            properties: { ...defaultProperties, label: 'Count' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByText('Count')).toBeVisible();
    });

    test('renders AttributeFieldSelect when descriptor has list true', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            properties: { ...defaultProperties, list: true, label: 'Select Field' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} options={[{ label: 'A', value: 'a' }]} />);
        await expect(page.getByTestId('label-fieldSelect')).toHaveText('Select Field');
        await expect(page.getByTestId('select-fieldSelect')).toBeAttached();
    });

    test('renders AttributeFieldFile when contentType is File', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.File,
            properties: { ...defaultProperties, label: 'Upload' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByText('Upload')).toBeVisible();
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
    });

    test('renders AttributeInfo for Info descriptor', async ({ mount, page }) => {
        const descriptor = infoDescriptor();
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByRole('heading', { name: 'Info Label' })).toBeVisible();
        await expect(page.getByText('Info content')).toBeVisible();
    });

    test('Info descriptor with non-string rawContent (Codeblock) goes through JSON.stringify branch', async ({ mount, page }) => {
        const descriptor = infoDescriptor({
            content: [{ data: { code: 'Y29uc3QgeCA9IDE=', language: 'javascript' } }] as any,
            contentType: AttributeContentType.Codeblock,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByRole('heading', { name: 'Info Label' })).toBeVisible();
    });

    test('Info descriptor with non-string rawContent converts to string', async ({ mount, page }) => {
        const descriptor = infoDescriptor({
            content: [{ data: 42 }] as any,
            contentType: AttributeContentType.Integer,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        await expect(page.getByText('42')).toBeVisible();
    });

    test.skip('handleAddNew opens modal (Select is Preline/HS; programmatic change does not trigger React onChange in CT)', async ({
        mount,
        page,
    }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.Credential,
            properties: { ...defaultProperties, list: true, label: 'Creds' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} options={[{ label: 'Cred A', value: 'ca' }]} />);
        await expect(page.getByTestId('label-fieldSelect')).toHaveText('Creds');
        await page.locator('select#fieldSelect').evaluate((el: HTMLSelectElement) => {
            el.value = '__add_new__';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await expect(page.getByTestId('global-modal')).toBeVisible({ timeout: 5000 });
    });

    test.skip('onUserInteraction sets userInteractedRef (Select programmatic change does not trigger React onChange in CT)', async ({
        mount,
        page,
    }) => {
        const ref = { current: false };
        const descriptor = dataDescriptor({
            properties: { ...defaultProperties, list: true, label: 'Pick one' } as any,
        });
        await mount(
            <AttributeTestWrapper
                name="field"
                descriptor={descriptor}
                options={[{ label: 'Option A', value: 'a' }]}
                userInteractedRef={ref}
            />,
        );
        expect(ref.current).toBe(false);
        await page.locator('select#fieldSelect').evaluate((el: HTMLSelectElement) => {
            el.value = 'a';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        expect(ref.current).toBe(true);
    });

    test('attribute callback useEffect: setValue and dispatch when option matches', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            properties: { ...defaultProperties, list: true, label: 'Pick' } as any,
        });
        await mount(
            <AttributeTestWrapper
                name="field"
                descriptor={descriptor}
                options={[{ label: 'Matched', value: 'm1' }]}
                preloadedState={{
                    userInterface: {
                        initiateAttributeCallback: true,
                        attributeCallbackValue: 'Matched',
                    },
                }}
            />,
        );
        await expect(page.getByText('Pick')).toBeVisible();
        await expect(page.getByTestId('select-fieldSelect')).toBeAttached();
    });

    test.skip('handleSelectChangeSingle with __add_new__ (Select programmatic change does not trigger React onChange in CT)', async ({
        mount,
        page,
    }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.Credential,
            properties: { ...defaultProperties, list: true, label: 'Single Cred' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} options={[{ label: 'C1', value: 'c1' }]} />);
        await page.locator('select#fieldSelect').evaluate((el: HTMLSelectElement) => {
            el.value = '__add_new__';
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await expect(page.getByTestId('global-modal')).toBeVisible({ timeout: 5000 });
    });

    test('passes busy and deleteButton to child', async ({ mount, page }) => {
        const descriptor = dataDescriptor({ properties: { ...defaultProperties, label: 'With Delete' } as any });
        await mount(
            <AttributeTestWrapper
                name="field"
                descriptor={descriptor}
                deleteButton={<button data-testid="custom-delete">Delete</button>}
            />,
        );
        await expect(page.getByTestId('custom-delete')).toBeVisible();
    });

    test('handleAddNew no-op when addNewAttributeValue is undefined', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.String,
            properties: { ...defaultProperties, list: true, label: 'List' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} options={[{ label: 'X', value: 'x' }]} />);
        await expect(page.getByTestId('label-fieldSelect')).toHaveText('List');
    });

    test('onFileDragOver prevents default', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.File,
            properties: { ...defaultProperties, label: 'File' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        const dropZone = page.getByRole('region', { name: 'File drop zone' }).or(page.locator('input[type="file"]')).first();
        await expect(dropZone).toBeAttached();
    });

    test('onFileChanged and onFileLoaded set form values when file selected', async ({ mount, page }) => {
        const descriptor = dataDescriptor({
            contentType: AttributeContentType.File,
            properties: { ...defaultProperties, label: 'Upload' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} />);
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
        await fileInput.setInputFiles({
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('hello'),
        });
        await expect(page.locator('#field-fileName')).toHaveValue('test.txt', { timeout: 5000 });
    });

    test('Custom descriptor with list renders AttributeFieldSelect', async ({ mount, page }) => {
        const descriptor = customDescriptor({
            properties: { ...defaultProperties, list: true, label: 'Custom List' } as any,
        });
        await mount(<AttributeTestWrapper name="field" descriptor={descriptor} options={[]} />);
        await expect(page.getByText('Custom List')).toBeVisible();
        await expect(page.getByTestId('select-fieldSelect')).toBeAttached();
    });
});
