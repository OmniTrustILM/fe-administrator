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
