import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { describe, expect, test } from 'vitest';
import cryptoAssetEpics from './crypto-assets-epics';
import { slice } from './crypto-assets';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

const [listCryptoAssets] = cryptoAssetEpics;

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 10, totalPages: 0 };

type CryptoAssetApi = {
    listCryptographicAssets: (args: { searchRequestDto: unknown }) => unknown;
};

function createDeps(cryptographicAssets: Partial<CryptoAssetApi> = {}) {
    return {
        apiClients: {
            cryptographicAssets: {
                listCryptographicAssets: () => of(emptyPage),
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
});
