import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { FilterFieldSource, type SearchRequestDto, SortDirection } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { describe, expect, test } from 'vitest';
import cryptoAssetEpics from './crypto-assets-epics';
import { slice } from './crypto-assets';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

const [listCryptoAssets, getCryptoAssetDetail] = cryptoAssetEpics;

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 10, totalPages: 0 };
const assetDetail = { uuid: 'asset-1', name: 'RSA-2048' };

type CryptoAssetApi = {
    listCryptographicAssets: (args: { searchRequestDto: unknown }) => unknown;
    getCryptographicAsset: (args: { uuid: string }) => unknown;
};

function createDeps(cryptographicAssets: Partial<CryptoAssetApi> = {}) {
    return {
        apiClients: {
            cryptographicAssets: {
                listCryptographicAssets: () => of(emptyPage),
                getCryptographicAsset: () => of(assetDetail),
                ...cryptographicAssets,
            },
        },
    } as never;
}

type RunnableEpic = (action$: unknown, state$: unknown, deps: unknown) => Observable<unknown>;

const run = (epic: (typeof cryptoAssetEpics)[number], action: unknown, deps: unknown, count: number): Promise<unknown[]> =>
    firstValueFrom((epic as unknown as RunnableEpic)(of(action), of({}), deps).pipe(take(count), toArray()));

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

        const emitted = await run(getCryptoAssetDetail, slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }), deps, 1);

        expect(emitted).toEqual([slice.actions.getCryptoAssetDetailSuccess({ detail: assetDetail as never })]);
    });

    // The page's own error card owns the failed load, so a lock here would be written where nothing renders it.
    test('getCryptoAssetDetail failure keeps the status code and locks no widget', async () => {
        const error = { status: 403 };
        const deps = createDeps({ getCryptographicAsset: () => throwError(() => error) });

        const emitted = await run(getCryptoAssetDetail, slice.actions.getCryptoAssetDetail({ uuid: 'asset-1' }), deps, 1);

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
