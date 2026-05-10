import { test, expect } from '../../../playwright/ct-test';
import { InstallationInstructions } from './InstallationInstructions';
import { withProviders } from 'utils/test-helpers';

type ClipboardSpy = { lastText: string; calls: number };

declare global {
    interface Window {
        __clipboardSpy?: ClipboardSpy;
    }
    // eslint-disable-next-line no-var
    var __clipboardSpy: ClipboardSpy | undefined;
}

test.describe('InstallationInstructions', () => {
    test('should render with a single instruction string', async ({ mount }) => {
        const component = await mount(
            withProviders(<InstallationInstructions title="Test Installation" instructions="npm install package" />),
        );

        await expect(component.getByText('Test Installation')).toBeVisible();
        await expect(component.getByText('npm install package')).toBeVisible();
    });

    test('should render with multiple instruction strings', async ({ mount }) => {
        const instructions = ['npm install package', 'npm run build', 'npm start'];

        const component = await mount(
            withProviders(<InstallationInstructions title="Multi Step Installation" instructions={instructions} />),
        );

        await expect(component.getByText('Multi Step Installation')).toBeVisible();
        await expect(component.getByText('npm install package')).toBeVisible();
        await expect(component.getByText('npm run build')).toBeVisible();
        await expect(component.getByText('npm start')).toBeVisible();
    });

    test('should apply custom id attribute', async ({ mount }) => {
        const component = await mount(
            withProviders(<InstallationInstructions title="ID Test" instructions="test" id="custom-installation-id" />),
        );

        await expect(component).toBeVisible();
        await expect(component).toHaveAttribute('id', 'custom-installation-id');
    });

    test('should render title in header section', async ({ mount }) => {
        const component = await mount(withProviders(<InstallationInstructions title="Header Title Test" instructions="instruction" />));

        const title = component.getByText('Header Title Test');
        await expect(title).toBeVisible();
        await expect(title).toHaveClass(/text-lg/);
    });

    test('should join array instructions with newlines for clipboard', async ({ mount, page }) => {
        const instructions = ['first command', 'second command', 'third command'];

        await page.evaluate(() => {
            globalThis.__clipboardSpy = { lastText: '', calls: 0 };
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: async (text: string) => {
                        globalThis.__clipboardSpy!.lastText = text;
                        globalThis.__clipboardSpy!.calls += 1;
                    },
                },
                configurable: true,
            });
        });

        const component = await mount(withProviders(<InstallationInstructions title="Clipboard Test" instructions={instructions} />));

        const copyButton = component.getByTestId('copy-instructions-button');

        await copyButton.click();

        await expect.poll(async () => page.evaluate(() => globalThis.__clipboardSpy?.calls ?? 0)).toBe(1);
        const clipboardState = await page.evaluate(() => globalThis.__clipboardSpy);
        expect(clipboardState!.lastText).toBe('first command\nsecond command\nthird command');
    });

    test('should handle empty instructions array gracefully', async ({ mount }) => {
        const component = await mount(withProviders(<InstallationInstructions title="Empty Instructions" instructions={[]} />));

        await expect(component.getByText('Empty Instructions')).toBeVisible();
    });

    test('should handle very long instruction text', async ({ mount }) => {
        const longInstruction = 'npm install ' + 'package-name-'.repeat(50);

        const component = await mount(withProviders(<InstallationInstructions title="Long Text Test" instructions={longInstruction} />));

        await expect(component.getByText(/npm install/)).toBeVisible();
    });

    test('should handle special characters in instructions', async ({ mount }) => {
        const instructions = [
            'export API_KEY="abc$123&test"',
            'curl -X POST https://example.com/api?key=value',
            'echo "Line with | pipe and > redirect"',
        ];

        const component = await mount(
            withProviders(<InstallationInstructions title="Special Characters Test" instructions={instructions} />),
        );

        await expect(component.getByText(/abc\$123&test/)).toBeVisible();
        await expect(component.getByText(/\?key=value/)).toBeVisible();
        await expect(component.getByText(/\| pipe and > redirect/)).toBeVisible();
    });

    test('should split single string by newline characters', async ({ mount }) => {
        const instructions = 'npm install package\nnpm run build\nnpm start';

        const component = await mount(withProviders(<InstallationInstructions title="Newline Split Test" instructions={instructions} />));

        await expect(component.getByText('npm install package')).toBeVisible();
        await expect(component.getByText('npm run build')).toBeVisible();
        await expect(component.getByText('npm start')).toBeVisible();
    });

    test('should split single string with mixed newlines and preserve whitespace', async ({ mount }) => {
        const instructions = 'function example() {\n  console.log("hello");\n    console.log("indented");\n}';

        const component = await mount(
            withProviders(<InstallationInstructions title="Mixed Newlines and Spaces Test" instructions={instructions} />),
        );

        await expect(component.getByText('function example() {')).toBeVisible();
        await expect(component.getByText(/console\.log\("hello"\)/)).toBeVisible();
        await expect(component.getByText(/console\.log\("indented"\)/)).toBeVisible();
        await expect(component.getByText('}')).toBeVisible();
    });

    test('should preserve empty string after newline split', async ({ mount }) => {
        const instructions = 'first line\n\nthird line';

        const component = await mount(withProviders(<InstallationInstructions title="Empty Line Test" instructions={instructions} />));

        await expect(component.getByText('first line')).toBeVisible();
        await expect(component.getByText('third line')).toBeVisible();

        // Check that 3 divs are rendered. The empty line should render with a non-breaking space.
        await expect(component.getByTestId('instruction-line-0')).toBeVisible();
        await expect(component.getByTestId('instruction-line-2')).toBeVisible();
        const emptyLine = component.getByTestId('instruction-line-1');
        await expect(emptyLine).toBeVisible();
        await expect(emptyLine).toHaveText('\u00A0');
    });
});
