import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './cbom-sync-skips';

const page = {
    items: [{ uuid: 'skip-1', serialNumber: 'urn:uuid:a', version: 1, state: 'permanentlySkipped' }],
    totalItems: 1,
    pageNumber: 1,
    itemsPerPage: 10,
    totalPages: 1,
} as any;

describe('cbom sync skips slice', () => {
    test('returns the initial state for an unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('a list request clears the previous page and marks fetching; success stores the page', () => {
        let next = reducer({ ...initialState, skipsData: page }, actions.listSyncSkips({ filters: [], pageNumber: 1, itemsPerPage: 10 }));
        expect(next.skipsData).toBeUndefined();
        expect(next.isFetchingList).toBe(true);

        next = reducer(next, actions.listSyncSkipsSuccess({ data: page }));
        expect(next.skipsData).toEqual(page);
        expect(next.isFetchingList).toBe(false);
        expect(selectors.selectSkipList({ cbomSyncSkips: next } as any)).toEqual(page.items);

        next = reducer({ ...initialState, isFetchingList: true }, actions.listSyncSkipsFailure({ error: 'x' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('a retry marks its row busy and, once it landed, asks the list to re-read', () => {
        let next = reducer(initialState, actions.retrySyncSkip({ uuid: 'skip-1' }));
        expect(next.retryingUuid).toBe('skip-1');
        expect(next.listRefreshToken).toBe(0);

        next = reducer(next, actions.retrySyncSkipSuccess({ skip: page.items[0] }));
        expect(next.retryingUuid).toBeUndefined();
        expect(next.listRefreshToken).toBe(1);

        next = reducer({ ...initialState, retryingUuid: 'skip-2' }, actions.retrySyncSkipFailure({ error: 'x' }));
        expect(next.retryingUuid).toBeUndefined();
        expect(next.listRefreshToken).toBe(0);
    });

    test('resetState restores the initial values', () => {
        const dirty = { ...initialState, skipsData: page, isFetchingList: true, retryingUuid: 'skip-1', listRefreshToken: 4 };
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });
});
