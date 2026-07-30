import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CryptographicKeyForm from './index';

export type CryptographicKeyFormWithStoreProps = Readonly<{
    /** Route the form is rendered under — the source of the `:id` param the form used to trust. */
    initialRoute?: string;
    routePath?: string;
    usesGlobalModal?: boolean;
}>;

/** See TokenProfileFormWithStore — same harness for the sibling form behind the Key dropdown's "+". */
export function CryptographicKeyFormWithStore({
    initialRoute = '/certificates/detail/certificate-uuid',
    routePath = '/certificates/detail/:id',
    usesGlobalModal = false,
}: CryptographicKeyFormWithStoreProps) {
    const store = useMemo(() => createMockStore(), []);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path={routePath} element={<CryptographicKeyForm usesGlobalModal={usesGlobalModal} />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}

export default CryptographicKeyFormWithStore;
