import type React from 'react';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import PendingActionButtons from './index';
import PendingActionDialogs from './PendingActionDialogs';
import type { PendingAction } from './types';

export type PendingActionButtonsWithStoreProps = Readonly<
    Omit<React.ComponentProps<typeof PendingActionButtons>, 'onAction'> & {
        preloadedState?: Partial<{
            finalizingIssueCertificateUuids: string[];
            confirmingRevokeCertificateUuids: string[];
            cancelingPendingCertificateUuids: string[];
        }>;
    }
>;

function ButtonsAndDialogs({ certificate, compact }: Omit<PendingActionButtonsWithStoreProps, 'preloadedState'>) {
    const [action, setAction] = useState<PendingAction | null>(null);
    return (
        <>
            <PendingActionButtons certificate={certificate} compact={compact} onAction={setAction} />
            <PendingActionDialogs action={action} onClose={() => setAction(null)} />
        </>
    );
}

export default function PendingActionButtonsWithStore({ preloadedState, ...props }: PendingActionButtonsWithStoreProps) {
    const store = createMockStore(preloadedState ? ({ certificates: preloadedState } as any) : undefined);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ButtonsAndDialogs {...props} />
            </MemoryRouter>
        </Provider>
    );
}
