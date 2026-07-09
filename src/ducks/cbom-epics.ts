import type { AppEpic } from 'ducks';
import { concat, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { alertsSlice } from './alert-slice';
import { actions as appRedirectActions } from './app-redirect';
import { EntityType } from './filters';
import { actions as pagingActions, selectors as pagingSelectors, entityListParams, listParamsAfterDelete } from './paging';
import { slice } from './cbom';
import {
    transformCbomDtoToModel,
    transformCbomDetailDtoToModel,
    transformPaginationResponseDtoToModel,
    transformSearchableFieldsDtoToModel,
    transformCbomUploadRequestModelToDto,
} from './transform/cbom';
import { actions as userInterfaceActions } from './user-interface';
import { LockWidgetNameEnum } from 'types/user-interface';

const DUPLICATE_CBOM_MESSAGE =
    'A CBOM with the same serial number and version already exists.\nPlease upload a new version or update the existing CBOM.';

const normalizeCbomUploadErrorMessage = (message: string): string => {
    if (/serial number and version already exists|already exists/gi.test(message)) {
        return DUPLICATE_CBOM_MESSAGE;
    }

    return message
        .replaceAll(/\balready exists(?:\s+already exists)+\b/gi, 'already exists')
        .replaceAll(/\s{2,}/g, ' ')
        .trim();
};

const listCboms: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listCboms.match),
        switchMap((action) =>
            concat(
                of(pagingActions.list(EntityType.CBOM)),
                deps.apiClients.cbomManagement.listCboms({ searchRequestDto: action.payload }).pipe(
                    mergeMap((response) => {
                        const transformedResponse = transformPaginationResponseDtoToModel(response);
                        const totalItems = transformedResponse.totalItems ?? transformedResponse.items?.length ?? 0;

                        return of(
                            slice.actions.listCbomsSuccess({
                                data: transformedResponse,
                            }),
                            pagingActions.listSuccess({
                                entity: EntityType.CBOM,
                                totalItems,
                            }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCboms),
                        );
                    }),
                    catchError((err) =>
                        of(
                            slice.actions.listCbomsFailure({ error: extractError(err, 'Failed to fetch CBOMs') }),
                            pagingActions.listFailure(EntityType.CBOM),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfCboms),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const getCbomDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getCbomDetail.match),
        switchMap((action) =>
            deps.apiClients.cbomManagement.getCbomDetail({ uuid: action.payload.uuid }).pipe(
                mergeMap((detail) =>
                    of(
                        slice.actions.getCbomDetailSuccess({
                            detail: transformCbomDetailDtoToModel(detail),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CbomDetail),
                    ),
                ),
                catchError((err) =>
                    (() => {
                        const statusCode = typeof err?.status === 'number' ? err.status : undefined;
                        const payload =
                            typeof statusCode === 'number'
                                ? { error: extractError(err, 'Failed to fetch CBOM detail'), statusCode }
                                : { error: extractError(err, 'Failed to fetch CBOM detail') };

                        return of(
                            slice.actions.getCbomDetailFailure(payload),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CbomDetail),
                        );
                    })(),
                ),
            ),
        ),
    );
};

const listCbomVersions: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listCbomVersions.match),
        switchMap((action) =>
            deps.apiClients.cbomManagement.listCbomVersions({ uuid: action.payload.uuid }).pipe(
                mergeMap((versions) =>
                    of(
                        slice.actions.listCbomVersionsSuccess({
                            versions: versions.map(transformCbomDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CbomVersions),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listCbomVersionsFailure({ error: extractError(err, 'Failed to fetch CBOM versions') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CbomVersions),
                    ),
                ),
            ),
        ),
    );
};

const getSearchableFields: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getSearchableFields.match),
        switchMap(() =>
            deps.apiClients.cbomManagement.getCbomSearchableFields().pipe(
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

const uploadCbom: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.uploadCbom.match),
        switchMap((action) =>
            deps.apiClients.cbomManagement.uploadCbom({ cbomUploadRequestDto: transformCbomUploadRequestModelToDto(action.payload) }).pipe(
                mergeMap((cbom) =>
                    of(
                        slice.actions.uploadCbomSuccess({
                            cbom: transformCbomDtoToModel(cbom),
                        }),
                        alertsSlice.actions.success('CBOM uploaded successfully.'),
                    ),
                ),
                catchError((err) =>
                    (() => {
                        const errorMessage = normalizeCbomUploadErrorMessage(extractError(err, 'Failed to upload CBOM'));
                        return of(slice.actions.uploadCbomFailure({ error: errorMessage }), alertsSlice.actions.error(errorMessage));
                    })(),
                ),
            ),
        ),
    );
};

const deleteCbom: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteCbom.match),
        switchMap((action) =>
            deps.apiClients.cbomManagement.deleteCbom({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteCbomSuccess({ uuid: action.payload.uuid }),
                        alertsSlice.actions.success('CBOM successfully deleted.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteCbomFailure({ error: extractError(err, 'Failed to delete CBOM') }),
                        alertsSlice.actions.error(extractError(err, 'Failed to delete CBOM')),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteCbom: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteCbom.match),
        switchMap((action) => {
            // Snapshot paging *before* the delete resolves — PagedList fires an immediate
            // pre-commit re-fetch on delete whose listSuccess can overwrite totalItems.
            const paramsBeforeDelete = entityListParams(EntityType.CBOM, state.value);
            const totalBeforeDelete = pagingSelectors.totalItems(EntityType.CBOM)(state.value);

            return deps.apiClients.cbomManagement.bulkDeleteCbom({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() => {
                    const listParams = listParamsAfterDelete(paramsBeforeDelete, totalBeforeDelete, action.payload.uuids.length);

                    return of(
                        slice.actions.bulkDeleteCbomSuccess({ uuids: action.payload.uuids }),
                        alertsSlice.actions.success('Selected CBOMs successfully deleted.'),
                        // Only re-align the paging slice when the deletion emptied the current page
                        // and we had to step back; otherwise the re-fetch below is enough.
                        ...(listParams.pageNumber !== paramsBeforeDelete.pageNumber
                            ? [
                                  pagingActions.setPagination({
                                      entity: EntityType.CBOM,
                                      pageNumber: listParams.pageNumber,
                                      pageSize: listParams.itemsPerPage,
                                  }),
                              ]
                            : []),
                        slice.actions.listCboms(listParams),
                    );
                }),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteCbomFailure({ error: extractError(err, 'Failed to bulk delete CBOMs') }),
                        alertsSlice.actions.error(extractError(err, 'Failed to bulk delete CBOMs')),
                    ),
                ),
            );
        }),
    );
};

const syncCboms: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.syncCboms.match),
        switchMap(() =>
            deps.apiClients.cbomManagement.sync().pipe(
                mergeMap(() => of(slice.actions.syncCbomsSuccess(), alertsSlice.actions.success('CBOMs successfully synchronized.'))),
                catchError((err) =>
                    of(
                        slice.actions.syncCbomsFailure({ error: extractError(err, 'Failed to sync CBOMs') }),
                        alertsSlice.actions.error(extractError(err, 'Failed to sync CBOMs')),
                    ),
                ),
            ),
        ),
    );
};

export default [listCboms, getCbomDetail, listCbomVersions, getSearchableFields, uploadCbom, deleteCbom, bulkDeleteCbom, syncCboms];
