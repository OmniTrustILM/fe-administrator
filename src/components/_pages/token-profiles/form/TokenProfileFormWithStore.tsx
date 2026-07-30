import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import TokenProfileForm from './index';

export type TokenProfileFormWithStoreProps = Readonly<{
    /** Route the form is rendered under — the source of the `:id` param the form used to trust. */
    initialRoute?: string;
    routePath?: string;
    usesGlobalModal?: boolean;
}>;

/**
 * Mounts the form under an arbitrary route so a test can reproduce the global-modal case, where the
 * page underneath (e.g. a certificate detail page) owns the `:id` param. Building the store inside
 * the mounted component keeps it in the browser context — one created in the Node test body does
 * not transfer across the Playwright CT boundary.
 */
export function TokenProfileFormWithStore({
    initialRoute = '/certificates/detail/certificate-uuid',
    routePath = '/certificates/detail/:id',
    usesGlobalModal = false,
}: TokenProfileFormWithStoreProps) {
    const store = useMemo(() => createMockStore(), []);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path={routePath} element={<TokenProfileForm usesGlobalModal={usesGlobalModal} />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

export default TokenProfileFormWithStore;
