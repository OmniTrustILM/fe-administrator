import { useMemo } from 'react';
import { Provider } from 'react-redux';

import ThemeProvider from 'components/ThemeProvider';
import ThemeToggle from 'components/ThemeToggle';
import { brandingTestInitialState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';

import BrandLogo from './index';

export type BrandLogoWithStoreProps = Readonly<{
    /** The anonymous branding response, as JSON a Playwright test can hand across the Node/browser boundary. */
    branding?: Record<string, string | null | boolean>;
    /** Whether that read failed, which settles the slice on the platform default and must not look like branding. */
    readFailed?: boolean;
}>;

/**
 * Playwright CT cannot carry a live Redux store across the Node/browser boundary, so the store is built inside the
 * mounted component.
 *
 * The platform fallbacks are sentinel paths rather than the real imported assets: what is under test is which slot
 * wins, and a sentinel says so without depending on how the bundler happens to serve an SVG. That the header and the
 * login page pass their real marks is covered where they are mounted.
 *
 * The real {@link ThemeToggle} drives the theme, so the swap is exercised through the control a user actually has.
 */
export function BrandLogoWithStore({ branding, readFailed = false }: BrandLogoWithStoreProps) {
    const store = useMemo(
        () =>
            createMockStore({ branding: { ...brandingTestInitialState, publicBranding: branding, publicBrandingReadFailed: readFailed } }),
        [branding, readFailed],
    );

    return (
        <Provider store={store}>
            <ThemeProvider>
                <BrandLogo
                    defaultLight="/platform-light.svg"
                    defaultDark="/platform-dark.svg"
                    alt="Logo"
                    className="h-9"
                    dataTestId="brand-logo"
                />
                <ThemeToggle />
            </ThemeProvider>
        </Provider>
    );
}

export default BrandLogoWithStore;
