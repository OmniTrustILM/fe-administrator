import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { configureStore, type UnknownAction } from '@reduxjs/toolkit';

declare global {
    var __lastDispatchedAction: { type: string; payload: unknown } | undefined;
}

function recordDispatchedAction(action: UnknownAction) {
    if (typeof globalThis !== 'undefined') {
        globalThis.__lastDispatchedAction = { type: action.type, payload: (action as { payload?: unknown }).payload };
    }
}

const dispatchSpyMiddleware = () => (next: (action: UnknownAction) => unknown) => (action: UnknownAction) => {
    recordDispatchedAction(action);
    return next(action);
};

export function makeDispatchSpyStore() {
    return configureStore({
        reducer: () => ({}),
        middleware: () => [dispatchSpyMiddleware as never],
    });
}

type StoreWrapperProps = Readonly<{ children: React.ReactNode }>;

export function StoreWrapper({ children }: StoreWrapperProps) {
    const store = makeDispatchSpyStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
        </Provider>
    );
}
