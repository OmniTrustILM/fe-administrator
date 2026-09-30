import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
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
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const output = { ...target };
    for (const key in source) {
        const sourceValue = source[key];
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
            const targetValue = target[key];
            const base =
                targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)
                    ? (targetValue as Record<string, unknown>)
                    : {};
            output[key] = deepMerge(base, sourceValue as Partial<Record<string, unknown>>) as T[Extract<keyof T, string>];
        } else if (sourceValue !== undefined) {
            output[key] = sourceValue as T[Extract<keyof T, string>];
        }
    }
    return output;
}

export function createMockStore(preloadedState?: Partial<ReturnType<typeof testReducers>>, mockApiClients?: ApiClients) {
    const baseState = testInitialState;

    const finalState = preloadedState ? deepMerge<ReturnType<typeof testReducers>>(baseState, preloadedState) : baseState;

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

export type RecordedAction = { type: string; payload?: unknown };

type TestState = Partial<ReturnType<typeof testReducers>>;

function recordingMiddleware(onAction: (action: RecordedAction) => void): Middleware {
    return () => (next) => (action) => {
        onAction(action as RecordedAction);
        return next(action);
    };
}

export function createRecordingStore(preloadedState: TestState | undefined, onAction: (action: RecordedAction) => void) {
    return configureStore({
        reducer: testReducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(recordingMiddleware(onAction)),
        preloadedState: { ...testInitialState, ...preloadedState },
    });
}

/** Keeps the dispatched actions whose type starts with `prefix`. Call it inside the mounted tree: a store made in a CT spec does not reach the browser. */
export function useRecordingStore(preloadedState: TestState | undefined, prefix: string) {
    const [dispatched, setDispatched] = useState<RecordedAction[]>([]);
    const store = useMemo(
        () =>
            createRecordingStore(preloadedState, ({ type, payload }) => {
                if (type.startsWith(prefix)) setDispatched((seen) => [...seen, { type, payload }]);
            }),
        [preloadedState, prefix],
    );
    return { store, dispatched };
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

/** Mounts inside a plain div, so a spec can assert on (or assert the absence of) the component's own root element. */
export function inContainer(component: React.ReactElement) {
    return <div>{component}</div>;
}
