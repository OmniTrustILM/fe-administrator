import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './login';

describe('login slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getLoginMethods sets isFetching to true and clears error', () => {
        const state = reducer({ isFetching: false, error: 'prev error' }, actions.getLoginMethods({ redirect: '/home' }));
        expect(state.isFetching).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('getLoginMethods with no redirect payload sets isFetching to true', () => {
        const state = reducer(initialState, actions.getLoginMethods({}));
        expect(state.isFetching).toBe(true);
    });

    test('getLoginMethodsSuccess sets loginMethods and clears isFetching', () => {
        const loginMethods = [{ name: 'OIDC', loginUrl: '/login/oidc' }];
        const state = reducer({ isFetching: true }, actions.getLoginMethodsSuccess({ loginMethods } as any));
        expect(state.isFetching).toBe(false);
        expect(state.loginMethods).toEqual(loginMethods);
    });

    test('getLoginMethodsFailure sets error and clears isFetching', () => {
        const state = reducer({ isFetching: true }, actions.getLoginMethodsFailure({ error: 'fetch failed' } as any));
        expect(state.isFetching).toBe(false);
        expect(state.error).toBe('fetch failed');
    });

    test('resetState restores initial state', () => {
        const dirty = {
            isFetching: true,
            loginMethods: [{ name: 'X', loginUrl: '/x' }],
            error: 'err',
        };
        const state = reducer(dirty as any, actions.resetState());
        expect(state).toEqual(initialState);
    });

    test('resetState removes extra keys not in initialState', () => {
        const dirty = { isFetching: true, extraKey: 'extra' };
        const state = reducer(dirty as any, actions.resetState());
        expect((state as any).extraKey).toBeUndefined();
    });

    describe('selectors', () => {
        test('isFetching returns isFetching from state', () => {
            const store = { login: { isFetching: true } };
            expect(selectors.isFetching(store)).toBe(true);
        });

        test('loginMethods returns loginMethods from state', () => {
            const methods = [{ name: 'SAML', loginUrl: '/saml' }];
            const store = { login: { isFetching: false, loginMethods: methods } };
            expect(selectors.loginMethods(store)).toEqual(methods);
        });

        test('loginMethods returns undefined when not set', () => {
            const store = { login: { isFetching: false } };
            expect(selectors.loginMethods(store)).toBeUndefined();
        });

        test('error returns error from state', () => {
            const store = { login: { isFetching: false, error: 'something went wrong' } };
            expect(selectors.error(store)).toBe('something went wrong');
        });

        test('error returns undefined when no error', () => {
            const store = { login: { isFetching: false } };
            expect(selectors.error(store)).toBeUndefined();
        });
    });
});
