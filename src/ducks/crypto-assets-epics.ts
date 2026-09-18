import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { slice } from './crypto-assets';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

function clampedPageSize(requested: number | undefined, served: number | undefined): number | undefined {
    if (typeof served !== 'number' || served < 1) return undefined;
    if (served === requested) return undefined;
    return served;
}

const listCryptoAssets: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listCryptoAssets.match),
        switchMap((action) =>
            concat(
                of(pagingActions.list(EntityType.CRYPTO_ASSET)),
                deps.apiClients.cryptographicAssets.listCryptographicAssets({ searchRequestDto: action.payload }).pipe(
                    mergeMap((response) =>
                        of(
                            slice.actions.listCryptoAssetsSuccess({ data: response }),
                            pagingActions.listSuccess({
                                entity: EntityType.CRYPTO_ASSET,
                                totalItems: response.totalItems ?? response.items?.length ?? 0,
                                pageSize: clampedPageSize(action.payload.itemsPerPage, response.itemsPerPage),
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCryptoAssets),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.listCryptoAssetsFailure({ error: extractError(err, 'Failed to fetch cryptographic assets') }),
                            pagingActions.listFailure(EntityType.CRYPTO_ASSET),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfCryptoAssets),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const epics = [listCryptoAssets];

export default epics;
