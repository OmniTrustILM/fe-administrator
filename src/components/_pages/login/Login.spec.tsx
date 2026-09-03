import { expect, test, type Page } from '../../../../playwright/ct-test';
import LoginWithStore from './LoginWithStore';

/**
 * The two platform marks, read back from the harness that resolved them.
 *
 * The login page sits on `surface` - light in the light theme, near-black in the dark one - so it is the one surface
 * where the two marks differ, and which of them each composition gets is this page's contract. Matching merely
 * `data:image/svg+xml` would hold for either, and so would hold if the pair were swapped.
 */
const platformMarks = async (page: Page) => {
    const marks = page.getByTestId('platform-marks');
    const [color, reversed] = await Promise.all([marks.getAttribute('data-color'), marks.getAttribute('data-reversed')]);

    expect(color, 'the harness did not publish the coloured mark').toBeTruthy();
    expect(reversed, 'the harness did not publish the reversed mark').toBeTruthy();
    expect(color, 'the two platform marks must be distinguishable for this assertion to mean anything').not.toBe(reversed);

    return { color: color as string, reversed: reversed as string };
};

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

test.describe('Login', () => {
    test('should render the platform look on an instance with no branding', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={unbranded} loginMethods={PROVIDERS} />);

        // The coloured mark, not merely some SVG: on the light page the reversed one would be invisible.
        const { color } = await platformMarks(page);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', color);
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

        // Only a light logo is uploaded, so the dark composition falls back per slot to the platform's reversed mark -
        // the one that is legible on the near-black dark surface, which is why the two slots take different assets.
        const { reversed } = await platformMarks(page);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', reversed);
    });

    test('should render the platform look, and no error, when the branding read fails', async ({ mount, page }) => {
        await mount(<LoginWithStore branding={branded} readFailed loginMethods={PROVIDERS} />);

        const { color } = await platformMarks(page);

        await expect(page.getByTestId('login-logo')).toHaveAttribute('src', color);
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
