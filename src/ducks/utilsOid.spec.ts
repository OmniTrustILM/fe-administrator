import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './utilsOid';

describe('utilsOid slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('getOidInfo clears oidInfo and sets isFetchingDetail', () => {
        const pre = { ...initialState, oidInfo: { oid: '1.2.3' } as any };
        const next = reducer(pre, actions.getOidInfo('1.2.3'));
        expect(next.oidInfo).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getOidInfoSuccess sets oidInfo and clears isFetchingDetail', () => {
        const pre = { ...initialState, isFetchingDetail: true };
        const payload = { oid: '1.2.3', name: 'someName' } as any;
        const next = reducer(pre, actions.getOidInfoSuccess(payload));
        expect(next.oidInfo).toEqual(payload);
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getOidInfoFailure clears isFetchingDetail', () => {
        const pre = { ...initialState, isFetchingDetail: true };
        const next = reducer(pre, actions.getOidInfoFailure({ error: 'Not found' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getOidInfoFailure with undefined error clears isFetchingDetail', () => {
        const pre = { ...initialState, isFetchingDetail: true };
        const next = reducer(pre, actions.getOidInfoFailure({ error: undefined }));
        expect(next.isFetchingDetail).toBe(false);
    });
});

describe('utilsOid selectors', () => {
    test('all selectors read correct values from store', () => {
        const featureState = {
            ...initialState,
            oidInfo: { oid: '1.2.3', name: 'someName' } as any,
            isFetchingDetail: true,
        } as any;

        const store = { utilsOid: featureState } as any;

        expect(selectors.state(store)).toBe(featureState);
        expect(selectors.oidInfo(store)).toEqual({ oid: '1.2.3', name: 'someName' });
        expect(selectors.isFetchingDetail(store)).toBe(true);
    });

    test('selectors return undefined oidInfo and false isFetchingDetail for initial state', () => {
        const store = { utilsOid: initialState } as any;

        expect(selectors.oidInfo(store)).toBeUndefined();
        expect(selectors.isFetchingDetail(store)).toBe(false);
    });
});
