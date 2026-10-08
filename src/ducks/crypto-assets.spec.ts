import { describe, expect, test } from 'vitest';
import type {
    CryptographicAssetDetailDto,
    CryptographicAssetPqcExplanationDto,
    PaginationResponseDtoCryptographicAssetDto,
} from 'types/openapi';
import { LockTypeEnum } from 'types/user-interface';
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

const lock = { lockTitle: 'Not Found', lockText: 'The requested resource does not exist', lockType: LockTypeEnum.GENERIC };

const explanation = { uuid: 'asset-1', ruleId: 'CLASSICAL-SHOR', steps: [] } as unknown as CryptographicAssetPqcExplanationDto;

describe('cryptoAssets slice, PQC explanation', () => {
    test('a refresh of the same asset keeps its explanation under the spinner', () => {
        const loaded = reducer(initialState, actions.getCryptoAssetPqcExplanationSuccess({ explanation }));

        const refreshing = reducer(loaded, actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' }));

        expect(refreshing.pqcExplanation).toEqual(explanation);
        expect(selectors.selectIsFetchingPqcExplanation({ cryptoAssets: refreshing } as never)).toBe(true);
    });

    test.each([
        ['a loaded explanation', actions.getCryptoAssetPqcExplanationSuccess({ explanation })],
        ['a locked explanation', actions.getCryptoAssetPqcExplanationFailure({ lock })],
        ['an explanation in flight', actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })],
    ])('a reload of the detail starts from nothing, dropping %s', (_, before) => {
        const reloading = reducer(reducer(initialState, before), actions.getCryptoAssetDetail({ uuid: 'asset-2' }));

        expect(reloading.pqcExplanation).toBeUndefined();
        expect(reloading.pqcExplanationLock).toBeUndefined();
        expect(reloading.isFetchingPqcExplanation).toBe(false);
    });

    test('success stores the explanation for the selector and clears the busy flag', () => {
        const state = reducer(
            reducer(initialState, actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })),
            actions.getCryptoAssetPqcExplanationSuccess({ explanation }),
        );

        expect(selectors.selectPqcExplanation({ cryptoAssets: state } as never)).toEqual(explanation);
        expect(state.isFetchingPqcExplanation).toBe(false);
    });

    test('a failure locks the explanation, drops what was shown and leaves the detail as it was', () => {
        const withDetail = reducer(initialState, actions.getCryptoAssetDetailSuccess({ detail }));
        const loaded = reducer(withDetail, actions.getCryptoAssetPqcExplanationSuccess({ explanation }));

        const failed = reducer(
            reducer(loaded, actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' })),
            actions.getCryptoAssetPqcExplanationFailure({ lock }),
        );

        expect(failed.pqcExplanation).toBeUndefined();
        expect(selectors.selectPqcExplanationLock({ cryptoAssets: failed } as never)).toEqual(lock);
        expect(failed.isFetchingPqcExplanation).toBe(false);
        expect(failed.assetDetail).toEqual(detail);
    });

    test('a retry lifts the lock while it is in flight', () => {
        const failed = reducer(initialState, actions.getCryptoAssetPqcExplanationFailure({ lock }));

        const retrying = reducer(failed, actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' }));

        expect(retrying.pqcExplanationLock).toBeUndefined();
        expect(retrying.isFetchingPqcExplanation).toBe(true);
    });

    test.each([
        ['a loaded explanation being refreshed', actions.getCryptoAssetPqcExplanationSuccess({ explanation })],
        ['a locked explanation being retried', actions.getCryptoAssetPqcExplanationFailure({ lock })],
    ])('clearCryptoAssetDetail forgets %s with the asset', (_, settled) => {
        const fetching = reducer(reducer(initialState, settled), actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' }));

        expect(reducer(fetching, actions.clearCryptoAssetDetail())).toEqual(initialState);
    });
});
