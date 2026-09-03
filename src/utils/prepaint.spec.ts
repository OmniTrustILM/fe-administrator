import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BRAND_CSS_STORAGE_KEY, BRAND_TOKENS_STYLE_ID, brandColors, brandTokenCss } from './brand-tokens';
import { OPERATOR_DEFAULT_STORAGE_KEY, THEME_STORAGE_KEY } from './theme';

/**
 * The inline script in `index.html` is the only thing that applies the theme and the operator's colours before the
 * first paint, and it is deliberately a duplicate: it runs before any module has loaded, so it cannot import from
 * `theme.ts` or `brand-tokens.ts`. A duplicate kept in step by hand is exactly the thing that needs a test - a change
 * to a storage key, the style id, the guard or the insertion would otherwise break first paint with the suite green.
 *
 * The shipped script is executed here rather than reimplemented, so the test cannot drift away from what is served.
 */
const prePaintScript = (): string => {
    const html = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    // Case-insensitive, and only an attribute-less opening tag: the scripts that carry a `src` are not
    // the inline one being looked for.
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(([, body]) => body);
    const script = scripts.find((body) => body.includes(BRAND_CSS_STORAGE_KEY));

    if (!script) {
        throw new Error(`No inline script in index.html reads ${BRAND_CSS_STORAGE_KEY}`);
    }

    return script;
};

const SCRIPT = prePaintScript();

const runPrePaint = () => {
    new Function(SCRIPT)();
};

const brandStyle = () => document.getElementById(BRAND_TOKENS_STYLE_ID);

const stubPrefersDark = (matches: boolean) => vi.stubGlobal('matchMedia', () => ({ matches }));

const BRAND_CSS = brandTokenCss(brandColors({ primaryColor: '#a3195b', backgroundColor: '#faf5ff' })) ?? '';

describe('index.html pre-paint script', () => {
    beforeEach(() => {
        globalThis.localStorage.clear();
        stubPrefersDark(false);
        document.documentElement.className = '';
        document.documentElement.style.colorScheme = '';
    });

    afterEach(() => {
        brandStyle()?.remove();
        globalThis.localStorage.clear();
        vi.unstubAllGlobals();
    });

    describe('cached brand colours', () => {
        test('should install the cached stylesheet under the id the token layer uses', () => {
            globalThis.localStorage.setItem(BRAND_CSS_STORAGE_KEY, BRAND_CSS);

            runPrePaint();

            expect(brandStyle()?.textContent).toBe(BRAND_CSS);
        });

        test('should insert it into the head, so it applies to the first paint', () => {
            globalThis.localStorage.setItem(BRAND_CSS_STORAGE_KEY, BRAND_CSS);

            runPrePaint();

            expect(brandStyle()?.parentElement).toBe(document.head);
        });

        test('should apply nothing on a first-ever visit', () => {
            runPrePaint();

            expect(brandStyle()).toBeNull();
        });

        // The cache is written from colours already validated as #rrggbb, so the guard is there to reject a value
        // that did not come from this application at all.
        test.each([
            ['an at-rule', 'html.dark{--brand:#a3195b;}@import url(evil.css);'],
            ['markup', '</style><script>alert(1)</script>'],
            ['a string', "html.dark{--brand:'#a3195b';}"],
            ['a url()', 'html.dark{background:url(http://evil/x)}'],
            ['a comment', 'html.dark{}/*x*/'],
            ['a backslash escape', 'html.dark{--brand:\\41 ;}'],
        ])('should reject a cached value carrying %s', (_case, cached) => {
            globalThis.localStorage.setItem(BRAND_CSS_STORAGE_KEY, cached);

            runPrePaint();

            expect(brandStyle()).toBeNull();
        });

        test('should reject a cached value longer than the size limit', () => {
            globalThis.localStorage.setItem(BRAND_CSS_STORAGE_KEY, `html.dark{--brand:#a3195b;}${' '.repeat(4096)}`);

            runPrePaint();

            expect(brandStyle()).toBeNull();
        });

        /** The generator and the guard are in separate files, so what one emits has to stay acceptable to the other. */
        test('should accept everything the token layer actually generates', () => {
            const css =
                brandTokenCss(
                    brandColors({ primaryColor: '#0073cf', secondaryColor: '#0369a1', backgroundColor: '#f8fafc', textColor: '#1f2937' }),
                ) ?? '';

            globalThis.localStorage.setItem(BRAND_CSS_STORAGE_KEY, css);

            runPrePaint();

            expect(brandStyle()?.textContent).toBe(css);
        });
    });

    describe('theme resolution', () => {
        test('should fall back to the operating system preference when nothing is stored', () => {
            stubPrefersDark(true);

            runPrePaint();

            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.style.colorScheme).toBe('dark');
        });

        test("should apply the operator's cached default over the system preference", () => {
            globalThis.localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'dark');

            runPrePaint();

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        test("should apply the user's own choice over the operator default", () => {
            globalThis.localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'dark');
            globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'light');

            runPrePaint();

            expect(document.documentElement.classList.contains('dark')).toBe(false);
            expect(document.documentElement.style.colorScheme).toBe('light');
        });

        test('should return to the system preference for an explicit System choice, outranking the operator default', () => {
            stubPrefersDark(true);
            globalThis.localStorage.setItem(OPERATOR_DEFAULT_STORAGE_KEY, 'light');
            globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'system');

            runPrePaint();

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        test('should ignore a stored value that is not a mode', () => {
            globalThis.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

            runPrePaint();

            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });

    describe('when storage is unavailable', () => {
        test('should still resolve the theme from the system preference', () => {
            stubPrefersDark(true);
            vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
                throw new Error('storage blocked');
            });

            expect(() => runPrePaint()).not.toThrow();
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(brandStyle()).toBeNull();
        });
    });
});
