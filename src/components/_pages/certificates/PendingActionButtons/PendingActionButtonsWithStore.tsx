import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import PendingActionButtons from './index';

export type PendingActionButtonsWithStoreProps = Readonly<
    React.ComponentProps<typeof PendingActionButtons> & {
        preloadedState?: Partial<{
            finalizingIssueCertificateUuids: string[];
            confirmingRevokeCertificateUuids: string[];
            cancelingPendingCertificateUuids: string[];
        }>;
    }
>;

export default function PendingActionButtonsWithStore({ preloadedState, ...props }: PendingActionButtonsWithStoreProps) {
    const store = createMockStore(preloadedState ? ({ certificates: preloadedState } as any) : undefined);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <PendingActionButtons {...props} />
            </MemoryRouter>
        </Provider>
    );
}
