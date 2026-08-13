import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { compositeOver, contrastRatio } from './contrast';
import { readSemanticTokens } from './theme-tokens';

const AA_BODY = 4.5;
// WCAG 1.4.11 non-text contrast: UI component boundaries and meaningful graphics (form-control
// borders, status dots, chart series) need only 3:1, not the 4.5:1 required for body text.
const AA_NON_TEXT = 3;

const css = readFileSync(path.resolve(__dirname, '../tailwindcss.css'), 'utf8');
const tokens = readSemanticTokens(css);

/** Resolves a test-table text reference: a bare hex literal, or the name of a token to look up. */
const resolveColour = (theme: 'light' | 'dark', reference: string): string =>
    reference.startsWith('#') ? reference : tokens[theme][reference];

describe('theme-tokens', () => {
    describe('readSemanticTokens', () => {
        test('should read light tokens from the :root block', () => {
            expect(tokens.light['surface-raised']).toBe('#ffffff');
        });

        test('should read dark tokens from the .dark block', () => {
            expect(tokens.dark['surface-raised']).toBe('#171717');
        });

        test('should ignore declarations outside the token blocks', () => {
            expect(tokens.light).not.toHaveProperty('header-height');
        });
    });

    describe.each(['light', 'dark'] as const)('%s theme contrast', (theme) => {
        const token = (name: string) => tokens[theme][name];

        test.each([
            ['content', 'surface'],
            ['content', 'surface-raised'],
            ['content', 'surface-sunken'],
            ['content-muted', 'surface'],
            ['content-muted', 'surface-raised'],
            ['content-subtle', 'surface-raised'],
            ['brand', 'surface-raised'],
            ['content-on-brand', 'surface-header'],
            ['success', 'success-surface'],
            ['danger', 'danger-surface'],
            ['warning', 'warning-surface'],
            ['info', 'info-surface'],
            ['node-default-text', 'surface-raised'],
        ])('should meet AA body contrast for %s on %s', (foreground, background) => {
            expect(contrastRatio(token(foreground), token(background))).toBeGreaterThanOrEqual(AA_BODY);
        });

        test('should meet AA body contrast for inverse content on the inverse surface', () => {
            expect(contrastRatio(token('content-inverse'), token('surface-inverse'))).toBeGreaterThanOrEqual(AA_BODY);
        });

        test('should meet AA body contrast for on-brand content on the brand fill', () => {
            expect(contrastRatio(token('content-on-brand'), token('brand-solid'))).toBeGreaterThanOrEqual(AA_BODY);
        });

        test('should meet AA body contrast for on-brand content on the danger fill', () => {
            expect(contrastRatio(token('content-on-brand'), token('danger-fill'))).toBeGreaterThanOrEqual(AA_BODY);
        });

        test('should meet AA body contrast for on-brand content on the warning fill', () => {
            expect(contrastRatio(token('content-on-brand'), token('warning-fill'))).toBeGreaterThanOrEqual(AA_BODY);
        });

        test('should meet AA non-text contrast for the resting input border on the raised surface', () => {
            expect(contrastRatio(token('outline'), token('surface-raised'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
        });

        test.each(['success-solid', 'danger-solid', 'warning-solid', 'info-solid'])(
            'should meet AA non-text contrast for %s on the raised surface',
            (foreground) => {
                expect(contrastRatio(token(foreground), token('surface-raised'))).toBeGreaterThanOrEqual(AA_NON_TEXT);
            },
        );

        // CustomFlowNode's expand-button fills, checked at their full (opaque) token value against
        // the raised surface they sit on.
        //
        // Five fills sit under 3:1 in light mode and are deliberately not asserted there:
        // node-valid, node-expiring, node-unchecked, node-danger-action and node-default-fill.
        // WCAG 1.4.11 requires 3:1 for a control's boundary only when the boundary is what
        // identifies the control. These buttons are identified by the count they render, and that
        // text is asserted below at 4.5:1 against every fill, alpha level and theme — so the
        // requirement is met through the label rather than the fill. Darkening the fills would
        // mean abandoning their alpha blending, which is what gives the flow chart its per-status
        // visual language.
        test.each([
            ['node-valid', 'dark'],
            ['node-expired', 'light'],
            ['node-expired', 'dark'],
            ['node-revoked', 'light'],
            ['node-revoked', 'dark'],
            ['node-expiring', 'dark'],
            ['node-invalid', 'light'],
            ['node-invalid', 'dark'],
            ['node-unchecked', 'dark'],
            ['node-failed', 'light'],
            ['node-failed', 'dark'],
            ['node-inactive', 'light'],
            ['node-inactive', 'dark'],
            ['node-default', 'light'],
            ['node-default', 'dark'],
            ['node-danger-action', 'dark'],
            ['node-default-fill', 'dark'],
        ] as const)('should meet AA non-text contrast for %s in the %s theme against the raised surface', (fillToken, fillTheme) => {
            expect(contrastRatio(tokens[fillTheme][fillToken], tokens[fillTheme]['surface-raised'])).toBeGreaterThanOrEqual(AA_NON_TEXT);
        });
    });

    // The expand button's icon is drawn with `currentColor` over its alpha-blended fill, composited
    // over the raised surface behind it. Each row mirrors one `!bg-.../<alpha> !text-...` pairing
    // actually used in CustomFlowNode/index.tsx (see getExpandButtonStatusClasses), so a change to
    // either the fill token or the chosen icon colour there is caught here too.
    describe.each(['light', 'dark'] as const)('%s theme node button icon contrast', (theme) => {
        test.each([
            ['valid base', 'node-valid', 62, 'node-icon'],
            ['valid hover', 'node-valid', 93, '#000000'],
            ['valid active', 'node-valid', 85, '#000000'],
            ['expired base', 'node-expired', 64, 'node-icon'],
            ['expired hover/active', 'danger-solid', 100, '#000000'],
            ['revoked base', 'node-revoked', 72, 'node-icon-inverse'],
            ['revoked hover/active', 'node-revoked', 100, 'node-icon-inverse'],
            ['expiring base', 'node-expiring', 65, '#000000'],
            ['expiring hover', 'node-expiring', 93, '#000000'],
            ['expiring active', 'node-expiring', 85, '#000000'],
            ['invalid base', 'node-invalid', 64, 'content-on-brand'],
            ['invalid hover', 'node-invalid', 93, 'content-on-brand'],
            ['invalid active', 'node-invalid', 85, 'content-on-brand'],
            ['unchecked base', 'node-unchecked', 63, 'node-icon'],
            ['unchecked hover', 'node-unchecked', 93, '#000000'],
            ['unchecked active', 'node-unchecked', 85, '#000000'],
            ['failed base', 'node-failed', 64, 'node-icon'],
            ['failed hover/active', 'node-failed', 93, 'node-icon-inverse'],
            ['inactive base', 'node-inactive', 63, 'node-icon'],
            ['inactive hover', 'node-inactive', 93, 'node-icon'],
            ['inactive active', 'node-inactive', 85, 'node-icon'],
            ['danger-action base', 'node-danger-action', 100, '#000000'],
            ['danger-action hover', 'danger-solid', 93, '#000000'],
            ['danger-action active', 'danger-solid', 85, 'node-icon'],
            ['default base', 'node-default-fill', 100, '#000000'],
            ['default hover', 'node-default', 93, 'content-on-brand'],
            ['default active', 'node-default', 85, 'content-on-brand'],
        ] as const)('should meet AA body contrast for the %s icon', (_label, fillToken, alphaPercent, textReference) => {
            const fill = compositeOver(tokens[theme][fillToken], tokens[theme]['surface-raised'], alphaPercent);
            const text = resolveColour(theme, textReference);

            expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(AA_BODY);
        });
    });

    describe('readSemanticTokens with synthetic CSS', () => {
        // The block-matching regexes require `:root`/`.dark` to start a line (as real stylesheets do),
        // so these fixtures are built line-by-line rather than as an indented template literal.
        test('should parse a normal two-block stylesheet', () => {
            const syntheticCss = [
                ':root {',
                '    --surface-raised: #ffffff;',
                '    --content: #111111;',
                '}',
                '.dark {',
                '    --surface-raised: #000000;',
                '    --content: #eeeeee;',
                '}',
            ].join('\n');

            expect(readSemanticTokens(syntheticCss)).toEqual({
                light: { 'surface-raised': '#ffffff', content: '#111111' },
                dark: { 'surface-raised': '#000000', content: '#eeeeee' },
            });
        });

        test('should locate the semantic block by content even when it is not the first :root block', () => {
            const syntheticCss = [
                ':root {',
                '    --unrelated-legacy-var: #123456;',
                '}',
                ':root {',
                '    --surface-raised: #ffffff;',
                '    --content: #111111;',
                '}',
                '.dark {',
                '    --surface-raised: #000000;',
                '    --content: #eeeeee;',
                '}',
            ].join('\n');

            expect(readSemanticTokens(syntheticCss)).toEqual({
                light: { 'surface-raised': '#ffffff', content: '#111111' },
                dark: { 'surface-raised': '#000000', content: '#eeeeee' },
            });
        });

        test('should throw a descriptive error when no block declares the marker token', () => {
            const syntheticCss = [':root {', '    --content: #111111;', '}', '.dark {', '    --content: #eeeeee;', '}'].join('\n');

            expect(() => readSemanticTokens(syntheticCss)).toThrow('no :root block declaring --surface-raised was found');
        });

        test('should throw a descriptive error naming tokens missing from the dark block', () => {
            const syntheticCss = [
                ':root {',
                '    --surface-raised: #ffffff;',
                '    --content: #111111;',
                '    --extra-light-only: #ff00ff;',
                '}',
                '.dark {',
                '    --surface-raised: #000000;',
                '    --content: #eeeeee;',
                '}',
            ].join('\n');

            expect(() => readSemanticTokens(syntheticCss)).toThrow('missing from .dark: extra-light-only');
        });

        test('should throw a descriptive error naming tokens missing from the light block', () => {
            const syntheticCss = [
                ':root {',
                '    --surface-raised: #ffffff;',
                '    --content: #111111;',
                '}',
                '.dark {',
                '    --surface-raised: #000000;',
                '    --content: #eeeeee;',
                '    --extra-dark-only: #00ff00;',
                '}',
            ].join('\n');

            expect(() => readSemanticTokens(syntheticCss)).toThrow('missing from :root: extra-dark-only');
        });
    });
});
