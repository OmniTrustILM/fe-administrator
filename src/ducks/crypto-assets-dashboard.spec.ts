import { describe, expect, test } from 'vitest';
import type { CryptographicAssetStatisticsDto } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './crypto-assets-dashboard';

const statistics = { totalAssets: 12418, sourceCbomCount: 37 } as CryptographicAssetStatisticsDto;

describe('cryptoAssetsDashboard slice', () => {
    test('returns initial state for an unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getStatistics raises the busy flag so the page shows its skeleton', () => {
        const state = reducer(initialState, actions.getStatistics());

        expect(state.isFetching).toBe(true);
        expect(selectors.isFetching({ cryptoAssetsDashboard: state } as never)).toBe(true);
    });

    test('getStatisticsSuccess stores the statistics for the selectors', () => {
        const state = reducer(reducer(initialState, actions.getStatistics()), actions.getStatisticsSuccess({ statistics }));

        expect(state.isFetching).toBe(false);
        expect(selectors.statistics({ cryptoAssetsDashboard: state } as never)).toEqual(statistics);
    });

    test('a failed refresh keeps the last statistics rather than blanking the estate', () => {
        const loaded = reducer(initialState, actions.getStatisticsSuccess({ statistics }));

        const state = reducer(reducer(loaded, actions.getStatistics()), actions.getStatisticsFailure({ error: 'boom' }));

        expect(state.isFetching).toBe(false);
        expect(state.statistics).toEqual(statistics);
    });
});
