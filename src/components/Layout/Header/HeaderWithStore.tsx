import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import Header from './index';

export type HeaderWithStoreProps = Readonly<React.ComponentProps<typeof Header>>;

export default function HeaderWithStore(props: HeaderWithStoreProps) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <Header {...props} />
            </MemoryRouter>
        </Provider>
    );
}
