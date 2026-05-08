import { test, expect } from '../../../../../playwright/ct-test';
import { AttributeFieldFileTestWrapper } from './AttributeFieldFileTestWrapper';
import type { DataAttributeModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';

const defaultProperties = {
    label: 'Test File',
    required: false,
    readOnly: false,
    visible: true,
    list: false,
    multiSelect: false,
};

function minimalFileDescriptor(overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: 'Data',
        name: 'testFile',
        contentType: AttributeContentType.File,
        properties: defaultProperties,
        ...overrides,
    };
}

test.describe('AttributeFieldFile', () => {
    const noop = () => {};

    test('renders file drop zone when descriptor is visible', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByRole('region', { name: 'File drop zone' })).toBeVisible();
        await expect(page.locator('#testFile-dragAndDrop')).toBeVisible();
    });

    test('renders main label when visible', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor({ properties: { ...defaultProperties, label: 'My File Label' } } as any);
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText('My File Label')).toBeVisible();
    });

    test('does not render drop zone when descriptor.properties.visible is false', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor({
            properties: { ...defaultProperties, visible: false },
        } as any);
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.locator('#testFile-dragAndDrop')).toHaveCount(0);
    });

    test('renders File content label and content input', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText('File content')).toBeVisible();
        await expect(page.locator('#testFile-content')).toBeVisible();
        await expect(page.locator('#testFile-content')).toHaveAttribute('placeholder', /Select or drag & drop/);
    });

    test('renders Content type and File name fields', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText('Content type')).toBeVisible();
        await expect(page.locator('#testFile-mimeType')).toBeVisible();
        await expect(page.getByText('File name')).toBeVisible();
        await expect(page.locator('#testFile-fileName')).toBeVisible();
    });

    test('renders Select file... button and hidden file input', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText('Select file...')).toBeVisible();
        const fileInput = page.locator(`#testFile[type="file"]`);
        await expect(fileInput).toBeAttached();
        await expect(fileInput).toHaveAttribute('type', 'file');
    });

    test('renders hint text about drag and drop', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText(/Select or Drag & Drop file to Drop Zone/)).toBeVisible();
    });

    test('renders description when descriptor.description is set', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor({ description: 'Only PDF files allowed.' } as any);
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByText('Only PDF files allowed.')).toBeVisible();
    });

    test('renders deleteButton when provided', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                deleteButton={<button type="button">Remove file</button>}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={noop}
            />,
        );

        await expect(page.getByRole('button', { name: 'Remove file' })).toBeVisible();
    });

    test('calls onFileChanged when file input changes', async ({ mount, page }) => {
        const descriptor = minimalFileDescriptor();
        let changed = false;
        const onFileChanged = () => {
            changed = true;
        };
        await mount(
            <AttributeFieldFileTestWrapper
                name="testFile"
                descriptor={descriptor}
                onFileDrop={noop}
                onFileDragOver={noop}
                onFileChanged={onFileChanged}
            />,
        );

        const fileInput = page.locator(`#testFile[type="file"]`);
        await fileInput.setInputFiles({
            name: 'dummy.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('hello'),
        });

        expect(changed).toBe(true);
    });
});
