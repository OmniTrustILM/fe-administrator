import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { alertsSlice } from './alert-slice';
import { actions as appRedirectActions } from './app-redirect';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
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
                        const deletedSigningRecordUuids: string[] = (state as any)?.value?.signingRecords?.deletedSigningRecordUuids ?? [];
                        const deletedSigningRecordUuidsSet = new Set(deletedSigningRecordUuids);
                        const originalItems = transformedResponse.items ?? [];
                        const filteredItems =
                            deletedSigningRecordUuidsSet.size === 0
                                ? originalItems
                                : originalItems.filter((item) => !deletedSigningRecordUuidsSet.has(item.uuid));
                        const removedItemsCount = originalItems.length - filteredItems.length;
                        const baseTotalItems = transformedResponse.totalItems ?? originalItems.length;
                        const adjustedTotalItems = Math.max(0, baseTotalItems - removedItemsCount);
                        const adjustedResponse = {
                            ...transformedResponse,
                            items: filteredItems,
                            totalItems: adjustedTotalItems,
                        };

                        return of(
                            slice.actions.listSigningRecordsSuccess({
                                data: adjustedResponse,
                            }),
                            pagingActions.listSuccess({
                                entity: EntityType.SIGNING_RECORD,
                                totalItems: adjustedTotalItems,
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
        switchMap((action) =>
            deps.apiClients.signingRecords.bulkDeleteSigningRecords({ requestBody: action.payload.uuids }).pipe(
                mergeMap((errors) => {
                    const successAction = slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: action.payload.uuids, errors });
                    return errors.length === 0
                        ? of(successAction, alertsSlice.actions.success('Selected Signing Records successfully deleted.'))
                        : of(successAction);
                }),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteSigningRecordsFailure({
                            error: extractError(err, 'Failed to bulk delete Signing Records'),
                        }),
                        alertsSlice.actions.error(extractError(err, 'Failed to bulk delete Signing Records')),
                    ),
                ),
            ),
        ),
    );
};

export default [listSigningRecords, getSigningRecord, getSearchableFields, deleteSigningRecord, bulkDeleteSigningRecords];
