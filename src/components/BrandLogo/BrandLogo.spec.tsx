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

    test('should render the platform mark while the branding read is still in flight', async ({ mount, page }) => {
        await mount(<BrandLogoWithStore />);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');
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

    test('should refuse a stored logo that is not a data URI of an accepted type', async ({ mount, page }) => {
        // Core stores logos as base64 data URIs, so anything else did not come from an upload. An absolute URL would
        // otherwise have every viewer - the anonymous ones included - fetch from whatever host it names.
        await mount(<BrandLogoWithStore branding={{ ...branded, lightLogo: 'https://example.invalid/logo.svg' }} />);

        await expect(page.getByTestId('brand-logo')).toHaveAttribute('src', '/platform-light.svg');
    });

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
