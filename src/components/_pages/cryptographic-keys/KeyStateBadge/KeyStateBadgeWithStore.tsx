import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import KeyStateBadge from './index';

import { keyStatePreloadedState } from '../keyStateStorePreload';

export type KeyStateBadgeWithStoreProps = Readonly<React.ComponentProps<typeof KeyStateBadge>>;

export default function KeyStateBadgeWithStore(props: KeyStateBadgeWithStoreProps) {
    const store = createMockStore(keyStatePreloadedState as any);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <KeyStateBadge {...props} />
            </MemoryRouter>
        </Provider>
    );
}
