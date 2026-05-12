import { test, expect } from '../../../../playwright/ct-test';
import FileUpload from './FileUpload';

const mountEditableFileUpload = async (mount: any) => {
    const calls: string[] = [];
    const component = await mount(
        <div>
            <FileUpload onFileContentLoaded={(c) => calls.push(c)} showContent={true} editable={true} />
        </div>,
    );
    return { component, calls };
};

test.describe('FileUpload', () => {
    test('should render file upload component', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} />
            </div>,
        );

        const fileInput = component.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
    });

    test('should display file content when showContent is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={true} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toBeAttached();
    });

    test('should hide file content when showContent is false', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={false} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await expect(textarea).toHaveCount(0);
    });

    test('should support id prop', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} id="test-file-upload" />
            </div>,
        );

        const fileInput = component.locator('input[type="file"]');
        await expect(fileInput).toHaveAttribute('id', 'test-file-upload__fileUpload__file');
    });

    test('should hide file info fields when showFileInfo is false', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showFileInfo={false} />
            </div>,
        );

        await expect(component.getByText('File name')).toHaveCount(0);
        await expect(component.getByText('Content type')).toHaveCount(0);
    });

    test('should enable textarea when editable is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={true} editable={true} fileType="json" />
            </div>,
        );

        await expect(component.locator('textarea')).not.toBeDisabled();
        await expect(component.getByText('Select or drag & drop json file')).toBeVisible();
    });

    test('should call onFileContentLoaded with base64 content on change (so submit buttons activate on paste, not blur)', async ({
        mount,
    }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        const textarea = component.locator('textarea');
        await textarea.fill('hello');
        expect(calls.length).toBeGreaterThanOrEqual(1);
        expect(calls[calls.length - 1]).toBe(btoa('hello'));
    });

    test('should also call onFileContentLoaded on blur (regression guard for existing flow)', async ({ mount }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        const textarea = component.locator('textarea');
        await textarea.fill('hello');
        const callsAfterFill = calls.length;
        await textarea.blur();
        expect(calls.length).toBe(callsAfterFill + 1);
        expect(calls[calls.length - 1]).toBe(btoa('hello'));
    });

    test('should not call onFileContentLoaded on change when content is empty', async ({ mount }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        const textarea = component.locator('textarea');
        await textarea.fill('hello');
        await textarea.fill('');
        // The empty change should not fire (last fired call must still be the 'hello' one).
        expect(calls.every((c) => c === btoa('hello'))).toBe(true);
    });

    test('should not call onFileContentLoaded on blur when textarea is empty', async ({ mount }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        await component.locator('textarea').blur();
        expect(calls).toHaveLength(0);
    });

    test('should show error message and invalid style when error prop is set', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={true} error="Invalid CSR" />
            </div>,
        );

        await expect(component.getByText('Invalid CSR')).toBeVisible();
        await expect(component.locator('textarea')).toHaveClass(/border-red-500/);
    });

    test('should show required indicator on label when required prop is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={true} required={true} />
            </div>,
        );

        await expect(component.locator('span.text-red-500')).toBeVisible();
    });

    test('should call onContentChange on every keystroke', async ({ mount }) => {
        let changeCount = 0;
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} onContentChange={() => changeCount++} showContent={true} editable={true} />
            </div>,
        );

        const textarea = component.locator('textarea');
        await textarea.pressSequentially('abc');
        expect(changeCount).toBe(3);
    });

    test('should render custom placeholder and drop zone hint text from props', async ({ mount }) => {
        const placeholderText = 'Custom placeholder text';
        const hintText = 'Custom drop zone hint text';

        const component = await mount(
            <div>
                <FileUpload
                    onFileContentLoaded={() => {}}
                    showContent={true}
                    editable={true}
                    contentPlaceholderText={placeholderText}
                    dropZoneHintText={hintText}
                />
            </div>,
        );

        await expect(component.locator('textarea')).toHaveAttribute('placeholder', placeholderText);
        await expect(component.getByText(hintText)).toBeVisible();
    });
});
