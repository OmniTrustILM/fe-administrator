import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import PendingActionButtons from './index';

export type PendingActionButtonsWithStoreProps = Readonly<React.ComponentProps<typeof PendingActionButtons>>;

export default function PendingActionButtonsWithStore(props: PendingActionButtonsWithStoreProps) {
    const store = createMockStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <PendingActionButtons {...props} />
            </MemoryRouter>
        </Provider>
    );
}
