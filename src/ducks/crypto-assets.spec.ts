import { describe, expect, test } from 'vitest';
import type { CryptographicAssetDetailDto, PaginationResponseDtoCryptographicAssetDto } from 'types/openapi';
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

const detail = { uuid: 'asset-1', name: 'RSA-2048' } as CryptographicAssetDetailDto;

describe('cryptoAssets slice, detail', () => {
    test('getCryptoAssetDetail drops the previous asset and its error, so a new uuid never shows the old one', () => {
        const failed = reducer(initialState, actions.getCryptoAssetDetailFailure({ error: 'gone', statusCode: 404 }));
        const loaded = reducer(failed, actions.getCryptoAssetDetailSuccess({ detail }));

        const refetching = reducer(loaded, actions.getCryptoAssetDetail({ uuid: 'asset-2' }));

        expect(refetching.assetDetail).toBeUndefined();
        expect(refetching.assetDetailError).toBeUndefined();
        expect(refetching.assetDetailErrorStatusCode).toBeUndefined();
        expect(refetching.isFetchingDetail).toBe(true);
    });

    test('getCryptoAssetDetailSuccess stores the asset for the selectors', () => {
        const state = reducer(
            reducer(initialState, actions.getCryptoAssetDetail({ uuid: 'asset-1' })),
            actions.getCryptoAssetDetailSuccess({ detail }),
        );
        const appState = { cryptoAssets: state } as never;

        expect(selectors.selectCryptoAssetDetail(appState)).toEqual(detail);
        expect(selectors.selectIsFetchingDetail(appState)).toBe(false);
    });

    test('getCryptoAssetDetailFailure keeps the status code, so the page can tell a missing asset from a failure', () => {
        const state = reducer(
            reducer(initialState, actions.getCryptoAssetDetail({ uuid: 'asset-1' })),
            actions.getCryptoAssetDetailFailure({ error: 'Not found', statusCode: 404 }),
        );
        const appState = { cryptoAssets: state } as never;

        expect(selectors.selectCryptoAssetDetailError(appState)).toBe('Not found');
        expect(selectors.selectCryptoAssetDetailErrorStatusCode(appState)).toBe(404);
        expect(selectors.selectIsFetchingDetail(appState)).toBe(false);
    });

    test('clearCryptoAssetDetail forgets the asset and its error', () => {
        const failed = reducer(initialState, actions.getCryptoAssetDetailFailure({ error: 'boom', statusCode: 500 }));

        const cleared = reducer(reducer(failed, actions.getCryptoAssetDetailSuccess({ detail })), actions.clearCryptoAssetDetail());

        expect(cleared).toEqual(initialState);
    });
});
