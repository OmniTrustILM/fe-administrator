import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('redux-observable', async () => {
    const actual = await vi.importActual<typeof import('redux-observable')>('redux-observable');
    return {
        ...actual,
        createEpicMiddleware: vi.fn(() => {
            const middleware = (_store: any) => (next: any) => (action: any) => next(action);
            (middleware as any).run = vi.fn();
            return middleware;
        }),
    };
});

vi.mock('./App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(),
        subscribe: vi.fn(),
    },
}));

describe('store', () => {
    let configure: typeof import('./store').default;
    let initialState: any;

    beforeEach(async () => {
        vi.resetModules();
        const storeModule = await import('./store');
        configure = storeModule.default;
        const initialStateModule = await import('./ducks/initial-state');
        initialState = initialStateModule.initialState;
    });

    it('should configure the store with the initial state', () => {
        const store = configure();
        const state = store.getState();
        // Check if some key slices are present and match the initial state
        expect(state.alerts).toEqual(initialState.alerts);
        expect(state.auth).toEqual(initialState.auth);
    });
});
