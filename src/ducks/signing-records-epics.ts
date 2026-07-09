import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { alertsSlice } from './alert-slice';
import { actions as appRedirectActions } from './app-redirect';
import { EntityType } from './filters';
import { actions as pagingActions, selectors as pagingSelectors, entityListParams, listParamsAfterDelete } from './paging';
import { slice } from './signing-records';
import {
    transformPaginationResponseDtoToModel,
    transformSearchableFieldsDtoToModel,
    transformSigningRecordDtoToModel,
} from './transform/signing-records';
import { actions as userInterfaceActions } from './user-interface';
import { LockWidgetNameEnum } from 'types/user-interface';

const listSigningRecords: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listSigningRecords.match),
        switchMap((action) =>
            concat(
                of(pagingActions.list(EntityType.SIGNING_RECORD)),
                deps.apiClients.signingRecords.listSigningRecords({ searchRequestDto: action.payload }).pipe(
                    mergeMap((response) => {
                        const transformedResponse = transformPaginationResponseDtoToModel(response);
                        const totalItems = transformedResponse.totalItems ?? transformedResponse.items?.length ?? 0;

                        return of(
                            slice.actions.listSigningRecordsSuccess({
                                data: transformedResponse,
                            }),
                            pagingActions.listSuccess({
                                entity: EntityType.SIGNING_RECORD,
                                totalItems,
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSigningRecords),
                        );
                    }),
                    catchError((err) =>
                        of(
                            slice.actions.listSigningRecordsFailure({ error: extractError(err, 'Failed to fetch Signing Records') }),
                            pagingActions.listFailure(EntityType.SIGNING_RECORD),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfSigningRecords),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const getSigningRecord: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getSigningRecord.match),
        switchMap((action) =>
            deps.apiClients.signingRecords.getSigningRecord({ uuid: action.payload.uuid }).pipe(
                mergeMap((detail) =>
                    of(
                        slice.actions.getSigningRecordSuccess({
                            detail: transformSigningRecordDtoToModel(detail),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SigningRecordDetail),
                    ),
                ),
                catchError((err) =>
                    (() => {
                        const statusCode = typeof err?.status === 'number' ? err.status : undefined;
                        const payload =
                            typeof statusCode === 'number'
                                ? { error: extractError(err, 'Failed to fetch Signing Record detail'), statusCode }
                                : { error: extractError(err, 'Failed to fetch Signing Record detail') };

                        return of(
                            slice.actions.getSigningRecordFailure(payload),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.SigningRecordDetail),
                        );
                    })(),
                ),
            ),
        ),
    );
};

const getSearchableFields: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getSearchableFields.match),
        switchMap(() =>
            deps.apiClients.signingRecords.listSigningRecordSearchableFields().pipe(
                map((fields) =>
                    slice.actions.getSearchableFieldsSuccess({
                        fields: transformSearchableFieldsDtoToModel(fields),
                    }),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getSearchableFieldsFailure({ error: extractError(err, 'Failed to fetch searchable fields') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to fetch searchable fields' }),
                    ),
                ),
            ),
        ),
    );
};

const deleteSigningRecord: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteSigningRecord.match),
        switchMap((action) =>
            deps.apiClients.signingRecords.deleteSigningRecord({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteSigningRecordSuccess({ uuid: action.payload.uuid }),
                        alertsSlice.actions.success('Signing Record successfully deleted.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteSigningRecordFailure({ error: extractError(err, 'Failed to delete Signing Record') }),
                        alertsSlice.actions.error(extractError(err, 'Failed to delete Signing Record')),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteSigningRecords: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteSigningRecords.match),
        switchMap((action) => {
            // Snapshot paging *before* the delete resolves — PagedList fires an immediate
            // pre-commit re-fetch on delete whose listSuccess can overwrite totalItems.
            const paramsBeforeDelete = entityListParams(EntityType.SIGNING_RECORD, state.value);
            const totalBeforeDelete = pagingSelectors.totalItems(EntityType.SIGNING_RECORD)(state.value);

            return deps.apiClients.signingRecords.bulkDeleteSigningRecords({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const successAction = slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: action.payload.uuids, errors });
                    // Per-item failures are reported in `errors`; the rest were deleted server-side.
                    const deletedCount = action.payload.uuids.length - errors.length;
                    if (deletedCount === 0) {
                        return of(successAction);
                    }

                    const listParams = listParamsAfterDelete(paramsBeforeDelete, totalBeforeDelete, deletedCount);

                    return of(
                        successAction,
                        // Success alert only when every selected record was deleted; partial
                        // failures surface through bulkDeleteErrorMessages instead.
                        ...(errors.length === 0 ? [alertsSlice.actions.success('Selected Signing Records successfully deleted.')] : []),
                        // Only re-align the paging slice when the deletion emptied the current page
                        // and we had to step back; otherwise the re-fetch below is enough.
                        ...(listParams.pageNumber !== paramsBeforeDelete.pageNumber
                            ? [
                                  pagingActions.setPagination({
                                      entity: EntityType.SIGNING_RECORD,
                                      pageNumber: listParams.pageNumber,
                                      pageSize: listParams.itemsPerPage,
                                  }),
                              ]
                            : []),
                        slice.actions.listSigningRecords(listParams),
                    );
                }),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteSigningRecordsFailure({
                            error: extractError(err, 'Failed to bulk delete Signing Records'),
                        }),
                        alertsSlice.actions.error(extractError(err, 'Failed to bulk delete Signing Records')),
                    ),
                ),
            );
        }),
    );
};

export default [listSigningRecords, getSigningRecord, getSearchableFields, deleteSigningRecord, bulkDeleteSigningRecords];
