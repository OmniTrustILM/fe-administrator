import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState, selectors } from './cbom';
import { LockWidgetNameEnum } from 'types/user-interface';

describe('cbom slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values and clears unknown keys', () => {
        const dirtyState = {
            ...initialState,
            cbomsData: { items: [{ uuid: '1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
            cbomDetail: { uuid: 'detail-1' },
            cbomVersions: [{ uuid: 'v1' }],
            searchableFields: [{ group: 'g', fields: [] }],
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingVersions: true,
            isFetchingSearchableFields: true,
            isUploading: true,
            isUploadSuccess: true,
            isDeleting: true,
            isBulkDeleting: true,
            isSyncing: true,
            syncSucceeded: true,
            tempOnlyKey: 'to-be-removed',
        } as any;

        const next = reducer(dirtyState, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempOnlyKey).toBeUndefined();
    });
    test('listCboms / success / failure update list flags and data', () => {
        let next = reducer(initialState, actions.listCboms({ filters: [], pageNumber: 1, itemsPerPage: 10 } as any));
        expect(next.cbomsData).toBeUndefined();
        expect(next.isFetchingList).toBe(true);

        const payload = { items: [{ uuid: 'cbom-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;
        next = reducer(next, actions.listCbomsSuccess({ data: payload }));
        expect(next.cbomsData).toEqual(payload);
        expect(next.isFetchingList).toBe(false);

        next = reducer({ ...next, isFetchingList: true }, actions.listCbomsFailure({ error: 'x' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('listCbomsSuccess stores payload as-is', () => {
        const state = {
            ...initialState,
            isFetchingList: true,
        } as any;

        const payload = {
            items: [{ uuid: 'cbom-1' }, { uuid: 'cbom-2' }],
            totalItems: 2,
            pageNumber: 1,
            itemsPerPage: 10,
            totalPages: 1,
        } as any;

        const next = reducer(state, actions.listCbomsSuccess({ data: payload }));

        expect(next.cbomsData).toEqual(payload);
        expect(next.isFetchingList).toBe(false);
    });

    test('getCbomDetail / success / failure and clearCbomDetail', () => {
        let next = reducer({ ...initialState, cbomDetail: { uuid: 'old' } as any }, actions.getCbomDetail({ uuid: 'u-1' }));
        expect(next.cbomDetail).toBeUndefined();
        expect(next.cbomDetailError).toBeUndefined();
        expect(next.cbomDetailErrorStatusCode).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        const detail = { uuid: 'u-1', version: 2 } as any;
        next = reducer(next, actions.getCbomDetailSuccess({ detail }));
        expect(next.cbomDetail).toEqual(detail);
        expect(next.cbomDetailError).toBeUndefined();
        expect(next.cbomDetailErrorStatusCode).toBeUndefined();
        expect(next.isFetchingDetail).toBe(false);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getCbomDetailFailure({ error: 'fail', statusCode: 404 }));
        expect(next.cbomDetailError).toBe('fail');
        expect(next.cbomDetailErrorStatusCode).toBe(404);
        expect(next.isFetchingDetail).toBe(false);

        next = reducer(next, actions.clearCbomDetail());
        expect(next.cbomDetail).toBeUndefined();
        expect(next.cbomDetailError).toBeUndefined();
        expect(next.cbomDetailErrorStatusCode).toBeUndefined();
    });

    test('listCbomVersions / success / failure updates versions and flags', () => {
        let next = reducer({ ...initialState, cbomVersions: [{ uuid: 'old' } as any] }, actions.listCbomVersions({ uuid: 'u-1' }));
        expect(next.cbomVersions).toEqual([]);
        expect(next.isFetchingVersions).toBe(true);

        const versions = [{ uuid: 'v-1' }, { uuid: 'v-2' }] as any[];
        next = reducer(next, actions.listCbomVersionsSuccess({ versions }));
        expect(next.cbomVersions).toEqual(versions);
        expect(next.isFetchingVersions).toBe(false);

        next = reducer({ ...next, isFetchingVersions: true }, actions.listCbomVersionsFailure({ error: 'err' }));
        expect(next.isFetchingVersions).toBe(false);
    });

    test('getSearchableFields / success / failure updates fields and flags', () => {
        let next = reducer({ ...initialState, searchableFields: [{ group: 'old', fields: [] }] as any }, actions.getSearchableFields());
        expect(next.searchableFields).toEqual([]);
        expect(next.isFetchingSearchableFields).toBe(true);

        const fields = [{ group: 'cbom', fields: [{ label: 'serialNumber', field: 'serialNumber' }] }] as any;
        next = reducer(next, actions.getSearchableFieldsSuccess({ fields }));
        expect(next.searchableFields).toEqual(fields);
        expect(next.isFetchingSearchableFields).toBe(false);

        next = reducer({ ...next, isFetchingSearchableFields: true }, actions.getSearchableFieldsFailure({ error: 'err' }));
        expect(next.isFetchingSearchableFields).toBe(false);
    });

    test('uploadCbom / success / failure updates flags and prepends to list when available', () => {
        let next = reducer(initialState, actions.uploadCbom({ content: { metadata: {} } } as any));
        expect(next.isUploading).toBe(true);
        expect(next.isUploadSuccess).toBe(false);

        next = reducer(next, actions.uploadCbomFailure({ error: 'upload failed' }));
        expect(next.isUploading).toBe(false);
        expect(next.isUploadSuccess).toBe(false);

        const withList = {
            ...initialState,
            isUploading: true,
            cbomsData: { items: [{ uuid: 'old-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
        } as any;
        const createdCbom = { uuid: 'new-1' } as any;
        next = reducer(withList, actions.uploadCbomSuccess({ cbom: createdCbom }));
        expect(next.isUploading).toBe(false);
        expect(next.isUploadSuccess).toBe(true);
        expect(next.cbomsData!.items[0]).toEqual(createdCbom);
        expect(next.cbomsData!.items[1]).toEqual({ uuid: 'old-1' });

        const withoutList = { ...initialState, isUploading: true };
        next = reducer(withoutList, actions.uploadCbomSuccess({ cbom: createdCbom }));
        expect(next.isUploading).toBe(false);
        expect(next.isUploadSuccess).toBe(true);
        expect(next.cbomsData).toBeUndefined();
    });

    test('deleteCbom / success / failure updates flags and list data', () => {
        const state = {
            ...initialState,
            cbomsData: { items: [{ uuid: 'cbom-1' }, { uuid: 'cbom-2' }], totalItems: 2, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
        } as any;

        let next = reducer(state, actions.deleteCbom({ uuid: 'cbom-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteCbomSuccess({ uuid: 'cbom-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.cbomsData!.items).toEqual([{ uuid: 'cbom-2' }]);
        expect(next.cbomsData!.totalItems).toBe(1);

        next = reducer({ ...next, isDeleting: true }, actions.deleteCbomFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('bulkDeleteCbom / success / failure updates flags without mutating list data', () => {
        const state = {
            ...initialState,
            cbomsData: {
                items: [{ uuid: 'cbom-1' }, { uuid: 'cbom-2' }, { uuid: 'cbom-3' }],
                totalItems: 3,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            },
        } as any;

        let next = reducer(state, actions.bulkDeleteCbom({ uuids: ['cbom-1', 'cbom-3'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteCbomSuccess({ uuids: ['cbom-1', 'cbom-3'] }));
        expect(next.isBulkDeleting).toBe(false);
        // Items are not spliced optimistically — the epic triggers a server re-fetch.
        expect(next.cbomsData!.items).toEqual([{ uuid: 'cbom-1' }, { uuid: 'cbom-2' }, { uuid: 'cbom-3' }]);
        expect(next.cbomsData!.totalItems).toBe(3);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteCbomFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('syncCboms / success / failure updates sync flag and syncSucceeded', () => {
        let next = reducer(initialState, actions.syncCboms());
        expect(next.isSyncing).toBe(true);
        expect(next.syncSucceeded).toBe(false);

        next = reducer(next, actions.syncCbomsSuccess());
        expect(next.isSyncing).toBe(false);
        expect(next.syncSucceeded).toBe(true);

        next = reducer({ ...next, isSyncing: true, syncSucceeded: true }, actions.syncCbomsFailure({ error: 'err' }));
        expect(next.isSyncing).toBe(false);
        expect(next.syncSucceeded).toBe(false);
    });
});

describe('cbom selectors', () => {
    test('selectCbomList falls back to empty array', () => {
        const state = { cbom: initialState } as any;
        expect(selectors.selectCbomList(state)).toEqual([]);
    });

    test('selectors return values from cbom state', () => {
        const cbomState = {
            ...initialState,
            cbomsData: { items: [{ uuid: '1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
            cbomDetail: { uuid: 'detail-1' },
            cbomDetailError: 'detail missing',
            cbomDetailErrorStatusCode: 404,
            cbomVersions: [{ uuid: 'v-1' }],
            searchableFields: [{ group: 'cbom', fields: [] }],
            isFetchingList: true,
            isFetchingDetail: false,
            isFetchingVersions: true,
            isFetchingSearchableFields: false,
            isUploading: true,
            isUploadSuccess: false,
            isDeleting: true,
            isBulkDeleting: false,
            isSyncing: true,
            syncSucceeded: true,
        } as any;
        const state = { cbom: cbomState, userInterface: { widgetLocks: [{ widgetName: LockWidgetNameEnum.CbomDetail }] } } as any;

        expect(selectors.selectCbomsData(state)).toEqual(cbomState.cbomsData);
        expect(selectors.selectCbomList(state)).toEqual(cbomState.cbomsData.items);
        expect(selectors.selectCbomDetail(state)).toEqual(cbomState.cbomDetail);
        expect(selectors.selectCbomDetailError(state)).toEqual(cbomState.cbomDetailError);
        expect(selectors.selectCbomDetailErrorStatusCode(state)).toEqual(cbomState.cbomDetailErrorStatusCode);
        expect(selectors.selectCbomVersions(state)).toEqual(cbomState.cbomVersions);
        expect(selectors.selectSearchableFields(state)).toEqual(cbomState.searchableFields);
        expect(selectors.selectIsFetchingList(state)).toBe(true);
        expect(selectors.selectIsFetchingDetail(state)).toBe(false);
        expect(selectors.selectIsFetchingVersions(state)).toBe(true);
        expect(selectors.selectIsFetchingSearchableFields(state)).toBe(false);
        expect(selectors.selectIsUploading(state)).toBe(true);
        expect(selectors.selectIsUploadSuccess(state)).toBe(false);
        expect(selectors.selectIsDeleting(state)).toBe(true);
        expect(selectors.selectIsBulkDeleting(state)).toBe(false);
        expect(selectors.selectIsSyncing(state)).toBe(true);
        expect(selectors.selectSyncSucceeded(state)).toBe(true);
    });
});
