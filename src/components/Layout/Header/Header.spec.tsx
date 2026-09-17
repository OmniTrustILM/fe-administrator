import { test, expect, type Page } from '../../../../playwright/ct-test';
import HeaderWithStore from './HeaderWithStore';

/**
 * The two platform marks, read back from the harness that resolved them.
 *
 * The header takes the reversed mark in both themes, because its surface carries the brand colour in the light theme
 * and a near-black in the dark one - so which asset it passes is the contract that distinguishes it from the login
 * page, which swaps a coloured mark for a reversed one. Matching merely `data:image/svg+xml` would hold for either.
 */
const platformMarks = async (page: Page) => {
    const marks = page.getByTestId('platform-marks');
    const [color, reversed] = await Promise.all([marks.getAttribute('data-color'), marks.getAttribute('data-reversed')]);

    expect(color, 'the harness did not publish the coloured mark').toBeTruthy();
    expect(reversed, 'the harness did not publish the reversed mark').toBeTruthy();
    expect(color, 'the two platform marks must be distinguishable for this assertion to mean anything').not.toBe(reversed);

    return { color: color as string, reversed: reversed as string };
};

test.describe('Header', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // mobile so sidebar toggle is visible (md:hidden)

    /** A real 1x1 PNG, so the browser can decode what the header points at. */
    const UPLOADED_LOGO =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

    test('should render header with logo and sidebar toggle', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} />);
        await expect(page.getByTestId('header')).toBeVisible();
        await expect(page.getByTestId('header-logo-link')).toHaveAttribute('href', '/dashboard');
        await expect(page.getByTestId('header-logo')).toBeVisible();
        const menuButton = page.getByTestId('header-sidebar-toggle');
        await expect(menuButton).toBeVisible();
    });

    test('should render the reversed platform mark, not the coloured one, when nothing is branded', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} branding={{ configured: false, lightLogo: null, darkLogo: null }} />);

        const { color, reversed } = await platformMarks(page);

        await expect(page.getByTestId('header-logo')).toHaveAttribute('src', reversed);
        expect(await page.getByTestId('header-logo').getAttribute('src')).not.toBe(color);
    });

    test('should render the operator logo in place of the platform mark', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} branding={{ configured: true, lightLogo: UPLOADED_LOGO, darkLogo: null }} />);

        const logo = page.getByTestId('header-logo');

        await expect(logo).toHaveAttribute('src', UPLOADED_LOGO);
        // An `img`, never inlined markup: that is what keeps a sanitized SVG inert.
        await expect(logo).toHaveJSProperty('tagName', 'IMG');
    });

    test('should keep the logo inside the header height', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} branding={{ configured: true, lightLogo: UPLOADED_LOGO, darkLogo: null }} />);

        const logoBox = await page.getByTestId('header-logo').boundingBox();
        const headerBox = await page.getByTestId('header').boundingBox();

        expect(logoBox?.height).toBeLessThanOrEqual(headerBox?.height ?? 0);
    });

    /**
     * Nothing refuses a logo for its shape, so the header's own layout is the only thing keeping an extreme one from
     * pushing the controls off the narrowest screen. 12:1 at the fixed 36px height wants 432px, more than a 375px
     * viewport holds even before the controls.
     */
    test('should keep an unusually wide logo inside the header width', async ({ mount, page }) => {
        const wide = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="100" viewBox="0 0 1200 100"><rect width="1200" height="100"/></svg>').toString('base64')}`;
        await mount(<HeaderWithStore sidebarToggle={() => {}} branding={{ configured: true, lightLogo: wide, darkLogo: null }} />);

        const header = page.getByTestId('header');
        await expect(header).toBeVisible();

        const logoBox = await page.getByTestId('header-logo').boundingBox();
        const headerBox = await header.boundingBox();
        const toggleBox = await page.getByTestId('header-sidebar-toggle').boundingBox();

        expect((logoBox?.x ?? 0) + (logoBox?.width ?? 0)).toBeLessThanOrEqual(headerBox?.width ?? 0);
        expect((toggleBox?.x ?? 0) + (toggleBox?.width ?? 0)).toBeLessThanOrEqual(headerBox?.width ?? 0);
        expect(await header.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
        // Shrinking the mark away would satisfy every bound above, and is the way this layout actually fails.
        expect(logoBox?.width ?? 0).toBeGreaterThan(0);
    });

    test('should call sidebarToggle when menu button clicked', async ({ mount, page }) => {
        let toggled = false;
        await mount(
            <HeaderWithStore
                sidebarToggle={() => {
                    toggled = true;
                }}
            />,
        );
        await page.getByTestId('header-sidebar-toggle').click();
        expect(toggled).toBe(true);
    });

    test('should render the theme toggle', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} />);
        await expect(page.getByTestId('theme-toggle')).toBeVisible();
    });
});
