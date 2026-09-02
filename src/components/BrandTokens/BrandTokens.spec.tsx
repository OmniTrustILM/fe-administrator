import { expect, test } from '../../../playwright/ct-test';
import { BRAND_CSS_STORAGE_KEY, BRAND_TOKENS_STYLE_ID } from 'utils/brand-tokens';
import { mixOklab } from 'utils/oklab';
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
 * `getComputedStyle` reports a `color-mix(in oklab, ...)` result in the Oklab space it was mixed in, so a token that
 * carries one cannot be compared against a hex string directly. Wrapping the expected hex in a no-op mix of the same
 * kind puts both sides in the same space, which is what makes the comparison meaningful.
 */
const asOklab = (hex: string) => `color-mix(in oklab, ${hex} 100%, ${hex})`;

const parseOklab = (value: string): number[] => /oklab\(([^)]*)\)/.exec(value)?.[1].split(/\s+/).map(Number) ?? [];

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

    // The contrast warning evaluates the derived steps in JS, before the browser has painted anything. That is only a
    // statement about what the operator will see if the JS mixer agrees with the CSS function it stands in for.
    test('should derive the same colours in JS as color-mix does in the browser', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} />);

        // Each row is one mix the token layer actually emits, paired with the JS result for the same mix.
        const cases: ReadonlyArray<[string, string, number]> = [
            ['#ffffff', '#000000', 0.5],
            ['#a3195b', '#000000', 0.8],
            ['#a3195b', '#ffffff', 0.1],
            ['#faf5ff', '#000000', 0.87],
            ['#2c1338', '#ffffff', 0.62],
        ];

        for (const [first, second, weight] of cases) {
            const keyword = second === '#000000' ? 'black' : 'white';
            const cssValue = `color-mix(in oklab, ${first} ${weight * 100}%, ${keyword})`;

            const [fromCss, fromJs] = await page.evaluate(
                ([css, expected]) => {
                    const probe = document.createElement('div');

                    document.body.appendChild(probe);
                    probe.style.backgroundColor = css;
                    const browserMixed = getComputedStyle(probe).backgroundColor;

                    probe.style.backgroundColor = expected;
                    const jsMixed = getComputedStyle(probe).backgroundColor;

                    probe.remove();
                    return [browserMixed, jsMixed];
                },
                [cssValue, asOklab(mixOklab(first, second, weight))],
            );

            const browser = parseOklab(fromCss);
            const js = parseOklab(fromJs);

            expect(browser, `${cssValue} did not resolve in the Oklab space`).toHaveLength(3);
            expect(js).toHaveLength(3);
            for (const [index, coordinate] of browser.entries()) {
                // 8-bit quantisation of the JS result is the only difference that may remain.
                expect(Math.abs(coordinate - js[index]), `${cssValue} coordinate ${index}`).toBeLessThan(0.005);
            }
        }
    });

    test('should expose the style element under a stable id', async ({ mount, page }) => {
        await mount(<BrandTokensWithStore probeTokens={PROBES} preloadedBranding={BRANDED} />);

        await expect(page.locator(`style#${BRAND_TOKENS_STYLE_ID}`)).toHaveCount(1);
    });
});
