import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { brandingTestInitialState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import Header from './index';

// The two platform marks the application ships. A test cannot import these itself: in the Node half of a component
// test an asset import is an opaque reference, not the URL the bundler gives the browser, so comparing the rendered
// `src` against one would assert nothing. They are resolved here, in the browser half, and published below.
import colorLogo from '../../../resources/images/ot-logo-color.svg';
import reversedLogo from '../../../resources/images/ot-logo-white.svg';

export type HeaderWithStoreProps = React.ComponentProps<typeof Header> & {
    /** The anonymous branding response, so a test can mount the header on a branded instance. */
    branding?: Record<string, string | null | boolean>;
};

/**
 * A settled response reporting no branding. Defaulted to rather than left absent because absent means "the read has
 * not come back yet", and `BrandLogo` withholds the logo until it has - which is not the state a test about the
 * header's own layout is asking for. The in-flight case is covered in `BrandLogo.spec.tsx`.
 */
const UNBRANDED = { configured: false, lightLogo: null, darkLogo: null };

export default function HeaderWithStore({ branding = UNBRANDED, ...props }: Readonly<HeaderWithStoreProps>) {
    const store = createMockStore({ branding: { ...brandingTestInitialState, publicBranding: branding, publicBrandingReadFailed: false } });
    return (
        <Provider store={store}>
            <span data-testid="platform-marks" data-color={colorLogo} data-reversed={reversedLogo} hidden />
            <MemoryRouter initialEntries={['/']}>
                <ThemeProvider>
                    <Header {...props} />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
