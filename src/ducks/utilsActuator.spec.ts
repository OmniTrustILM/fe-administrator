import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './utilsActuator';

describe('utilsActuator slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('reset clears health', () => {
        const pre = { ...initialState, health: { status: 'UP' } };
        const next = reducer(pre, actions.reset());
        expect(next.health).toBeUndefined();
    });

    test('health clears health and sets isFetching', () => {
        const pre = { ...initialState, health: { status: 'UP' } };
        const next = reducer(pre, actions.health());
        expect(next.health).toBeUndefined();
        expect(next.isFetching).toBe(true);
    });

    test('healthSuccess sets health and clears isFetching', () => {
        const pre = { ...initialState, isFetching: true };
        const payload = { status: 'UP' };
        const next = reducer(pre, actions.healthSuccess(payload));
        expect(next.health).toEqual(payload);
        expect(next.isFetching).toBe(false);
    });

    test('healthFailure clears isFetching', () => {
        const pre = { ...initialState, isFetching: true };
        const next = reducer(pre, actions.healthFailure({ error: 'Network error' }));
        expect(next.isFetching).toBe(false);
    });

    test('healthFailure with undefined error clears isFetching', () => {
        const pre = { ...initialState, isFetching: true };
        const next = reducer(pre, actions.healthFailure({ error: undefined }));
        expect(next.isFetching).toBe(false);
    });
});

describe('utilsActuator selectors', () => {
    test('all selectors read correct values from store', () => {
        const featureState = {
            ...initialState,
            health: { status: 'UP' },
            isFetching: true,
        } as any;

        const store = { utilsActuator: featureState } as any;

        expect(selectors.state(store)).toBe(featureState);
        expect(selectors.health(store)).toEqual({ status: 'UP' });
        expect(selectors.isFetching(store)).toBe(true);
    });

    test('selectors return undefined health and false isFetching for initial state', () => {
        const store = { utilsActuator: initialState } as any;

        expect(selectors.health(store)).toBeUndefined();
        expect(selectors.isFetching(store)).toBe(false);
    });
});
