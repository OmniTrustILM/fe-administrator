import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
    applyBrandTokens,
    BRAND_CSS_STORAGE_KEY,
    BRAND_DEFAULT_COLORS,
    BRAND_TOKEN_RULES,
    BRAND_TOKENS_STYLE_ID,
    brandColors,
    brandTokenCss,
    brandTokenSources,
    brandTokenValues,
    isBrandedUtility,
    storeBrandCss,
} from './brand-tokens';
import type { BrandColorKey } from './brand-tokens';
import { readSemanticTokens } from './theme-tokens';

const ALL_COLORS = {
    primaryColor: '#0073cf',
    secondaryColor: '#0369a1',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
};

/** The families each brand colour drives, so a token quietly joining or leaving one is a test failure. */
const EXPECTED_FAMILIES = {
    primary: ['brand', 'brand-solid', 'brand-solid-hover', 'brand-hover', 'brand-subtle', 'surface-header'],
    secondary: ['info', 'info-surface', 'info-solid'],
    background: ['surface', 'surface-raised', 'surface-sunken', 'surface-hover', 'surface-active'],
    text: ['content', 'content-muted', 'content-subtle', 'content-hint'],
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

    /**
     * A colour leads several tokens unmixed - Secondary drives `info` and `info-solid` alike, at different platform
     * values - so the one an unset field falls back to is named here rather than derived.
     */
    const LEADING_TOKEN: Record<BrandColorKey, string> = { primary: 'brand', secondary: 'info', background: 'surface', text: 'content' };

    /**
     * Enumerated from the colours rather than from the table above: specs are excluded from the typecheck gate, so the
     * annotation on `LEADING_TOKEN` is the one thing a new colour could slip past, and a row missing its token has to
     * fail here instead.
     */
    const PINNED = (Object.keys(BRAND_DEFAULT_COLORS) as BrandColorKey[]).map((color) => [color, LEADING_TOKEN[color]] as const);

    describe('BRAND_DEFAULT_COLORS', () => {
        const tokens = readSemanticTokens(readFileSync(path.resolve(__dirname, '../tailwindcss.css'), 'utf8'));

        test.each(PINNED)('should hold %s at the light-theme value of --%s', (color, token) => {
            expect(BRAND_DEFAULT_COLORS[color].toLowerCase()).toBe(tokens.light[token]);
        });

        test.each(PINNED)('should keep %s the colour that replaces --%s outright', (color, token) => {
            const rule = BRAND_TOKEN_RULES.find((candidate) => candidate.token === token);

            expect(rule?.light).toStrictEqual({ source: color });
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

        test('should emit no dark block when only a light-only family is set', () => {
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

    /**
     * Attribution is only honest while both readings cover the same tokens: one says what a token becomes, the other
     * which input it came from, and they walk the rule table separately.
     */
    describe('brandTokenSources', () => {
        test.each(['light', 'dark'] as const)('should cover exactly the tokens brandTokenValues resolves in %s', (theme) => {
            const colors = brandColors(ALL_COLORS);

            expect(Object.keys(brandTokenSources(colors, theme)).sort()).toStrictEqual(Object.keys(brandTokenValues(colors, theme)).sort());
        });

        test.each(['light', 'dark'] as const)('should cover the same tokens for a partly set brand in %s', (theme) => {
            const colors = brandColors({ primaryColor: '#0073cf', textColor: '#1f2937' });

            expect(Object.keys(brandTokenSources(colors, theme)).sort()).toStrictEqual(Object.keys(brandTokenValues(colors, theme)).sort());
        });

        test('should name the input each token derives from', () => {
            expect(brandTokenSources(brandColors(ALL_COLORS), 'light')).toMatchObject({
                brand: 'primary',
                info: 'secondary',
                surface: 'background',
                content: 'text',
            });
        });
    });

    /**
     * The guard the contrast dialog is checked against, so a spelling it misses is a branded colour that suite lets
     * through. One case per utility family and per way of naming a token, since a regexp silently covers neither.
     */
    describe('isBrandedUtility', () => {
        test.each([
            'bg-surface-raised',
            'text-content-muted',
            'border-brand',
            'border-l-brand-solid',
            'ring-brand',
            'ring-offset-surface',
            'inset-ring-brand',
            'outline-brand',
            'fill-info-solid',
            'stroke-brand',
            'divide-y-content',
            'placeholder-content-hint',
            'decoration-brand',
            'accent-brand',
            'caret-content',
            'shadow-brand',
            'inset-shadow-brand',
            'text-shadow-brand',
            'from-brand',
            'via-info',
            'to-surface-sunken',
            'bg-brand/50',
            '!bg-brand',
            'hover:bg-brand-hover',
            'bg-(--brand)',
            'bg-[var(--brand)]',
            'dark:text-[var(--content-muted)]/80',
        ])('should catch %s', (utility) => {
            expect(isBrandedUtility(utility)).toBe(true);
        });

        test.each([
            'bg-warning-surface',
            'text-warning',
            'border-divider',
            'border-l-warning-solid',
            'outline-outline',
            'shadow-sm',
            'bg-current/12',
            'text-shadow-sm',
            'rounded-lg',
            'bg-(--warning)',
            'bg-[var(--danger)]',
            'text-content-adjacent',
        ])('should leave %s alone', (utility) => {
            expect(isBrandedUtility(utility)).toBe(false);
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

        /**
         * The two readings of the rule table have to cover the same tokens, or a contrast warning would be silent
         * about a token the page nevertheless paints. Whether each *value* agrees cannot be settled here: the CSS
         * carries a `color-mix` for every derived step, and only a browser can resolve one. That comparison is
         * `BrandTokens.spec.tsx`, which resolves both sides to the sRGB it paints.
         */
        test.each(['light', 'dark'] as const)('should cover exactly the tokens the %s stylesheet declares', (theme) => {
            const colors = brandColors(ALL_COLORS);
            const selector = theme === 'light' ? 'html:not(.dark){' : 'html.dark{';
            const block = (brandTokenCss(colors) ?? '').split(selector)[1]?.split('}')[0] ?? '';
            const declared = [...block.matchAll(/--([a-z-]+):/g)].map(([, token]) => token);

            expect(declared.toSorted()).toStrictEqual(Object.keys(brandTokenValues(colors, theme)).toSorted());
        });

        /** An underived step is the one value both readings carry literally, so it can be compared here. */
        test('should carry an underived step through to the stylesheet unchanged', () => {
            const colors = brandColors(ALL_COLORS);

            expect(brandTokenCss(colors)).toContain(`--brand:${brandTokenValues(colors, 'light').brand};`);
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

    /**
     * Placeholders sit on `surface-raised`, which moves with the operator's Background. A `content-hint` left out of
     * the override layer would stay at the platform grey while the surface behind it moved, which on a mid grey
     * background renders them invisible.
     */
    test('should derive the placeholder colour from the brand text colour', () => {
        const values = brandTokenValues(brandColors({ ...ALL_COLORS, textColor: '#3b0764' }), 'light');

        expect(values['content-hint']).toBeDefined();
        expect(values['content-hint']).not.toBe('#b6b6b6');
        expect(values['content-hint']).not.toBe(values['content-subtle']);
    });
});
