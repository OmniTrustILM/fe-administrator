import { configureStore, type Middleware } from '@reduxjs/toolkit';
import type React from 'react';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { type CertificatesTestState, testInitialState, testReducers } from 'ducks/test-reducers';
import PendingActionButtons from './index';
import PendingActionDialogs from './PendingActionDialogs';
import type { PendingAction } from './types';

export type PendingActionButtonsWithStoreProps = Readonly<
    Omit<React.ComponentProps<typeof PendingActionButtons>, 'onAction'> & {
        preloadedState?: Partial<CertificatesTestState>;
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
    const [manualIssuePayload, setManualIssuePayload] = useState<unknown>();

    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat((() => (next) => (action) => {
                        if ((action as { type?: string }).type === 'certificates/manuallyIssueCertificate') {
                            setManualIssuePayload((action as { payload?: unknown }).payload);
                        }
                        return next(action);
                    }) as Middleware),
                preloadedState: { ...testInitialState, certificates: { ...testInitialState.certificates, ...preloadedState } },
            }),
        [preloadedState],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ButtonsAndDialogs {...props} />
                <div data-testid="manual-issue-payload">{manualIssuePayload ? JSON.stringify(manualIssuePayload) : ''}</div>
            </MemoryRouter>
        </Provider>
    );
}
