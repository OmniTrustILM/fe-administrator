import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './statisticsDashboard';

describe('statisticsDashboard slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getDashboard / getDashboardSuccess / getDashboardFailed', () => {
        let next = reducer(initialState, actions.getDashboard());
        expect(next.isFetching).toBe(true);
        expect(next.statisticsDashboard).toBeUndefined();

        next = reducer(next, actions.getDashboardSuccess({ statisticsDashboard: { totalCertificates: 5 } as any }));
        expect(next.isFetching).toBe(false);
        expect(next.statisticsDashboard).toEqual({ totalCertificates: 5 });

        next = reducer({ ...next, isFetching: true }, actions.getDashboardFailed());
        expect(next.isFetching).toBe(false);
    });
});

describe('statisticsDashboard selectors', () => {
    test('selectState returns slice state', () => {
        const state = { statisticsDashboard: initialState } as any;
        expect(selectors.selectState(state)).toEqual(initialState);
    });

    test('isFetching selector', () => {
        const featureState = { ...initialState, isFetching: true };
        const state = { statisticsDashboard: featureState } as any;
        expect(selectors.isFetching(state)).toBe(true);
    });

    test('statisticsDashboard selector', () => {
        const featureState = { ...initialState, statisticsDashboard: { totalCertificates: 10 } as any };
        const state = { statisticsDashboard: featureState } as any;
        expect(selectors.statisticsDashboard(state)).toEqual({ totalCertificates: 10 });
    });
});
