import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { brandingTestInitialState } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import Header from './index';

export type HeaderWithStoreProps = React.ComponentProps<typeof Header> & {
    /** The anonymous branding response, so a test can mount the header on a branded instance. */
    branding?: Record<string, string | null | boolean>;
};

export default function HeaderWithStore({ branding, ...props }: Readonly<HeaderWithStoreProps>) {
    const store = createMockStore({ branding: { ...brandingTestInitialState, publicBranding: branding, publicBrandingReadFailed: false } });
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ThemeProvider>
                    <Header {...props} />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
