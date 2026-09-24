import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { slice } from './cbom-sync-skips';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

const listSyncSkips: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listSyncSkips.match),
        switchMap((action) =>
            concat(
                of(pagingActions.list(EntityType.CBOM_SYNC_SKIP)),
                deps.apiClients.cbomManagement.listCbomSyncSkips({ searchRequestDto: action.payload }).pipe(
                    mergeMap((response) =>
                        of(
                            slice.actions.listSyncSkipsSuccess({ data: response }),
                            pagingActions.listSuccess({
                                entity: EntityType.CBOM_SYNC_SKIP,
                                totalItems: response.totalItems ?? response.items?.length ?? 0,
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCbomSyncSkips),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.listSyncSkipsFailure({ error: extractError(err, 'Failed to fetch the skipped documents') }),
                            pagingActions.listFailure(EntityType.CBOM_SYNC_SKIP),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfCbomSyncSkips),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const retrySyncSkip: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.retrySyncSkip.match),
        switchMap((action) =>
            deps.apiClients.cbomManagement.retryCbomSyncSkip({ uuid: action.payload.uuid }).pipe(
                mergeMap((skip) =>
                    of(
                        slice.actions.retrySyncSkipSuccess({ skip }),
                        alertActions.success(`Retry requested: the next sync run tries ${skip.serialNumber} again.`),
                    ),
                ),
                catchError((err) => {
                    const error = extractError(err, 'Failed to request the retry');
                    return of(slice.actions.retrySyncSkipFailure({ error }), alertActions.error(error));
                }),
            ),
        ),
    );
};

const epics = [listSyncSkips, retrySyncSkip];

export default epics;
