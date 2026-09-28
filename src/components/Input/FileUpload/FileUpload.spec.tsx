import { test, expect } from '../../../../playwright/ct-test';
import { completeFileRead, failFileRead, holdFileReads } from '../../../../playwright/fileReads';
import FileUpload from './FileUpload';

const aFile = (name: string, content: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(content) });
const base64 = (content: string) => Buffer.from(content).toString('base64');

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
        expect(calls.at(-1)).toBe(btoa('hello'));
    });

    test('should also call onFileContentLoaded on blur (regression guard for existing flow)', async ({ mount }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        const textarea = component.locator('textarea');
        await textarea.fill('hello');
        const callsAfterFill = calls.length;
        await textarea.blur();
        expect(calls).toHaveLength(callsAfterFill + 1);
        expect(calls.at(-1)).toBe(btoa('hello'));
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
        await expect(component.locator('textarea')).toHaveClass(/border-danger/);
    });

    test('should show required indicator on label when required prop is true', async ({ mount }) => {
        const component = await mount(
            <div>
                <FileUpload onFileContentLoaded={() => {}} showContent={true} required={true} />
            </div>,
        );

        await expect(component.locator('span.text-danger')).toBeVisible();
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

    test('reports a chosen file on a later blur of the content area, never an earlier paste', async ({ mount }) => {
        const { component, calls } = await mountEditableFileUpload(mount);
        await component.locator('textarea').fill('pasted');

        await component.locator('input[type="file"]').setInputFiles(aFile('chosen.pem', 'chosen'));
        await expect.poll(() => calls.at(-1)).toBe(base64('chosen'));
        await component.locator('textarea').focus();
        await component.locator('textarea').blur();

        expect(calls.at(-1)).toBe(base64('chosen'));
        expect(calls.slice(calls.indexOf(base64('chosen')))).not.toContain(btoa('pasted'));
    });

    test('ignores the read of an earlier file that completes after a newer one', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} />);
        await holdFileReads(page);
        const input = component.locator('input[type="file"]');

        await input.setInputFiles(aFile('first.pem', 'first'));
        await input.setInputFiles(aFile('second.pem', 'second'));
        await completeFileRead(page, 1);
        await completeFileRead(page, 0);

        expect(calls).toEqual([base64('second')]);
        await expect(component.getByLabel('File name')).toHaveValue('second.pem');
    });

    test('says a file cannot be read and, with nothing loaded before, reports nothing', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} />);
        await holdFileReads(page);

        await component.locator('input[type="file"]').setInputFiles(aFile('unreadable.p12', 'unreadable'));
        await failFileRead(page, 0);

        await expect(component.getByRole('alert')).toHaveText('The file unreadable.p12 could not be read.');
        expect(calls).toEqual([]);
    });

    test('keeps the loaded file when another cannot be read, and reports its content again', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} />);
        await holdFileReads(page);
        const input = component.locator('input[type="file"]');
        await input.setInputFiles(aFile('loaded.pem', 'loaded'));
        await completeFileRead(page, 0);

        await input.setInputFiles(aFile('unreadable.p12', 'unreadable'));
        await failFileRead(page, 1);

        await expect(component.getByRole('alert')).toHaveText('The file unreadable.p12 could not be read.');
        await expect(component.getByLabel('File name')).toHaveValue('loaded.pem');
        await expect.poll(() => calls).toEqual([base64('loaded'), base64('loaded')]);
    });

    test('keeps text typed while a chosen file is still being read, and reports the text', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} editable />);
        await holdFileReads(page);
        await component.locator('input[type="file"]').setInputFiles(aFile('late.pem', 'late'));
        await component.locator('textarea').fill('typed');

        await completeFileRead(page, 0);
        await component.locator('textarea').blur();

        await expect(component.locator('textarea')).toHaveValue('typed');
        expect(calls).not.toContain(base64('late'));
        expect(calls.at(-1)).toBe(btoa('typed'));
    });

    test('clears a read error once text is typed in place of the file', async ({ mount, page }) => {
        const component = await mount(<FileUpload onFileContentLoaded={() => {}} editable />);
        await holdFileReads(page);
        await component.locator('input[type="file"]').setInputFiles(aFile('unreadable.p12', 'unreadable'));
        await failFileRead(page, 0);
        await expect(component.getByRole('alert')).toHaveText('The file unreadable.p12 could not be read.');

        await component.locator('textarea').fill('typed');

        await expect(component.getByRole('alert')).toHaveCount(0);
    });

    test('does nothing with a read that completes after it is unmounted', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} />);
        await holdFileReads(page);
        await component.locator('input[type="file"]').setInputFiles(aFile('late.pem', 'late'));

        await component.unmount();
        await completeFileRead(page, 0);

        expect(calls).toEqual([]);
    });

    test('calls onContentChange as soon as a chosen file starts to be read', async ({ mount, page }) => {
        let changeCount = 0;
        const component = await mount(<FileUpload onFileContentLoaded={() => {}} onContentChange={() => changeCount++} />);
        await holdFileReads(page);

        await component.locator('input[type="file"]').setInputFiles(aFile('slow.pem', 'slow'));

        await expect(() => expect(changeCount).toBe(1)).toPass();
    });

    test('opens the file chooser from the keyboard, through a labelled file control', async ({ mount, page }) => {
        const calls: string[] = [];
        const component = await mount(<FileUpload onFileContentLoaded={(content) => calls.push(content)} />);

        const fileChooser = page.waitForEvent('filechooser', { timeout: 5000 });
        await component.getByRole('button', { name: 'Select file...' }).press('Enter');
        await (await fileChooser).setFiles(aFile('keyboard.pem', 'keyboard'));

        await expect.poll(() => calls).toEqual([base64('keyboard')]);
        await expect(component.getByLabel('Select file', { exact: true })).toHaveAttribute('type', 'file');
    });
});
