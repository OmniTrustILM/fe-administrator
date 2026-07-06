import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { configureStore, Tuple, type Middleware } from '@reduxjs/toolkit';

declare global {
    var __lastDispatchedAction: { type: string; payload: unknown } | undefined;
}

function recordDispatchedAction(action: unknown) {
    if (typeof globalThis === 'undefined') return;
    if (typeof action === 'object' && action !== null && 'type' in action) {
        const { type, payload } = action as { type: unknown; payload?: unknown };
        globalThis.__lastDispatchedAction = { type: String(type), payload };
    }
}

const dispatchSpyMiddleware: Middleware = () => (next) => (action) => {
    recordDispatchedAction(action);
    return next(action);
};

export function makeDispatchSpyStore() {
    return configureStore({
        reducer: () => ({}),
        middleware: () => new Tuple(dispatchSpyMiddleware),
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
