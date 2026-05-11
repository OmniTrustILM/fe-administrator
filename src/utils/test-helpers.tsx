import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type React from 'react';
import { testReducers, testInitialState } from 'ducks/test-reducers';
import type { ApiClients } from '../api';

/**
 * Creates a mock Redux store for testing
 * @param preloadedState - Optional initial state for the store
 * @param mockApiClients - Optional mock API clients for epic dependencies
 * @returns Configured Redux store
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const output = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
            output[key] = deepMerge(target[key] || {}, source[key] as any);
        } else {
            output[key] = source[key] as any;
        }
    }
    return output;
}

export function createMockStore(preloadedState?: Partial<ReturnType<typeof testReducers>>, mockApiClients?: ApiClients) {
    const baseState = testInitialState;

    const finalState = preloadedState ? (deepMerge(baseState as any, preloadedState) as ReturnType<typeof testReducers>) : baseState;

    const store = configureStore({
        reducer: testReducers,
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false,
            }),
        preloadedState: finalState,
    });

    // Verify store state is properly initialized
    const state = store.getState();
    if (!state || typeof state !== 'object') {
        throw new Error('Store state is not properly initialized');
    }

    return store;
}

/**
 * Wraps a component with necessary providers for testing
 * @param component - React component to wrap
 * @param options - Configuration options
 * @returns Component wrapped with providers
 */
export function withProviders(
    component: React.ReactElement,
    options: {
        store?: ReturnType<typeof createMockStore>;
        initialRoute?: string;
    } = {},
) {
    const { store = createMockStore(), initialRoute = '/' } = options;

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>{component}</MemoryRouter>
        </Provider>
    );
}

/**
 * Helper to wait for async updates in tests
 */
export async function waitForAsync(timeout = 100) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
