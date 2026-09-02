import { expect, test } from '../../../../playwright/ct-test';
import LoginWithStore from './LoginWithStore';

/** A real 1x1 PNG, so the browser can decode what the page points at. */
const LIGHT_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

const unbranded = {
    configured: false,
    primaryColor: null,
    secondaryColor: null,
    backgroundColor: null,
    textColor: null,
    lightLogo: null,
    darkLogo: null,
};

const branded = {
    configured: true,
    primaryColor: '#a3195b',
    secondaryColor: '#0369a1',
    backgroundColor: '#faf5ff',
    textColor: '#2c1338',
    lightLogo: LIGHT_LOGO,
    darkLogo: null,
};

const PROVIDERS = [
    { name: 'keycloak', loginUrl: 'https://example.invalid/keycloak' },
    { name: 'certificate', loginUrl: 'https://example.invalid/certificate' },
];

const PLATFORM_SURFACE = 'rgb(248, 250, 252)';

/**
 * The platform marks are SVGs the bundler inlines, so they cannot be matched by file name. What distinguishes them
 * from an operator's logo here is enough: the uploads in this spec are PNGs, so an `image/svg+xml` source is the
 * platform's own. Which of the two platform marks each theme gets is asserted in `BrandLogo.spec.tsx`, against
 * sentinels that do not depend on how an asset is served.
 */
const isPlatformMark = /^data:image\/svg\+xml/;

test.describe('Login', () => {
    test('should render the platform look on an instance with no branding', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={unbranded} loginMethods={PROVIDERS} />);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', isPlatformMark);
        await expect(page.getByTestId('login-page')).toHaveCSS('background-color', PLATFORM_SURFACE);
    });

    test('should render the customer logo and colours before anyone signs in', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={branded} loginMethods={PROVIDERS} />);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', LIGHT_LOGO);
        await expect(page.getByTestId('login-page')).toHaveCSS('background-color', 'rgb(250, 245, 255)');
    });

    test('should open in the theme the operator made default', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={{ ...branded, defaultTheme: 'dark' }} loginMethods={PROVIDERS} />);

        await expect(page.locator('html')).toHaveClass(/dark/);
        // Only a light logo is uploaded, so the dark composition falls back per slot to the platform's reversed mark.
        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', isPlatformMark);
    });

    test('should render the platform look, and no error, when the branding read fails', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={branded} readFailed loginMethods={PROVIDERS} />);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', isPlatformMark);
        await expect(page.getByTestId('login-page')).toHaveCSS('background-color', PLATFORM_SURFACE);
        await expect(page.getByText('Failed to get branding')).toHaveCount(0);
    });

    test('should list the login providers it was given', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={branded} loginMethods={PROVIDERS} />);

        await expect(page.getByRole('button', { name: 'Keycloak' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Certificate' })).toBeVisible();
    });

    test('should still report a failure of its own login read', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={branded} error="Failed to get login methods" />);

        await expect(page.getByText('Failed to get login methods')).toBeVisible();
        // The branding is unaffected by it: the page is still the customer's.
        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', LIGHT_LOGO);
    });

    test('should say so when no provider is configured', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={unbranded} loginMethods={[]} />);

        await expect(page.getByText('No login methods available')).toBeVisible();
    });
});
