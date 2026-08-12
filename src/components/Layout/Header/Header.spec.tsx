import { test, expect } from '../../../../playwright/ct-test';
import HeaderWithStore from './HeaderWithStore';

test.describe('Header', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // mobile so sidebar toggle is visible (md:hidden)

    test('should render header with logo and sidebar toggle', async ({ mount, page }) => {
        await mount(<HeaderWithStore sidebarToggle={() => {}} />);
        await expect(page.getByTestId('header')).toBeVisible();
        await expect(page.getByTestId('header-logo-link')).toHaveAttribute('href', '/dashboard');
        await expect(page.getByTestId('header-logo')).toBeVisible();
        const menuButton = page.getByTestId('header-sidebar-toggle');
        await expect(menuButton).toBeVisible();
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
