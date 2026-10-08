import { isAnyOf } from '@reduxjs/toolkit';
import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { catchError, filter, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { LockTypeEnum, LockWidgetNameEnum, type WidgetLockErrorModel } from 'types/user-interface';
import { extractError, getLockWidgetObject } from 'utils/net';
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

// Leaving the page cancels a request still in flight, so nothing lands in the state the page has just cleared.
const leavingThePage = (action$: Parameters<AppEpic>[0]) => action$.pipe(filter(slice.actions.clearCryptoAssetDetail.match));

const getCryptoAssetDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCryptoAssetDetail.match),
        switchMap((action) =>
            deps.apiClients.cryptographicAssets.getCryptographicAsset({ uuid: action.payload.uuid }).pipe(
                map((detail) => slice.actions.getCryptoAssetDetailSuccess({ detail })),
                // No widget lock: the request clears the asset, so the page's own error card is what renders.
                catchError((err) =>
                    of(
                        slice.actions.getCryptoAssetDetailFailure({
                            error: extractError(err, 'Failed to fetch cryptographic asset'),
                            statusCode: typeof err?.status === 'number' ? err.status : undefined,
                        }),
                    ),
                ),
                takeUntil(leavingThePage(action$)),
            ),
        ),
    );
};

const UNEXPLAINED_LOCK: WidgetLockErrorModel = {
    lockTitle: 'Explanation unavailable',
    lockText: 'The PQC verdict explanation could not be loaded',
    lockType: LockTypeEnum.NETWORK,
};

// A reload of the detail cancels an explanation in flight as well: the reload resets it, and the page asks again.
const getCryptoAssetPqcExplanation: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCryptoAssetPqcExplanation.match),
        switchMap((action) =>
            deps.apiClients.cryptographicAssets.getCryptographicAssetPqcExplanation({ uuid: action.payload.uuid }).pipe(
                map((explanation) => slice.actions.getCryptoAssetPqcExplanationSuccess({ explanation })),
                catchError((err) =>
                    of(
                        slice.actions.getCryptoAssetPqcExplanationFailure({
                            lock: err instanceof AjaxError ? getLockWidgetObject(err) : UNEXPLAINED_LOCK,
                        }),
                    ),
                ),
                takeUntil(action$.pipe(filter(isAnyOf(slice.actions.getCryptoAssetDetail, slice.actions.clearCryptoAssetDetail)))),
            ),
        ),
    );
};

const epics = [listCryptoAssets, getCryptoAssetDetail, getCryptoAssetPqcExplanation];

export default epics;
