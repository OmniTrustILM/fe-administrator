import { describe, expect, test } from 'vitest';
import reducer, { actions, initialState } from './signing-records';

describe('signingRecords slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values and clears unknown keys', () => {
        const dirtyState = {
            ...initialState,
            signingRecordsData: { items: [{ uuid: '1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 },
            signingRecordDetail: { uuid: 'detail-1' },
            searchableFields: [{ group: 'g', fields: [] }],
            deletedSigningRecordUuids: ['x'],
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingSearchableFields: true,
            isDeleting: true,
            isBulkDeleting: true,
            tempOnlyKey: 'to-be-removed',
        } as any;

        const next = reducer(dirtyState, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempOnlyKey).toBeUndefined();
    });

    test('listSigningRecords / success / failure update list flags and data', () => {
        let next = reducer(initialState, actions.listSigningRecords({ filters: [], pageNumber: 1, itemsPerPage: 10 } as any));
        expect(next.signingRecordsData).toBeUndefined();
        expect(next.isFetchingList).toBe(true);

        const payload = { items: [{ uuid: 'rec-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;
        next = reducer(next, actions.listSigningRecordsSuccess({ data: payload }));
        expect(next.signingRecordsData).toEqual(payload);
        expect(next.isFetchingList).toBe(false);

        next = reducer({ ...next, isFetchingList: true }, actions.listSigningRecordsFailure({ error: 'x' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getSigningRecord / success / failure and clearSigningRecordDetail', () => {
        let next = reducer(initialState, actions.getSigningRecord({ uuid: 'rec-1' }));
        expect(next.signingRecordDetail).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        const detail = { uuid: 'rec-1', name: 'doc' } as any;
        next = reducer(next, actions.getSigningRecordSuccess({ detail }));
        expect(next.signingRecordDetail).toEqual(detail);
        expect(next.isFetchingDetail).toBe(false);

        next = reducer(next, actions.getSigningRecordFailure({ error: 'boom', statusCode: 404 }));
        expect(next.signingRecordDetailError).toBe('boom');
        expect(next.signingRecordDetailErrorStatusCode).toBe(404);
        expect(next.isFetchingDetail).toBe(false);

        next = reducer({ ...next, signingRecordDetail: detail }, actions.clearSigningRecordDetail());
        expect(next.signingRecordDetail).toBeUndefined();
        expect(next.signingRecordDetailError).toBeUndefined();
        expect(next.signingRecordDetailErrorStatusCode).toBeUndefined();
    });

    test('getSearchableFields / success / failure', () => {
        let next = reducer({ ...initialState, searchableFields: [{ group: 'old' }] as any }, actions.getSearchableFields());
        expect(next.searchableFields).toEqual([]);
        expect(next.isFetchingSearchableFields).toBe(true);

        const fields = [{ group: 'g', fields: [] }] as any;
        next = reducer(next, actions.getSearchableFieldsSuccess({ fields }));
        expect(next.searchableFields).toEqual(fields);
        expect(next.isFetchingSearchableFields).toBe(false);

        next = reducer({ ...next, isFetchingSearchableFields: true }, actions.getSearchableFieldsFailure({ error: 'x' }));
        expect(next.isFetchingSearchableFields).toBe(false);
    });

    test('deleteSigningRecord success removes the item and decrements totalItems', () => {
        const state = {
            ...initialState,
            signingRecordsData: {
                items: [{ uuid: 'rec-1' }, { uuid: 'rec-2' }],
                totalItems: 2,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            },
            isDeleting: true,
        } as any;

        const next = reducer(state, actions.deleteSigningRecordSuccess({ uuid: 'rec-1' }));

        expect(next.isDeleting).toBe(false);
        expect(next.deletedSigningRecordUuids).toContain('rec-1');
        expect(next.signingRecordsData?.items).toEqual([{ uuid: 'rec-2' }]);
        expect(next.signingRecordsData?.totalItems).toBe(1);
    });

    test('bulkDeleteSigningRecords success (no errors) leaves items and deleted-uuid tracking untouched', () => {
        const state = {
            ...initialState,
            signingRecordsData: {
                items: [{ uuid: 'rec-1' }, { uuid: 'rec-2' }, { uuid: 'rec-3' }],
                totalItems: 3,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            },
            isBulkDeleting: true,
        } as any;

        const next = reducer(state, actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-3'], errors: [] }));

        expect(next.isBulkDeleting).toBe(false);
        // Bulk delete no longer touches the list or the deleted-uuid signal — the epic re-fetches
        // from the server (deletedSigningRecordUuids is only used by the detail page's single delete).
        expect(next.deletedSigningRecordUuids).toEqual([]);
        expect(next.signingRecordsData?.items).toEqual([{ uuid: 'rec-1' }, { uuid: 'rec-2' }, { uuid: 'rec-3' }]);
        expect(next.signingRecordsData?.totalItems).toBe(3);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('bulkDeleteSigningRecords success with errors stores messages and keeps items', () => {
        const state = {
            ...initialState,
            signingRecordsData: {
                items: [{ uuid: 'rec-1' }, { uuid: 'rec-2' }],
                totalItems: 2,
                pageNumber: 1,
                itemsPerPage: 10,
                totalPages: 1,
            },
            isBulkDeleting: true,
        } as any;

        const errors = [{ uuid: 'rec-1', name: 'rec-1', message: 'In use' }] as any;
        const next = reducer(state, actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors }));

        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.deletedSigningRecordUuids).toEqual([]);
        expect(next.signingRecordsData?.items).toEqual([{ uuid: 'rec-1' }, { uuid: 'rec-2' }]);
        expect(next.signingRecordsData?.totalItems).toBe(2);
    });

    test('clearDeleteErrorMessages resets bulk delete error messages', () => {
        const state = { ...initialState, bulkDeleteErrorMessages: [{ uuid: 'x', name: 'x', message: 'm' }] } as any;
        const next = reducer(state, actions.clearDeleteErrorMessages());
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });
});
