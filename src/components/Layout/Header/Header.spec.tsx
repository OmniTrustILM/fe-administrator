import { test, expect } from '../../../../playwright/ct-test';
import HeaderWithStore from './HeaderWithStore';

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

    test('should render the platform mark on an instance with no branding', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} branding={{ configured: false, lightLogo: null, darkLogo: null }} />);

        // The bundler inlines the platform mark as an SVG data URI, so its type is what tells it apart from an upload.
        await expect(page.getByTestId('header-logo')).toHaveAttribute('src', /^data:image\/svg\+xml/);
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
