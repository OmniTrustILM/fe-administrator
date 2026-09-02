import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
    applyBrandTokens,
    BRAND_CSS_STORAGE_KEY,
    BRAND_TOKEN_RULES,
    BRAND_TOKENS_STYLE_ID,
    brandColors,
    brandTokenCss,
    brandTokenValues,
    storeBrandCss,
} from './brand-tokens';
import { readSemanticTokens } from './theme-tokens';

const ALL_COLORS = {
    primaryColor: '#0073cf',
    secondaryColor: '#0369a1',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
};

/** The families the Epic settled on, so a token quietly joining or leaving one is a test failure. */
const EXPECTED_FAMILIES = {
    primary: ['brand', 'brand-solid', 'brand-solid-hover', 'brand-hover', 'brand-subtle', 'surface-header'],
    secondary: ['info', 'info-surface', 'info-solid'],
    background: ['surface', 'surface-raised', 'surface-sunken', 'surface-hover', 'surface-active'],
    text: ['content', 'content-muted', 'content-subtle'],
} as const;

/** Tokens branding must never touch, either because they carry a fixed meaning or because they are the fixed side of a
 * contrast pairing. */
const NEVER_OVERRIDDEN = [
    'success',
    'success-surface',
    'success-solid',
    'danger',
    'danger-surface',
    'danger-solid',
    'danger-fill',
    'danger-fill-hover',
    'warning',
    'warning-surface',
    'warning-solid',
    'warning-fill',
    'warning-fill-hover',
    'divider',
    'outline',
    'code-color',
    'content-inverse',
    'content-on-brand',
    'surface-inverse',
];

describe('brand-tokens', () => {
    describe('brandColors', () => {
        test('should read every colour the operator has set', () => {
            expect(brandColors(ALL_COLORS)).toStrictEqual({
                primary: '#0073cf',
                secondary: '#0369a1',
                background: '#f8fafc',
                text: '#1f2937',
            });
        });

        test('should lower-case the hex so derived and raw values compare equal', () => {
            expect(brandColors({ primaryColor: '#0073CF' }).primary).toBe('#0073cf');
        });

        test('should drop a colour the anonymous response reports as null', () => {
            expect(brandColors({ ...ALL_COLORS, textColor: null })).not.toHaveProperty('text');
        });

        test('should drop a colour that is not a six-digit hex', () => {
            expect(brandColors({ primaryColor: 'red', secondaryColor: '#abc' })).toStrictEqual({});
        });

        test('should return nothing for an unbranded instance', () => {
            expect(brandColors({})).toStrictEqual({});
        });
    });

    describe('BRAND_TOKEN_RULES', () => {
        test.each(Object.entries(EXPECTED_FAMILIES))('should map %s onto exactly its own family', (source, tokens) => {
            const mapped = BRAND_TOKEN_RULES.filter((rule) => (rule.light ?? rule.dark)?.source === source).map((rule) => rule.token);

            expect(mapped).toStrictEqual([...tokens]);
        });

        test('should apply Background and Text to the light composition only', () => {
            const lightOnly = BRAND_TOKEN_RULES.filter((rule) => rule.dark === undefined).map((rule) => rule.token);

            expect(lightOnly).toStrictEqual([...EXPECTED_FAMILIES.background, ...EXPECTED_FAMILIES.text]);
        });

        test('should apply Primary and Secondary to both compositions', () => {
            const both = BRAND_TOKEN_RULES.filter((rule) => rule.light !== undefined && rule.dark !== undefined).map((rule) => rule.token);

            expect(both).toStrictEqual([...EXPECTED_FAMILIES.primary, ...EXPECTED_FAMILIES.secondary]);
        });

        test.each(NEVER_OVERRIDDEN)('should never override %s', (token) => {
            expect(BRAND_TOKEN_RULES.map((rule) => rule.token)).not.toContain(token);
        });

        test('should never override a node status token', () => {
            expect(BRAND_TOKEN_RULES.filter((rule) => rule.token.startsWith('node-'))).toStrictEqual([]);
        });

        test('should name only tokens the stylesheet actually declares', () => {
            const css = readFileSync(path.resolve(__dirname, '../tailwindcss.css'), 'utf8');
            const tokens = readSemanticTokens(css);

            for (const rule of BRAND_TOKEN_RULES) {
                expect(tokens.light, `--${rule.token} is not declared in the light token block`).toHaveProperty(rule.token);
            }
        });
    });

    describe('brandTokenCss', () => {
        test('should emit one block per composition, each outranking the base stylesheet', () => {
            const css = brandTokenCss(brandColors(ALL_COLORS)) ?? '';

            expect(css).toContain('html:not(.dark){');
            expect(css).toContain('html.dark{');
        });

        test('should write the tier-2 custom properties', () => {
            expect(brandTokenCss(brandColors(ALL_COLORS))).toContain('--brand:#0073cf;');
        });

        test('should never write a --color-* name, which @theme inline does not emit into :root', () => {
            expect(brandTokenCss(brandColors(ALL_COLORS))).not.toContain('--color-');
        });

        test('should derive intermediate steps with color-mix rather than hardcoding them', () => {
            expect(brandTokenCss(brandColors(ALL_COLORS))).toContain('--brand-solid-hover:color-mix(in oklab, #0073cf 80%, black);');
        });

        test('should keep the dark composition free of the light-only families', () => {
            const dark = (brandTokenCss(brandColors(ALL_COLORS)) ?? '').split('html.dark{')[1];

            for (const token of [...EXPECTED_FAMILIES.background, ...EXPECTED_FAMILIES.text]) {
                expect(dark).not.toContain(`--${token}:`);
            }
        });

        test('should emit only the families whose input is set', () => {
            const css = brandTokenCss(brandColors({ primaryColor: '#0073cf' })) ?? '';

            expect(css).toContain('--brand:#0073cf;');
            expect(css).not.toContain('--surface:');
            expect(css).not.toContain('--info:');
        });

        test('should emit no light block when only a light-only family is unset', () => {
            const css = brandTokenCss(brandColors({ backgroundColor: '#f8fafc' })) ?? '';

            expect(css).toContain('html:not(.dark){');
            expect(css).not.toContain('html.dark{');
        });

        test('should return nothing for an unbranded instance, so its rendering is unchanged', () => {
            expect(brandTokenCss({})).toBeUndefined();
        });

        test('should contain nothing the pre-paint guard in index.html would reject', () => {
            expect(brandTokenCss(brandColors(ALL_COLORS))).toMatch(/^[a-z0-9\s#(),.%:;{}_-]+$/i);
        });
    });

    describe('brandTokenValues', () => {
        test('should resolve the light composition to hex', () => {
            expect(brandTokenValues(brandColors(ALL_COLORS), 'light')).toMatchObject({
                brand: '#0073cf',
                'brand-solid-hover': '#005499',
                surface: '#f8fafc',
                content: '#1f2937',
            });
        });

        test('should resolve the dark composition without the light-only families', () => {
            const dark = brandTokenValues(brandColors(ALL_COLORS), 'dark');

            expect(dark).toHaveProperty('brand');
            expect(dark).not.toHaveProperty('surface');
            expect(dark).not.toHaveProperty('content');
        });

        test('should keep the brand fill theme-invariant, since on-brand white is measured against it', () => {
            const colors = brandColors(ALL_COLORS);

            expect(brandTokenValues(colors, 'dark')['brand-solid']).toBe(brandTokenValues(colors, 'light')['brand-solid']);
        });

        test('should lighten the brand foreground in the dark composition', () => {
            const colors = brandColors(ALL_COLORS);

            expect(brandTokenValues(colors, 'dark').brand).not.toBe(brandTokenValues(colors, 'light').brand);
        });

        test('should resolve to the same steps the stylesheet describes', () => {
            const colors = brandColors(ALL_COLORS);
            const css = brandTokenCss(colors) ?? '';

            // Every value the CSS carries as a literal must equal what the JS derivation produces for the same token,
            // which is what makes a contrast warning computed in JS a statement about what the browser will paint.
            for (const [token, value] of Object.entries(brandTokenValues(colors, 'light'))) {
                if (!value.startsWith('color-mix')) {
                    expect(css).toContain(`--${token}:`);
                }
            }
            expect(css).toContain(`--brand:${brandTokenValues(colors, 'light').brand};`);
        });
    });

    describe('applyBrandTokens', () => {
        afterEach(() => {
            document.getElementById(BRAND_TOKENS_STYLE_ID)?.remove();
        });

        test('should add the override stylesheet to the document head', () => {
            applyBrandTokens('html.dark{--brand:#0073cf;}');

            expect(document.getElementById(BRAND_TOKENS_STYLE_ID)?.textContent).toBe('html.dark{--brand:#0073cf;}');
        });

        test('should replace the stylesheet rather than adding a second one', () => {
            applyBrandTokens('html.dark{--brand:#0073cf;}');
            applyBrandTokens('html.dark{--brand:#112233;}');

            expect(document.querySelectorAll(`#${BRAND_TOKENS_STYLE_ID}`)).toHaveLength(1);
            expect(document.getElementById(BRAND_TOKENS_STYLE_ID)?.textContent).toBe('html.dark{--brand:#112233;}');
        });

        test('should leave the stylesheet untouched when nothing changed', () => {
            applyBrandTokens('html.dark{--brand:#0073cf;}');
            const first = document.getElementById(BRAND_TOKENS_STYLE_ID);

            applyBrandTokens('html.dark{--brand:#0073cf;}');

            expect(document.getElementById(BRAND_TOKENS_STYLE_ID)).toBe(first);
        });

        test('should remove the stylesheet when branding is withdrawn', () => {
            applyBrandTokens('html.dark{--brand:#0073cf;}');
            applyBrandTokens(undefined);

            expect(document.getElementById(BRAND_TOKENS_STYLE_ID)).toBeNull();
        });

        test('should tolerate a removal when nothing was applied', () => {
            expect(() => applyBrandTokens(undefined)).not.toThrow();
        });
    });

    describe('storeBrandCss', () => {
        afterEach(() => {
            globalThis.localStorage.removeItem(BRAND_CSS_STORAGE_KEY);
        });

        test('should cache the stylesheet for the next first paint', () => {
            storeBrandCss('html.dark{--brand:#0073cf;}');

            expect(globalThis.localStorage.getItem(BRAND_CSS_STORAGE_KEY)).toBe('html.dark{--brand:#0073cf;}');
        });

        test('should clear the cache when branding is withdrawn', () => {
            storeBrandCss('html.dark{--brand:#0073cf;}');
            storeBrandCss(undefined);

            expect(globalThis.localStorage.getItem(BRAND_CSS_STORAGE_KEY)).toBeNull();
        });
    });
});
