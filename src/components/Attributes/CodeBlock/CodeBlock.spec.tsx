import { test, expect } from '../../../../playwright/ct-test';
import { CodeBlockForTest } from './CodeBlockForTest';
import { getHighLightedCode } from './index';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { ProgrammingLanguageEnum } from 'types/openapi';
import type { CodeBlockAttributeContentModel } from 'types/attributes';

function base64Encode(s: string): string {
    if (typeof Buffer === 'undefined') {
        const bytes = new TextEncoder().encode(s);
        let binary = '';
        for (const byte of bytes) binary += String.fromCodePoint(byte);
        return btoa(binary);
    }
    return Buffer.from(s, 'utf8').toString('base64');
}

test.describe('CodeBlock getHighLightedCode', () => {
    test('should return string for valid code and language', () => {
        const result = getHighLightedCode('const x = 1;', ProgrammingLanguageEnum.Javascript);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    test('should handle null/empty code', () => {
        expect(getHighLightedCode('', ProgrammingLanguageEnum.Javascript)).toBe('');
        expect(getHighLightedCode(null as any, ProgrammingLanguageEnum.Javascript)).toBe('');
    });

    test('should return code unchanged when highlight throws', () => {
        const code = 'invalid {{';
        const result = getHighLightedCode(code, 'unknown-lang' as ProgrammingLanguageEnum);
        expect(result).toBe(code);
    });

    test('should return HTML with span for highlighted code', () => {
        const result = getHighLightedCode('const x = 1;', ProgrammingLanguageEnum.Javascript);
        expect(result).toContain('span');
    });
});

test.describe('CodeBlock component', () => {
    test('renders language and open button', async ({ mount, page }) => {
        const content: CodeBlockAttributeContentModel = {
            data: {
                code: base64Encode('print(1)'),
                language: ProgrammingLanguageEnum.Python,
            },
        };
        const store = createMockStore();
        await mount(withProviders(<CodeBlockForTest content={content} />, { store }));
        await expect(page.getByTestId('code-block')).toBeVisible();
        await expect(page.getByText(ProgrammingLanguageEnum.Python)).toBeVisible();
        await expect(page.getByTestId('code-block-open-btn')).toBeVisible();
    });

    test('dispatches showGlobalModal when open button is clicked', async ({ mount, page }) => {
        const content: CodeBlockAttributeContentModel = {
            data: {
                code: base64Encode('const a = 1;'),
                language: ProgrammingLanguageEnum.Javascript,
            },
        };
        const store = createMockStore();
        await mount(withProviders(<CodeBlockForTest content={content} />, { store }));
        await page.getByTestId('code-block-open-btn').click();
        const state = store.getState();
        expect(state.userInterface.globalModal.isOpen).toBe(true);
        expect(state.userInterface.globalModal.title).toBe(`${ProgrammingLanguageEnum.Javascript} code block`);
        expect(state.userInterface.globalModal.size).toBe('xl');
        expect(state.userInterface.globalModal.showCloseButton).toBe(true);
    });

    test('handles content with null code', async ({ mount, page }) => {
        const content: CodeBlockAttributeContentModel = {
            data: {
                code: undefined as any,
                language: ProgrammingLanguageEnum.Json,
            },
        };
        const store = createMockStore();
        await mount(withProviders(<CodeBlockForTest content={content} />, { store }));
        await expect(page.getByTestId('code-block')).toBeVisible();
        await page.getByTestId('code-block-open-btn').click();
        const state = store.getState();
        expect(state.userInterface.globalModal.isOpen).toBe(true);
        expect(state.userInterface.globalModal.title).toBe(`${ProgrammingLanguageEnum.Json} code block`);
    });

    test('opens modal with raw code when highlight throws (invalid language)', async ({ mount, page }) => {
        const rawCode = 'invalid {{';
        const content: CodeBlockAttributeContentModel = {
            data: {
                code: base64Encode(rawCode),
                language: 'unknown-lang' as ProgrammingLanguageEnum,
            },
        };
        const store = createMockStore();
        await mount(withProviders(<CodeBlockForTest content={content} />, { store }));
        await page.getByTestId('code-block-open-btn').click();
        const state = store.getState();
        expect(state.userInterface.globalModal.isOpen).toBe(true);
        expect(state.userInterface.globalModal.title).toBe('unknown-lang code block');
    });
});
