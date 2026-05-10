import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import Footer from './index';

export type FooterWithStoreProps = React.ComponentProps<typeof Footer>;

export default function FooterWithStore(props: Readonly<FooterWithStoreProps>) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <Footer {...props} />
            </MemoryRouter>
        </Provider>
    );
}
