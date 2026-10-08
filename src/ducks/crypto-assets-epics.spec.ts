import { firstValueFrom, type Observable, of, Subject, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
import { FilterFieldSource, type SearchRequestDto, SortDirection } from 'types/openapi';
import { LockTypeEnum, LockWidgetNameEnum } from 'types/user-interface';
import { describe, expect, test } from 'vitest';
import cryptoAssetEpics from './crypto-assets-epics';
import { slice } from './crypto-assets';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

const [listCryptoAssets, getCryptoAssetDetail, getCryptoAssetPqcExplanation] = cryptoAssetEpics;

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 10, totalPages: 0 };
const assetDetail = { uuid: 'asset-1', name: 'RSA-2048' };
const explanation = { uuid: 'asset-1', ruleId: 'CLASSICAL-SHOR', steps: [] };

type CryptoAssetApi = {
    listCryptographicAssets: (args: { searchRequestDto: unknown }) => unknown;
    getCryptographicAsset: (args: { uuid: string }) => unknown;
    getCryptographicAssetPqcExplanation: (args: { uuid: string }) => unknown;
};

function createDeps(cryptographicAssets: Partial<CryptoAssetApi> = {}) {
    return {
        apiClients: {
            cryptographicAssets: {
                listCryptographicAssets: () => of(emptyPage),
                getCryptographicAsset: () => of(assetDetail),
                getCryptographicAssetPqcExplanation: () => of(explanation),
                ...cryptographicAssets,
            },
        },
    } as never;
}

type RunnableEpic = (action$: unknown, state$: unknown, deps: unknown) => Observable<unknown>;

type Epic = (typeof cryptoAssetEpics)[number];

const run = (epic: Epic, action: unknown, deps: unknown, count: number): Promise<unknown[]> =>
    firstValueFrom((epic as unknown as RunnableEpic)(of(action), of({}), deps).pipe(take(count), toArray()));

const all = (epic: Epic, action: unknown, deps: unknown): Promise<unknown[]> =>
    firstValueFrom((epic as unknown as RunnableEpic)(of(action), of({}), deps).pipe(toArray()));

// Feeds actions one at a time, so a test can act between a request and its answer.
const runLive = (epic: Epic, cryptographicAssets: Partial<CryptoAssetApi>) => {
    const action$ = new Subject<unknown>();
    const emitted: unknown[] = [];
    (epic as unknown as RunnableEpic)(action$, of({}), createDeps(cryptographicAssets)).subscribe((action) => emitted.push(action));
    return { action$, emitted };
};

describe('crypto asset epics', () => {
    test('listCryptoAssets forwards the search request and reports the total to the paging duck', async () => {
        const searchRequest = { pageNumber: 2, itemsPerPage: 25, filters: [] };
        const response = { items: [{ uuid: 'asset-1' }], totalItems: 5903, pageNumber: 2, itemsPerPage: 25, totalPages: 237 };

        const deps = createDeps({
            listCryptographicAssets: ({ searchRequestDto }) => {
                expect(searchRequestDto).toEqual(searchRequest);
                return of(response);
            },
        });

        const emitted = await run(listCryptoAssets, slice.actions.listCryptoAssets(searchRequest as never), deps, 4);

        expect(emitted).toEqual([
            pagingActions.list(EntityType.CRYPTO_ASSET),
            slice.actions.listCryptoAssetsSuccess({ data: response as never }),
            pagingActions.listSuccess({ entity: EntityType.CRYPTO_ASSET, totalItems: 5903 }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCryptoAssets),
        ]);
    });

    test('listCryptoAssets forwards the requested columns and sort, so the server orders and projects the whole inventory', async () => {
        const searchRequest: SearchRequestDto = {
            pageNumber: 2,
            itemsPerPage: 25,
            filters: [],
            columns: [
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CBOM_ASSET_NAME' },
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CBOM_ASSET_SOURCE_COUNT' },
            ],
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CBOM_ASSET_SOURCE_COUNT', direction: SortDirection.Desc },
        };
        const forwarded: unknown[] = [];
        const deps = createDeps({
            listCryptographicAssets: ({ searchRequestDto }) => {
                forwarded.push(searchRequestDto);
                return of(emptyPage);
            },
        });

        await run(listCryptoAssets, slice.actions.listCryptoAssets(searchRequest), deps, 4);

        expect(forwarded).toEqual([searchRequest]);
    });

    test('a response without a total falls back to the item count rather than reporting zero', async () => {
        const deps = createDeps({
            listCryptographicAssets: () => of({ items: [{ uuid: 'a' }, { uuid: 'b' }] }),
        });

        const emitted = await run(
            listCryptoAssets,
            slice.actions.listCryptoAssets({ pageNumber: 1, itemsPerPage: 10, filters: [] } as never),
            deps,
            4,
        );

        expect(emitted[2]).toEqual(pagingActions.listSuccess({ entity: EntityType.CRYPTO_ASSET, totalItems: 2 }));
    });

    test('a page size the server clamped is reported back, so paging follows the served boundaries', async () => {
        const deps = createDeps({
            listCryptographicAssets: () => of({ items: [{ uuid: 'a' }], totalItems: 5000, pageNumber: 1, itemsPerPage: 1000 }),
        });

        const emitted = await run(
            listCryptoAssets,
            slice.actions.listCryptoAssets({ pageNumber: 1, itemsPerPage: 2000, filters: [] } as never),
            deps,
            4,
        );

        expect(emitted[2]).toEqual(pagingActions.listSuccess({ entity: EntityType.CRYPTO_ASSET, totalItems: 5000, pageSize: 1000 }));
    });

    // A response overtaken by a newer page-size choice must not put the old size back.
    test('a page size the server served unchanged is not reported back', async () => {
        const emitted = await run(
            listCryptoAssets,
            slice.actions.listCryptoAssets({ pageNumber: 1, itemsPerPage: 10, filters: [] } as never),
            createDeps(),
            4,
        );

        expect((emitted[2] as { payload: { pageSize?: number } }).payload.pageSize).toBeUndefined();
    });

    test('listCryptoAssets failure locks the list widget', async () => {
        const error = { status: 403 };
        const deps = createDeps({ listCryptographicAssets: () => throwError(() => error) });

        const emitted = await run(
            listCryptoAssets,
            slice.actions.listCryptoAssets({ pageNumber: 1, itemsPerPage: 10, filters: [] } as never),
            deps,
            4,
        );

        expect(emitted[0]).toEqual(pagingActions.list(EntityType.CRYPTO_ASSET));
        expect(slice.actions.listCryptoAssetsFailure.match(emitted[1] as never)).toBe(true);
        expect(emitted[2]).toEqual(pagingActions.listFailure(EntityType.CRYPTO_ASSET));
        expect(emitted[3]).toEqual(userInterfaceActions.insertWidgetLock(error as never, LockWidgetNameEnum.ListOfCryptoAssets));
    });

    test('getCryptoAssetDetail fetches the requested uuid', async () => {
        const deps = createDeps({
            getCryptographicAsset: ({ uuid }) => {
                expect(uuid).toBe('asset-1');
                return of(assetDetail);
            },
        });

        const emitted = await all(getCryptoAssetDetail, slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }), deps);

        expect(emitted).toEqual([slice.actions.getCryptoAssetDetailSuccess({ detail: assetDetail as never })]);
    });

    // The page's own error card owns the failed load, so a lock here would be written where nothing renders it.
    test('getCryptoAssetDetail failure keeps the status code and locks no widget', async () => {
        const error = { status: 403 };
        const deps = createDeps({ getCryptographicAsset: () => throwError(() => error) });

        const emitted = await all(getCryptoAssetDetail, slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }), deps);

        const failure = emitted[0] as ReturnType<typeof slice.actions.getCryptoAssetDetailFailure>;
        expect(slice.actions.getCryptoAssetDetailFailure.match(failure)).toBe(true);
        expect(failure.payload.statusCode).toBe(403);
        expect(emitted).toHaveLength(1);
    });

    test('a failure without an HTTP status reports no status code rather than a made-up one', async () => {
        const deps = createDeps({ getCryptographicAsset: () => throwError(() => new Error('offline')) });

        const emitted = await run(getCryptoAssetDetail, slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }), deps, 1);

        expect((emitted[0] as ReturnType<typeof slice.actions.getCryptoAssetDetailFailure>).payload.statusCode).toBeUndefined();
    });
});

// An `AjaxError` cannot be constructed without a real XHR.
const ajaxError = (status: number): AjaxError => {
    const err = Object.assign(new Error(`HTTP ${status}`), { name: 'AjaxError', status });
    Object.setPrototypeOf(err, AjaxError.prototype);
    return err as unknown as AjaxError;
};

describe('leaving the detail page', () => {
    test('cancels a detail still in flight, so it does not land', () => {
        const response = new Subject<unknown>();
        const { action$, emitted } = runLive(getCryptoAssetDetail, { getCryptographicAsset: () => response });

        action$.next(slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }));
        action$.next(slice.actions.clearCryptoAssetDetail());
        response.next(assetDetail);

        expect(emitted).toEqual([]);
    });
});

describe('PQC explanation epic', () => {
    const request = slice.actions.getCryptoAssetPqcExplanation({ uuid: 'asset-1' });

    test('fetches the explanation of the requested uuid', async () => {
        const deps = createDeps({
            getCryptographicAssetPqcExplanation: ({ uuid }) => {
                expect(uuid).toBe('asset-1');
                return of(explanation);
            },
        });

        const emitted = await all(getCryptoAssetPqcExplanation, request, deps);

        expect(emitted).toEqual([slice.actions.getCryptoAssetPqcExplanationSuccess({ explanation: explanation as never })]);
    });

    // The lock travels in the slice rather than the global lock list, so the widget's own Refresh stays live as the retry.
    test('a 404 fails into the lock the widget renders, and writes no global widget lock', async () => {
        const deps = createDeps({ getCryptographicAssetPqcExplanation: () => throwError(() => ajaxError(404)) });

        const emitted = await all(getCryptoAssetPqcExplanation, request, deps);

        expect(emitted).toEqual([
            slice.actions.getCryptoAssetPqcExplanationFailure({
                lock: { lockTitle: 'Not Found', lockText: 'The requested resource does not exist', lockType: LockTypeEnum.GENERIC },
            }),
        ]);
    });

    test('a failure that is not an HTTP answer still locks, with its own wording', async () => {
        const deps = createDeps({ getCryptographicAssetPqcExplanation: () => throwError(() => new Error('offline')) });

        const emitted = await all(getCryptoAssetPqcExplanation, request, deps);

        expect(emitted).toEqual([
            slice.actions.getCryptoAssetPqcExplanationFailure({
                lock: {
                    lockTitle: 'Explanation unavailable',
                    lockText: 'The PQC verdict explanation could not be loaded',
                    lockType: LockTypeEnum.NETWORK,
                },
            }),
        ]);
    });

    const settlements: [string, (response: Subject<unknown>) => void][] = [
        ['an answer', (response) => response.next(explanation)],
        ['a failure', (response) => response.error(ajaxError(503))],
    ];
    const interruptions = [
        ['leaving the page', slice.actions.clearCryptoAssetDetail()],
        ['a reload of the detail', slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' })],
    ] as const;

    describe.each(interruptions)('%s cancels an explanation in flight', (_, interruption) => {
        test.each(settlements)('so %s cannot land in the state it has reset', (_name, settle) => {
            const response = new Subject<unknown>();
            const { action$, emitted } = runLive(getCryptoAssetPqcExplanation, { getCryptographicAssetPqcExplanation: () => response });

            action$.next(request);
            action$.next(interruption);
            settle(response);

            expect(emitted).toEqual([]);
        });
    });

    test('the epic keeps serving requests after a failure', () => {
        const responses: Record<string, Subject<unknown>> = { 'asset-1': new Subject(), 'asset-2': new Subject() };
        const { action$, emitted } = runLive(getCryptoAssetPqcExplanation, {
            getCryptographicAssetPqcExplanation: ({ uuid }) => responses[uuid],
        });

        action$.next(request);
        responses['asset-1'].error(ajaxError(503));
        action$.next(slice.actions.getCryptoAssetPqcExplanation({ uuid: 'asset-2' }));
        responses['asset-2'].next(explanation);

        expect(emitted).toHaveLength(2);
        expect(emitted[1]).toEqual(slice.actions.getCryptoAssetPqcExplanationSuccess({ explanation: explanation as never }));
    });
});
