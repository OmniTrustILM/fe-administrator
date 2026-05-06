import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './info';

const samplePlatformInfo = {
    version: '2.0.0',
    buildTime: '2024-01-01T00:00:00Z',
} as any;

describe('info slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getPlatformInfo clears platformInfo and sets isFetching to true', () => {
        const state = reducer({ isFetching: false, platformInfo: samplePlatformInfo }, actions.getPlatformInfo());
        expect(state.isFetching).toBe(true);
        expect(state.platformInfo).toBeUndefined();
    });

    test('getPlatformInfoSuccess sets platformInfo and clears isFetching', () => {
        const state = reducer({ isFetching: true, platformInfo: undefined }, actions.getPlatformInfoSuccess(samplePlatformInfo));
        expect(state.isFetching).toBe(false);
        expect(state.platformInfo).toEqual(samplePlatformInfo);
    });

    test('getPlatformInfoFailure clears isFetching', () => {
        const state = reducer({ isFetching: true, platformInfo: undefined }, actions.getPlatformInfoFailure());
        expect(state.isFetching).toBe(false);
    });

    describe('selectors', () => {
        const store = {
            info: {
                isFetching: true,
                platformInfo: samplePlatformInfo,
            },
        };

        test('platformInfo returns platformInfo from state', () => {
            expect(selectors.platformInfo(store)).toEqual(samplePlatformInfo);
        });

        test('platformInfo returns undefined when not set', () => {
            const s = { info: { isFetching: false, platformInfo: undefined } };
            expect(selectors.platformInfo(s)).toBeUndefined();
        });

        test('isFetching returns isFetching from state', () => {
            expect(selectors.isFetching(store)).toBe(true);
        });

        test('isFetching returns false from state', () => {
            const s = { info: { isFetching: false } };
            expect(selectors.isFetching(s)).toBe(false);
        });

        test('state selector falls back to initialState when slice is undefined', () => {
            const s = {};
            expect(selectors.state(s)).toEqual(initialState);
        });

        test('state selector returns the info slice when present', () => {
            expect(selectors.state(store)).toEqual(store.info);
        });
    });
});
