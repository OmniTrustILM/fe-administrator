import { expect, test, type Page } from '../../../playwright/ct-test';
import BrandLogoWithStore from './BrandLogoWithStore';

/** A real 1x1 PNG, so the browser can actually decode what the component points at. */
const LIGHT_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

/** A second, distinct PNG - 2x1 - so a test can tell the two slots apart by their bytes. */
const DARK_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGNgKD4PRAAHNwKFC/xdIQAAAABJRU5ErkJggg==';

const unbranded = {
    configured: false,
    primaryColor: null,
    secondaryColor: null,
    backgroundColor: null,
    textColor: null,
    lightLogo: null,
    darkLogo: null,
};

const branded = { ...unbranded, configured: true, lightLogo: LIGHT_LOGO, darkLogo: DARK_LOGO };

/** The toggle cycles System, Light, Dark, and the harness starts on the light system preference. */
const switchToDark = async (page: Page) => {
    await page.getByTestId('theme-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
};

test.describe('BrandLogo', () => {
    test('should render the platform mark for the active theme when nothing is branded', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={unbranded} />);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');

        await switchToDark(page);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-dark.svg');
    });

    /**
     * A branded instance must not paint the platform mark and then correct itself, and an operator's logo cannot be
     * cached for the first paint the way the colours are - so the logo waits for the answer instead of guessing it.
     */
    test('should show no logo while the branding read is still in flight', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore />);

        await expect(page.getByTestId('brand-logo')).not.toBeVisible();
    });

    test('should reserve the space the logo will occupy while it waits', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore />);

        const box = await page.getByTestId('brand-logo').boundingBox();

        expect(box?.height).toBeCloseTo(36, 0);
        expect(box?.width ?? 0).toBeGreaterThan(0);
    });

    test('should reveal the platform mark once the read settles on no branding', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={unbranded} />);

        await expect(page.getByTestId('brand-logo')).toBeVisible();
        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');
    });

    test('should reveal the operator logo once the read settles on branding', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={branded} />);

        await expect(page.getByTestId('brand-logo')).toBeVisible();
        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', LIGHT_LOGO);
    });

    /** A failed read is a settled answer: there is no second one coming, so the logo must not wait for ever. */
    test('should reveal the platform mark when the read failed', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={branded} readFailed />);

        await expect(page.getByTestId('brand-logo')).toBeVisible();
    });

    test('should render the uploaded logo for the active theme', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={branded} />);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', LIGHT_LOGO);
    });

    test('should swap the variant on a theme switch, without a reload', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={branded} />);
        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', LIGHT_LOGO);

        await switchToDark(page);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', DARK_LOGO);
    });

    test('should fall back per slot when only the light logo is uploaded', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={{ ...branded, darkLogo: null }} />);
        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', LIGHT_LOGO);

        await switchToDark(page);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-dark.svg');
    });

    test('should fall back per slot when only the dark logo is uploaded', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={{ ...branded, lightLogo: null }} />);
        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');

        await switchToDark(page);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', DARK_LOGO);
    });

    test('should render the platform mark when the branding read failed', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore branding={branded} readFailed />);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');
    });

    /**
     * Core stores a logo only as a base64 data URI of an accepted type, so anything else did not come from an upload.
     * An absolute URL is the case that matters most - it would have every viewer, the anonymous ones included, fetch
     * from whatever host it names - but a payload that merely declares an accepted type is refused too: it would
     * decode to nothing and show a broken image, since there is no decode-error fallback behind it. The exhaustive
     * table for the predicate itself is in `utils/branding.spec.ts`; these are the cases that reach the DOM.
     */
    for (const [description, lightLogo] of [
        ['an absolute URL', 'https://example.invalid/logo.svg'],
        ['a raw payload behind an accepted media type', 'data:image/png,raw'],
        ['a URI-encoded SVG rather than a base64 one', 'data:image/svg+xml;charset=utf-8,<svg/>'],
        ['a payload outside the base64 alphabet', 'data:image/png;base64,%%%'],
    ] as const) {
        test(`should refuse a stored logo carrying ${description}`, async ({ mount, page }) => {
            await mount(<BrandLogoWithStore branding={{ ...branded, lightLogo }} />);

            await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');
        });
    }

    test('should render through an img element, never as inlined markup', async ({ mount, page }) => {
        const svgLogo = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 1"><rect width="3" height="1"/></svg>').toString('base64')}`;

        await mount(<BrandLogoWithStore branding={{ ...branded, lightLogo: svgLogo }} />);

        const logo = page.getByTestId('brand-logo');

        await expect(logo).toHaveJSProperty('tagName', 'IMG');
        await expect(logo).toHaveAttribute('src', svgLogo);
        // Nothing from the logo reaches the document tree, which is what keeps a sanitized SVG inert.
        await expect(page.locator('svg[data-testid="brand-logo"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="brand-logo"] *')).toHaveCount(0);
    });

    test('should keep its aspect ratio inside the height its caller fixes', async ({ mount, page }) => {
        // A 3:1 mark, the widest the upload rules permit, in a 36px slot.
        const wide = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><rect width="300" height="100"/></svg>').toString('base64')}`;

        await mount(<BrandLogoWithStore branding={{ ...branded, lightLogo: wide }} />);

        const box = await page.getByTestId('brand-logo').boundingBox();

        expect(box?.height).toBeCloseTo(36, 0);
        expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(3, 1);
    });
});
