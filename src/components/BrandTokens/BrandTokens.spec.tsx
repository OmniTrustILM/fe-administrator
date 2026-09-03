import { expect, test } from '../../../playwright/ct-test';
import { BRAND_CSS_STORAGE_KEY, BRAND_TOKENS_STYLE_ID, brandColors, brandTokenCss, brandTokenValues } from 'utils/brand-tokens';
import BrandTokensWithStore, { type PublicBrandingFixture } from './BrandTokensWithStore';

const BRANDED: PublicBrandingFixture = {
    configured: true,
    primaryColor: '#a3195b',
    secondaryColor: '#0369a1',
    backgroundColor: '#faf5ff',
    textColor: '#2c1338',
    lightLogo: null,
    darkLogo: null,
};

const UNBRANDED: PublicBrandingFixture = {
    configured: false,
    primaryColor: null,
    secondaryColor: null,
    backgroundColor: null,
    textColor: null,
    lightLogo: null,
    darkLogo: null,
};

/** Every token a probe is rendered for, across all the tests below. */
const PROBES = ['brand', 'brand-solid', 'surface', 'surface-raised', 'content', 'danger', 'divider', 'outline'] as const;

/** Platform values, so a test can assert a token was left alone rather than only that it changed. */
const PLATFORM = {
    light: {
        surface: 'rgb(248, 250, 252)',
        content: 'rgb(31, 41, 55)',
        danger: 'rgb(185, 28, 28)',
        divider: 'rgb(232, 232, 232)',
        outline: 'rgb(143, 143, 143)',
    },
    dark: { surface: 'rgb(10, 10, 10)', content: 'rgb(245, 245, 245)' },
} as const;

const overrideStyle = 'style#brand-tokens';

/**
 * A saturated palette alongside an ordinary one, because the two exercise different arithmetic. The sRGB gamut is not
 * convex in Oklab, so mixing a saturated input leaves the gamut: `#ff0033` at 60% towards white reaches a linear red
 * of 1.10. Those are the cases where the JS mixer's per-channel clip could disagree with what the browser paints, so
 * the parity test below must cover them and not only well-behaved inputs.
 */
const OUT_OF_GAMUT: PublicBrandingFixture = {
    configured: true,
    primaryColor: '#ff0033',
    secondaryColor: '#00ff00',
    backgroundColor: '#ffff00',
    textColor: '#8000ff',
    lightLogo: null,
    darkLogo: null,
};

/**
 * The token/value pairs of one composition, read back out of the stylesheet the token layer actually
 * emits. Split on the literal opening of the block rather than matched with a regex built from it: a
 * selector carries `.`, `:` and parentheses, so a regex would need escaping that has no reason to be
 * written here.
 */
const cssDeclarations = (css: string, blockOpening: string): Record<string, string> => {
    const block = css.split(blockOpening)[1]?.split('}')[0] ?? '';
    const values: Record<string, string> = {};

    for (const declaration of block.split(';')) {
        const separator = declaration.indexOf(':');

        if (separator > 0) {
            values[declaration.slice(2, separator)] = declaration.slice(separator + 1);
        }
    }

    return values;
};

test.describe('BrandTokens', () => {
    test('should leave the platform palette alone until a response lands', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} />);

        await expect(page.locator(overrideStyle)).toHaveCount(0);
        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', PLATFORM.light.surface);
        await expect(page.getByTestId('probe-content')).toHaveCSS('background-color', PLATFORM.light.content);
    });

    test('should apply the brand colours once the response lands', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} responseBranding={BRANDED} />);

        await page.getByTestId('respond').click();

        await expect(page.locator(overrideStyle)).toHaveCount(1);
        await expect(page.getByTestId('probe-brand')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', 'rgb(250, 245, 255)');
        await expect(page.getByTestId('probe-content')).toHaveCSS('background-color', 'rgb(44, 19, 56)');
    });

    test('should apply branding that was already read before it mounted', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await expect(page.getByTestId('probe-brand')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
    });

    test('should never override the status, divider or outline tokens', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await expect(page.getByTestId('probe-danger')).toHaveCSS('background-color', PLATFORM.light.danger);
        await expect(page.getByTestId('probe-divider')).toHaveCSS('background-color', PLATFORM.light.divider);
        await expect(page.getByTestId('probe-outline')).toHaveCSS('background-color', PLATFORM.light.outline);
    });

    test('should withdraw Background and Text in the dark composition and keep Primary', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await page.getByTestId('toggle-dark').click();

        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', PLATFORM.dark.surface);
        await expect(page.getByTestId('probe-content')).toHaveCSS('background-color', PLATFORM.dark.content);
        // Primary reaches both compositions, and the fill is the theme-invariant one.
        await expect(page.getByTestId('probe-brand-solid')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
    });

    test('should keep applying the brand colours across a theme switch', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await page.getByTestId('toggle-dark').click();
        await page.getByTestId('toggle-dark').click();

        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', 'rgb(250, 245, 255)');
        await expect(page.getByTestId('probe-brand')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
    });

    test('should apply only the families whose colour is set', async ({ mount, page }) => {
        await mount(
            <BrandTokensWithStore probeTokens={PROBES} preloadedBranding={{ ...UNBRANDED, configured: true, primaryColor: '#a3195b' }} />,
        );

        await expect(page.getByTestId('probe-brand')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', PLATFORM.light.surface);
    });

    test('should cache the override stylesheet for the next first paint', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} responseBranding={BRANDED} />);

        await page.getByTestId('respond').click();
        await expect(page.locator(overrideStyle)).toHaveCount(1);

        const cached = await page.evaluate((key) => localStorage.getItem(key), BRAND_CSS_STORAGE_KEY);

        expect(cached).toContain('html:not(.dark){');
        expect(cached).toContain('--brand:#a3195b;');
    });

    test('should return to the platform palette when a live response reports no branding', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} responseBranding={UNBRANDED} />);

        await expect(page.locator(overrideStyle)).toHaveCount(1);
        await page.getByTestId('respond').click();

        await expect(page.locator(overrideStyle)).toHaveCount(0);
        await expect(page.getByTestId('probe-surface')).toHaveCSS('background-color', PLATFORM.light.surface);
        expect(await page.evaluate((key) => localStorage.getItem(key), BRAND_CSS_STORAGE_KEY)).toBeNull();
    });

    test('should keep the applied colours when the read fails', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await expect(page.locator(overrideStyle)).toHaveCount(1);
        await page.getByTestId('fail').click();

        await expect(page.locator(overrideStyle)).toHaveCount(1);
        await expect(page.getByTestId('probe-brand')).toHaveCSS('background-color', 'rgb(163, 25, 91)');
    });

    /**
     * The contrast warning evaluates the derived steps in JS, before the browser has painted anything. That is only a
     * statement about what the operator will see if the JS mixer agrees with the CSS function it stands in for.
     *
     * Both sides are resolved to the sRGB the browser paints, not to Oklab coordinates. An out-of-gamut mix computes
     * to unclipped Oklab, so comparing coordinates would report a divergence for a colour that renders identically;
     * the painted byte is the thing the warning is actually a claim about. A canvas resolves a colour through the same
     * parser and gamut handling as a painted background, which `oklab.ts` documents and this test relies on.
     *
     * The cases are generated from the stylesheet the token layer emits, so every rule in `BRAND_TOKEN_RULES` is
     * covered in both compositions and a rule added without a matching JS derivation fails here.
     */
    for (const [palette, fixture] of [
        ['an ordinary palette', BRANDED],
        ['a palette whose mixes leave the sRGB gamut', OUT_OF_GAMUT],
    ] as const) {
        test(`should derive the same colours in JS as color-mix does in the browser, for ${palette}`, async ({ mount, page }) => {
            await mount(<BrandTokensWithStore probeTokens={PROBES} />);

            const colors = brandColors(fixture);
            const css = brandTokenCss(colors) ?? '';
            const compositions = [
                { theme: 'light', declarations: cssDeclarations(css, 'html:not(.dark){') },
                { theme: 'dark', declarations: cssDeclarations(css, 'html.dark{') },
            ] as const;

            for (const { theme, declarations } of compositions) {
                const expected = brandTokenValues(colors, theme);

                expect(Object.keys(declarations).sort(), `${theme} tokens`).toStrictEqual(Object.keys(expected).sort());
                expect(Object.keys(declarations).length).toBeGreaterThan(0);

                const cases = Object.entries(declarations).map(([token, value]) => [token, value, expected[token]] as const);
                const mismatched = await page.evaluate((cases) => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d', { willReadFrequently: true });

                    if (!context) {
                        return [{ token: 'canvas', cssPainted: 'unavailable', jsPainted: 'unavailable' }];
                    }

                    // Reset to a known colour first, so a value the parser rejects outright shows up as black rather
                    // than silently inheriting whatever the previous case painted.
                    const painted = (value: string) => {
                        context.fillStyle = '#000000';
                        context.fillStyle = value;
                        context.fillRect(0, 0, 1, 1);

                        const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

                        return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
                    };

                    return cases
                        .map(([token, cssValue, jsValue]) => ({ token, cssPainted: painted(cssValue), jsPainted: painted(jsValue) }))
                        .filter((result) => result.cssPainted !== result.jsPainted);
                }, cases);

                expect(mismatched, `${theme} composition of ${palette}`).toStrictEqual([]);
            }
        });
    }

    test('should expose the style element under a stable id', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await expect(page.locator(`style#${BRAND_TOKENS_STYLE_ID}`)).toHaveCount(1);
    });
});
