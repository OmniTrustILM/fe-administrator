import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { configureStore, type AnyAction } from '@reduxjs/toolkit';

declare global {
    interface Window {
        __lastDispatchedAction?: { type: string; payload: any };
    }
}

export function makeDispatchSpyStore() {
    return configureStore({
        reducer: () => ({}),
        middleware: () => [
            (() => (next: any) => (action: AnyAction) => {
                if (typeof window !== 'undefined') {
                    window.__lastDispatchedAction = { type: action.type, payload: action.payload };
                }
                return next(action);
            }) as any,
        ],
    });
}

export function StoreWrapper({ children }: { children: React.ReactNode }) {
    const store = makeDispatchSpyStore();
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
        </Provider>
    );
}
