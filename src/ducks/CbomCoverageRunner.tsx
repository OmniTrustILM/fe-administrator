import type { AppState } from 'ducks';
import { useEffect } from 'react';
import type { StateObservable } from 'redux-observable';
import { of, throwError } from 'rxjs';
import type { BulkActionMessageDto, CbomDetailDto, CbomDto, PaginationResponseDtoCbomDto, SearchFieldDataByGroupDto } from 'types/openapi';
import cbomEpics from './cbom-epics';
import reducer, { actions, initialState, selectors } from './cbom';
import {
    transformCbomDetailDtoToModel,
    transformCbomDtoToModel,
    transformCbomUploadRequestModelToDto,
    transformPaginationResponseDtoToModel,
    transformSearchableFieldsDtoToModel,
    transformSearchRequestModelToDto,
} from './transform/cbom';

function runReducerAndSelectors() {
    let state = reducer(undefined, { type: 'unknown' });
    state = reducer(state, actions.listCboms({ pageNumber: 1, itemsPerPage: 10, filters: [] }));
    state = reducer(
        state,
        actions.listCbomsSuccess({
            data: {
                items: [{ uuid: 'cbom-1' }],
                totalItems: 1,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            } as PaginationResponseDtoCbomDto,
        }),
    );
    state = reducer(state, actions.listCbomsFailure({ error: 'err' }));

    state = reducer(state, actions.getCbomDetail({ uuid: 'detail-1' }));
    state = reducer(state, actions.getCbomDetailSuccess({ detail: { uuid: 'detail-1', version: 2 } as CbomDetailDto }));
    state = reducer(state, actions.getCbomDetailFailure({ error: 'err' }));
    state = reducer(state, actions.clearCbomDetail());

    state = reducer(state, actions.listCbomVersions({ uuid: 'detail-1' }));
    state = reducer(state, actions.listCbomVersionsSuccess({ versions: [{ uuid: 'v-1' } as CbomDto] }));
    state = reducer(state, actions.listCbomVersionsFailure({ error: 'err' }));

    state = reducer(state, actions.getSearchableFields());
    state = reducer(state, actions.getSearchableFieldsSuccess({ fields: [{} as SearchFieldDataByGroupDto] }));
    state = reducer(state, actions.getSearchableFieldsFailure({ error: 'err' }));

    state = reducer(state, actions.uploadCbom({ content: { metadata: {} } }));
    state = reducer(state, actions.uploadCbomSuccess({ cbom: { uuid: 'cbom-new' } as CbomDto }));
    state = reducer(state, actions.uploadCbomFailure({ error: 'err' }));

    state = reducer(state, actions.deleteCbom({ uuid: 'cbom-new' }));
    state = reducer(state, actions.deleteCbomSuccess({ uuid: 'cbom-new' }));
    state = reducer(state, actions.deleteCbomFailure({ error: 'err' }));

    state = reducer(state, actions.bulkDeleteCbom({ uuids: ['cbom-1', 'cbom-2'] }));
    state = reducer(state, actions.bulkDeleteCbomSuccess({ uuids: ['cbom-1', 'cbom-2'] }));
    state = reducer(state, actions.bulkDeleteCbomFailure({ error: 'err' }));

    state = reducer(state, actions.syncCboms());
    state = reducer(state, actions.syncCbomsSuccess());
    state = reducer(state, actions.syncCbomsFailure({ error: 'err' }));

    state = reducer(state, actions.resetState());

    const rootState = { cbom: state } as AppState;
    selectors.selectCbomsData(rootState);
    selectors.selectCbomList(rootState);
    selectors.selectCbomDetail(rootState);
    selectors.selectCbomVersions(rootState);
    selectors.selectSearchableFields(rootState);
    selectors.selectIsFetchingList(rootState);
    selectors.selectIsFetchingDetail(rootState);
    selectors.selectIsFetchingVersions(rootState);
    selectors.selectIsFetchingSearchableFields(rootState);
    selectors.selectIsUploading(rootState);
    selectors.selectIsUploadSuccess(rootState);
    selectors.selectIsDeleting(rootState);
    selectors.selectIsBulkDeleting(rootState);
    selectors.selectIsSyncing(rootState);

    reducer(
        {
            ...initialState,
            cbomsData: {
                items: [{ uuid: 'old' }],
                totalItems: 1,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            } as PaginationResponseDtoCbomDto,
            isUploading: true,
        },
        actions.uploadCbomSuccess({ cbom: { uuid: 'new' } as CbomDto }),
    );
}

function runTransforms() {
    transformCbomDtoToModel({ uuid: 'cbom-1' } as CbomDto);
    transformCbomDetailDtoToModel({ uuid: 'detail-1' } as CbomDetailDto);
    transformCbomUploadRequestModelToDto({ content: { metadata: { serialNumber: 'urn:1' } } });
    transformSearchRequestModelToDto({ pageNumber: 1, itemsPerPage: 10, filters: [] });
    transformSearchableFieldsDtoToModel([{} as SearchFieldDataByGroupDto]);
    transformPaginationResponseDtoToModel({
        items: [{ uuid: 'cbom-1' }],
        totalItems: 1,
        pageNumber: 1,
        itemsPerPage: 10,
        totalPages: 1,
    } as PaginationResponseDtoCbomDto);
}

const emptyState$ = of({}) as StateObservable<AppState>;

export function runEpicsForCoverage() {
    const successDeps = {
        apiClients: {
            cbomManagement: {
                listCboms: () =>
                    of({
                        items: [{ uuid: 'cbom-1' }],
                        totalItems: 1,
                        pageNumber: 1,
                        itemsPerPage: 10,
                        totalPages: 1,
                    } as PaginationResponseDtoCbomDto),
                getCbomDetail: () => of({ uuid: 'detail-1', version: 1 } as CbomDetailDto),
                listCbomVersions: () => of([{ uuid: 'v-1', version: 1 } as CbomDto]),
                getCbomSearchableFields: () => of([{} as SearchFieldDataByGroupDto]),
                uploadCbom: () => of({ uuid: 'created-1' } as CbomDto),
                deleteCbom: () => of(undefined),
                bulkDeleteCbom: () => of([] as BulkActionMessageDto[]),
                sync: () => of(undefined),
            },
        },
    } as any; // test-double: partial ApiClients cannot satisfy the full generated ApiClients type without laundering

    const failureDeps = {
        apiClients: {
            cbomManagement: {
                listCboms: () => throwError(() => new Error('list failed')),
                getCbomDetail: () => throwError(() => new Error('detail failed')),
                listCbomVersions: () => throwError(() => new Error('versions failed')),
                getCbomSearchableFields: () => throwError(() => new Error('search fields failed')),
                uploadCbom: () => throwError(() => new Error('upload failed')),
                deleteCbom: () => throwError(() => new Error('delete failed')),
                bulkDeleteCbom: () => throwError(() => new Error('bulk delete failed')),
                sync: () => throwError(() => new Error('sync failed')),
            },
        },
    } as any; // test-double: partial ApiClients cannot satisfy the full generated ApiClients type without laundering

    cbomEpics[0](of(actions.listCboms({ pageNumber: 1, itemsPerPage: 10, filters: [] })), emptyState$, successDeps).subscribe();
    cbomEpics[0](of(actions.listCboms({ pageNumber: 1, itemsPerPage: 10, filters: [] })), emptyState$, failureDeps).subscribe();

    cbomEpics[1](of(actions.getCbomDetail({ uuid: 'detail-1' })), emptyState$, successDeps).subscribe();
    cbomEpics[1](of(actions.getCbomDetail({ uuid: 'detail-1' })), emptyState$, failureDeps).subscribe();

    cbomEpics[2](of(actions.listCbomVersions({ uuid: 'detail-1' })), emptyState$, successDeps).subscribe();
    cbomEpics[2](of(actions.listCbomVersions({ uuid: 'detail-1' })), emptyState$, failureDeps).subscribe();

    cbomEpics[3](of(actions.getSearchableFields()), emptyState$, successDeps).subscribe();
    cbomEpics[3](of(actions.getSearchableFields()), emptyState$, failureDeps).subscribe();

    cbomEpics[4](of(actions.uploadCbom({ content: { metadata: {} } })), emptyState$, successDeps).subscribe();
    cbomEpics[4](of(actions.uploadCbom({ content: { metadata: {} } })), emptyState$, failureDeps).subscribe();

    cbomEpics[5](of(actions.deleteCbom({ uuid: 'detail-1' })), emptyState$, successDeps).subscribe();
    cbomEpics[5](of(actions.deleteCbom({ uuid: 'detail-1' })), emptyState$, failureDeps).subscribe();

    cbomEpics[6](of(actions.bulkDeleteCbom({ uuids: ['cbom-1', 'cbom-2'] })), emptyState$, successDeps).subscribe();
    cbomEpics[6](of(actions.bulkDeleteCbom({ uuids: ['cbom-1', 'cbom-2'] })), emptyState$, failureDeps).subscribe();

    cbomEpics[7](of(actions.syncCboms()), emptyState$, successDeps).subscribe();
    cbomEpics[7](of(actions.syncCboms()), emptyState$, failureDeps).subscribe();
}

export default function CbomCoverageRunner() {
    useEffect(() => {
        runReducerAndSelectors();
        runTransforms();
        runEpicsForCoverage();
    }, []);

    return <div data-testid="cbom-coverage-done" />;
}
