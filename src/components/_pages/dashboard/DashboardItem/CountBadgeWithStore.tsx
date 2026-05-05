import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CountBadge from './CountBadge';

export type CountBadgeWithStoreProps = Readonly<React.ComponentProps<typeof CountBadge>>;

export default function CountBadgeWithStore(props: CountBadgeWithStoreProps) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <CountBadge {...props} />
            </MemoryRouter>
        </Provider>
    );
}
