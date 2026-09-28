import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configureStoreSpy = vi.hoisted(() => vi.fn());

vi.mock('@reduxjs/toolkit', async () => {
    const actual = await vi.importActual<typeof import('@reduxjs/toolkit')>('@reduxjs/toolkit');
    return {
        ...actual,
        configureStore: (options: Parameters<typeof actual.configureStore>[0]) => {
            configureStoreSpy(options);
            return actual.configureStore(options);
        },
    };
});

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

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    beforeEach(async () => {
        vi.resetModules();
        configureStoreSpy.mockClear();
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

    it('offers no Redux DevTools in a production build', () => {
        vi.stubEnv('NODE_ENV', 'production');

        configure();

        expect(configureStoreSpy).toHaveBeenCalledWith(expect.objectContaining({ devTools: false }));
    });

    it('masks the passphrases in the actions Redux DevTools shows in development', () => {
        vi.stubEnv('NODE_ENV', 'development');

        configure();

        const { devTools } = configureStoreSpy.mock.calls[0][0];
        const action = { type: 'cryptographicKeys/exportKey', payload: { keyExportRequestDto: { passphrase: 'correct horse battery' } } };
        expect(devTools.actionSanitizer(action, 0)).toEqual({
            type: 'cryptographicKeys/exportKey',
            payload: { keyExportRequestDto: { passphrase: '<masked>' } },
        });
    });
});
