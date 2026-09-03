import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import BrandTokens from 'components/BrandTokens';
import ThemeProvider from 'components/ThemeProvider';
import type { BrandingTheme } from 'types/branding';
import { brandingTestInitialState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';

import Login from './index';

// Resolved here rather than in the spec: in the Node half of a component test an asset import is an opaque reference
// rather than the URL the bundler gives the browser, so a spec that imported these could not compare them to a
// rendered `src`.
import colorLogo from '../../../resources/images/ot-logo-color.svg';
import reversedLogo from '../../../resources/images/ot-logo-white.svg';

export type LoginWithStoreProps = Readonly<{
    /** The anonymous branding response, as JSON a Playwright test can hand across the Node/browser boundary. */
    branding?: Record<string, string | null | boolean>;
    /** Whether that read failed. The visitor must be none the wiser: the platform look, and no error. */
    readFailed?: boolean;
    /** The providers the login epic would have listed. */
    loginMethods?: Array<{ name: string; loginUrl: string }>;
    /** An error from the *login* read, which - unlike a branding failure - the page does surface. */
    error?: string;
}>;

/**
 * Playwright CT cannot carry a live Redux store across the Node/browser boundary, so the store is built inside the
 * mounted component.
 *
 * `ThemeProvider` and `BrandTokens` are mounted around the page because that is where they sit in the real tree - the
 * app wraps the router in them, so the login page is inside them before there is any session. Reproducing that here is
 * what makes "the login page renders the customer's colours" a thing a test can assert rather than assume.
 */
export function LoginWithStore({ branding, readFailed = false, loginMethods, error }: LoginWithStoreProps) {
    const store = useMemo(
        () =>
            createMockStore({
                branding: { ...brandingTestInitialState, publicBranding: branding, publicBrandingReadFailed: readFailed },
                login: { loginMethods, isFetching: false, error },
            }),
        [branding, readFailed, loginMethods, error],
    );

    return (
        <Provider store={store}>
            <span data-testid="platform-marks" data-color={colorLogo} data-reversed={reversedLogo} hidden />
            <MemoryRouter initialEntries={['/login']}>
                <ThemeProvider branding={readFailed ? undefined : { defaultTheme: branding?.defaultTheme as BrandingTheme | undefined }}>
                    <BrandTokens />
                    <Login />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}

export default LoginWithStore;
