import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import TabLayout from './index';

export type TabLayoutWithStoreProps = Readonly<React.ComponentProps<typeof TabLayout>>;

export default function TabLayoutWithStore(props: TabLayoutWithStoreProps) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <TabLayout {...props} />
            </MemoryRouter>
        </Provider>
    );
}
