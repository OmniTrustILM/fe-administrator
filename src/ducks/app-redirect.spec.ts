import { describe, expect, test } from 'vitest';
import { AjaxError } from 'rxjs/ajax';
import { actions, initialState, reducer, selectors } from './app-redirect';

describe('appRedirect slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('setUnAuthorized sets unauthorized to true', () => {
        const state = reducer(initialState, actions.setUnAuthorized());
        expect(state.unauthorized).toBe(true);
    });

    test('clearUnauthorized sets unauthorized to false', () => {
        const state = reducer({ ...initialState, unauthorized: true }, actions.clearUnauthorized());
        expect(state.unauthorized).toBe(false);
    });

    test('goBack sets goBack to true', () => {
        const state = reducer(initialState, actions.goBack());
        expect(state.goBack).toBe(true);
    });

    test('clearGoBack sets goBack to false', () => {
        const state = reducer({ ...initialState, goBack: true }, actions.clearGoBack());
        expect(state.goBack).toBe(false);
    });

    test('redirect sets redirectUrl', () => {
        const state = reducer(initialState, actions.redirect({ url: '/dashboard' }));
        expect(state.redirectUrl).toBe('/dashboard');
    });

    test('clearRedirectUrl sets redirectUrl to undefined', () => {
        const state = reducer({ ...initialState, redirectUrl: '/some-path' }, actions.clearRedirectUrl());
        expect(state.redirectUrl).toBeUndefined();
    });

    describe('fetchError', () => {
        test('sets unauthorized to true when error is AjaxError with status 401', () => {
            const ajaxError = new AjaxError('Unauthorized', {} as any, {} as any);
            Object.defineProperty(ajaxError, 'status', { value: 401 });
            const state = reducer(initialState, actions.fetchError({ error: ajaxError, message: 'Unauthorized' }));
            expect(state.unauthorized).toBe(true);
        });

        test('does not set unauthorized for AjaxError with non-401 status', () => {
            const ajaxError = new AjaxError('Forbidden', {} as any, {} as any);
            Object.defineProperty(ajaxError, 'status', { value: 403 });
            const state = reducer(initialState, actions.fetchError({ error: ajaxError, message: 'Forbidden' }));
            expect(state.unauthorized).toBe(false);
        });

        test('does not set unauthorized for a plain Error', () => {
            const state = reducer(initialState, actions.fetchError({ error: new Error('network error'), message: 'network error' }));
            expect(state.unauthorized).toBe(false);
        });

        test('does not set unauthorized when error is undefined', () => {
            const state = reducer(initialState, actions.fetchError({ error: undefined, message: 'no error' }));
            expect(state.unauthorized).toBe(false);
        });
    });

    describe('selectors', () => {
        const store = {
            appRedirect: {
                unauthorized: true,
                goBack: true,
                redirectUrl: '/target',
            },
        };

        test('unauthorized returns unauthorized from state', () => {
            expect(selectors.unauthorized(store)).toBe(true);
        });

        test('goBack returns goBack from state', () => {
            expect(selectors.goBack(store)).toBe(true);
        });

        test('redirectUrl returns redirectUrl from state', () => {
            expect(selectors.redirectUrl(store)).toBe('/target');
        });

        test('redirectUrl returns undefined when not set', () => {
            const s = { appRedirect: { unauthorized: false, goBack: false } };
            expect(selectors.redirectUrl(s)).toBeUndefined();
        });
    });
});
