import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import KeyStateCircle from './index';

import { keyStatePreloadedState } from '../keyStateStorePreload';

export type KeyStateCircleWithStoreProps = Readonly<React.ComponentProps<typeof KeyStateCircle>>;

export default function KeyStateCircleWithStore(props: KeyStateCircleWithStoreProps) {
    const store = createMockStore(keyStatePreloadedState as any);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <KeyStateCircle {...props} />
            </MemoryRouter>
        </Provider>
    );
}
