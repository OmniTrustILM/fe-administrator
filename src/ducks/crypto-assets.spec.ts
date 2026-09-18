import { describe, expect, test } from 'vitest';
import type { PaginationResponseDtoCryptographicAssetDto } from 'types/openapi';
import reducer, { actions, initialState, selectors } from './crypto-assets';

const page = {
    items: [{ uuid: 'asset-1' }],
    totalItems: 1,
    pageNumber: 1,
    itemsPerPage: 10,
    totalPages: 1,
} as PaginationResponseDtoCryptographicAssetDto;

const request = { pageNumber: 1, itemsPerPage: 10, filters: [] };

describe('cryptoAssets slice', () => {
    test('returns initial state for an unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values and clears unknown keys', () => {
        const dirtyState = {
            ...initialState,
            assetsData: page,
            isFetchingList: true,
            tempOnlyKey: 'to-be-removed',
        } as never;

        expect(reducer(dirtyState, actions.resetState())).toEqual(initialState);
    });

    test('listCryptoAssets keeps the previous page under the busy overlay instead of dropping to the skeleton', () => {
        const listed = reducer(initialState, actions.listCryptoAssetsSuccess({ data: page }));

        const refetching = reducer(listed, actions.listCryptoAssets(request));

        expect(refetching.assetsData).toEqual(page);
        expect(refetching.isFetchingList).toBe(true);
    });

    test('listCryptoAssetsSuccess stores the page and clears the busy flag', () => {
        const state = reducer(initialState, actions.listCryptoAssetsSuccess({ data: page }));

        expect(state.assetsData).toEqual(page);
        expect(state.isFetchingList).toBe(false);
        expect(selectors.selectCryptoAssetList({ cryptoAssets: state } as never)).toEqual(page.items);
    });

    test('listCryptoAssetsFailure clears the busy flag', () => {
        const fetching = reducer(initialState, actions.listCryptoAssets(request));

        const state = reducer(fetching, actions.listCryptoAssetsFailure({ error: 'boom' }));

        expect(state.isFetchingList).toBe(false);
    });

    test('an empty list selects as one stable empty array, so dependants do not recompute for nothing', () => {
        const first = selectors.selectCryptoAssetList({ cryptoAssets: initialState } as never);
        const second = selectors.selectCryptoAssetList({
            cryptoAssets: reducer(initialState, actions.listCryptoAssetsFailure({ error: 'boom' })),
        } as never);

        expect(first).toEqual([]);
        expect(second).toBe(first);
    });

    test('the busy selector reads its flag', () => {
        const listing = reducer(initialState, actions.listCryptoAssets(request));

        expect(selectors.selectIsFetchingList({ cryptoAssets: listing } as never)).toBe(true);
    });
});
