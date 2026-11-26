import { test, expect } from '../../../../../playwright/ct-test';
import { AttributeFieldFileTestWrapper } from './AttributeFieldFileTestWrapper';
import type { DataAttributeModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

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

    test.describe('required file validation feedback', () => {
        const requiredDescriptor = minimalFileDescriptor({
            type: AttributeType.Data,
            properties: { ...defaultProperties, required: true },
        });

        test('shows the required error after a submit attempt without the field being touched', async ({ mount, page }) => {
            await mount(
                <AttributeFieldFileTestWrapper
                    name="testFile"
                    descriptor={requiredDescriptor}
                    onFileDrop={noop}
                    onFileDragOver={noop}
                    onFileChanged={noop}
                    withSubmit
                />,
            );
            const content = page.locator('#testFile-content');
            await expect(page.getByText('Required Field')).toHaveCount(0);
            await expect(content).not.toHaveAttribute('aria-invalid');

            await page.getByRole('button', { name: 'Submit' }).click();

            const error = page.getByText('Required Field');
            await expect(error).toBeVisible();
            await expect(content).toHaveAttribute('aria-invalid', 'true');
            await expect(content).toHaveAttribute('aria-describedby', 'testFile-content-error');
            const errorColor = await error.evaluate((el) => getComputedStyle(el).color);
            await expect(content).toHaveCSS('border-top-color', errorColor);
        });

        test('shows the required error once the field is left', async ({ mount, page }) => {
            await mount(
                <AttributeFieldFileTestWrapper
                    name="testFile"
                    descriptor={requiredDescriptor}
                    onFileDrop={noop}
                    onFileDragOver={noop}
                    onFileChanged={noop}
                    mode="onChange"
                    validateOnMount
                    withNextField
                />,
            );
            await expect(page.getByText('Required Field')).toHaveCount(0);

            await page.locator('#testFile-content').focus();
            await page.getByRole('textbox', { name: 'Next field' }).focus();

            await expect(page.getByText('Required Field')).toBeVisible();
        });
    });

    test.describe('image preview', () => {
        const pixels = {
            'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
            'image/jpeg':
                '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/wAALCAABAAEBAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/ACv/2Q==',
        };

        for (const [mimeType, pixel] of Object.entries(pixels)) {
            test(`previews a ${mimeType} file`, async ({ mount, page }) => {
                await mount(
                    <AttributeFieldFileTestWrapper
                        name="testFile"
                        descriptor={minimalFileDescriptor()}
                        onFileDrop={noop}
                        onFileDragOver={noop}
                        onFileChanged={noop}
                        initialFile={{ content: pixel, fileName: 'stamp', mimeType }}
                    />,
                );

                const preview = page.getByRole('img', { name: 'Test File' });
                await expect(preview).toHaveAttribute('src', `data:${mimeType};base64,${pixel}`);
                await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
            });
        }

        test('shows no preview for a file a browser does not draw', async ({ mount, page }) => {
            await mount(
                <AttributeFieldFileTestWrapper
                    name="testFile"
                    descriptor={minimalFileDescriptor()}
                    onFileDrop={noop}
                    onFileDragOver={noop}
                    onFileChanged={noop}
                    initialFile={{ content: 'Wm9uZQ==', fileName: 'zone.pem', mimeType: 'text/plain' }}
                />,
            );

            await expect(page.locator('#testFile-content')).toHaveValue('Wm9uZQ==');
            await expect(page.getByRole('img')).toHaveCount(0);
        });

        test('shows no preview without a file', async ({ mount, page }) => {
            await mount(
                <AttributeFieldFileTestWrapper
                    name="testFile"
                    descriptor={minimalFileDescriptor()}
                    onFileDrop={noop}
                    onFileDragOver={noop}
                    onFileChanged={noop}
                    initialFile={{ content: '', fileName: '', mimeType: 'image/png' }}
                />,
            );

            await expect(page.getByRole('region', { name: 'File drop zone' })).toBeVisible();
            await expect(page.getByRole('img')).toHaveCount(0);
        });
    });
});
