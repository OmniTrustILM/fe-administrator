import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { slice } from './crypto-assets';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

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

const getCryptoAssetDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCryptoAssetDetail.match),
        switchMap((action) =>
            deps.apiClients.cryptographicAssets.getCryptographicAsset({ uuid: action.payload.uuid }).pipe(
                mergeMap((detail) =>
                    of(
                        slice.actions.getCryptoAssetDetailSuccess({ detail }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CryptoAssetDetail),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getCryptoAssetDetailFailure({
                            error: extractError(err, 'Failed to fetch cryptographic asset'),
                            statusCode: typeof err?.status === 'number' ? err.status : undefined,
                        }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CryptoAssetDetail),
                    ),
                ),
            ),
        ),
    );
};

const epics = [listCryptoAssets, getCryptoAssetDetail];

export default epics;
