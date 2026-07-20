import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';

import CertificateForm from './index';

export type CertificateFormTestWrapperProps = Readonly<{
    onCancel?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    onAction?: (action: { type: string; payload?: unknown }) => void;
}>;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — a store built there and passed in as a prop mounts fine (Provider
 * renders), but the first `useSelector` read inside the tree sees an undefined snapshot and
 * throws. Building the store inside the mounted component (as done here) avoids that entirely.
 * See RequestValidationDialogBodyTestWrapper.tsx for the established precedent.
 */
export function CertificateFormTestWrapper({ onCancel, preloadedState, onAction }: CertificateFormTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) =>
                    getDefaultMiddleware({ serializableCheck: false }).concat((_store) => (next) => (action) => {
                        onAction?.(action as { type: string; payload?: unknown });
                        return next(action);
                    }),
                preloadedState: { ...testInitialState, ...preloadedState },
            }),
        [preloadedState, onAction],
    );

    return (
        <Provider store={store}>
            <MemoryRouter>
                <CertificateForm onCancel={onCancel} />
            </MemoryRouter>
        </Provider>
    );
}

export default CertificateFormTestWrapper;
