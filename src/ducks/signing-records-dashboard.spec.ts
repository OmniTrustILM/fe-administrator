import { describe, expect, test } from 'vitest';
import { SigningRecordStatisticsPeriod } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './signing-records-dashboard';

describe('signingRecordsDashboard slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getStatistics sets isFetching, stores period, clears statistics', () => {
        const seeded = { ...initialState, statistics: { totalRetained: 9 } as any };
        const next = reducer(seeded, actions.getStatistics({ period: SigningRecordStatisticsPeriod._7d }));
        expect(next.isFetching).toBe(true);
        expect(next.period).toBe(SigningRecordStatisticsPeriod._7d);
        expect(next.statistics).toBeUndefined();
    });

    test('setPeriod sets isFetchingSeries and period without clearing statistics', () => {
        const seeded = { ...initialState, statistics: { totalRetained: 9 } as any };
        const next = reducer(seeded, actions.setPeriod({ period: SigningRecordStatisticsPeriod._30d }));
        expect(next.isFetchingSeries).toBe(true);
        expect(next.period).toBe(SigningRecordStatisticsPeriod._30d);
        expect(next.statistics).toEqual({ totalRetained: 9 });
    });

    test('getStatisticsSuccess stores statistics and clears both fetching flags', () => {
        const seeded = { ...initialState, isFetching: true, isFetchingSeries: true };
        const next = reducer(seeded, actions.getStatisticsSuccess({ statistics: { totalRetained: 3 } as any }));
        expect(next.isFetching).toBe(false);
        expect(next.isFetchingSeries).toBe(false);
        expect(next.statistics).toEqual({ totalRetained: 3 });
    });

    test('getStatisticsFailure clears both fetching flags', () => {
        const seeded = { ...initialState, isFetching: true, isFetchingSeries: true };
        const next = reducer(seeded, actions.getStatisticsFailure());
        expect(next.isFetching).toBe(false);
        expect(next.isFetchingSeries).toBe(false);
    });

    test('selectors read slice state', () => {
        const featureState = { ...initialState, isFetching: true, statistics: { totalRetained: 1 } as any };
        const state = { signingRecordsDashboard: featureState } as any;
        expect(selectors.selectState(state)).toEqual(featureState);
        expect(selectors.isFetching(state)).toBe(true);
        expect(selectors.statistics(state)).toEqual({ totalRetained: 1 });
        expect(selectors.period(state)).toBe(SigningRecordStatisticsPeriod._24h);
    });
});
