import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import signingRecordsEpics from './signing-records-epics';
import { slice } from './signing-records';
import { alertsSlice } from './alert-slice';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';
import { LockWidgetNameEnum } from 'types/user-interface';

type EpicDeps = {
    apiClients: {
        signingRecords: {
            listSigningRecords: (args: any) => any;
            getSigningRecord: (args: any) => any;
            listSigningRecordSearchableFields: () => any;
            deleteSigningRecord: (args: any) => any;
            bulkDeleteSigningRecords: (args: any) => any;
        };
    };
};

function createDeps(overrides: Partial<EpicDeps['apiClients']['signingRecords']> = {}): EpicDeps {
    return {
        apiClients: {
            signingRecords: {
                listSigningRecords: () => of({ items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 10, totalPages: 0 }),
                getSigningRecord: () => of({ uuid: 'detail-default' }),
                listSigningRecordSearchableFields: () => of([]),
                deleteSigningRecord: () => of(undefined),
                bulkDeleteSigningRecords: () => of([]),
                ...overrides,
            },
        },
    };
}

const [listSigningRecords, getSigningRecord, getSearchableFields, deleteSigningRecord, bulkDeleteSigningRecords] = signingRecordsEpics;

describe('signingRecords epics', () => {
    test('listSigningRecords success emits paging and success actions', async () => {
        const searchRequest = { pageNumber: 1, itemsPerPage: 10, filters: [] } as any;
        const response = { items: [{ uuid: 'rec-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;

        const deps = createDeps({
            listSigningRecords: ({ searchRequestDto }) => {
                expect(searchRequestDto).toEqual(searchRequest);
                return of(response);
            },
        });

        const output$ = (listSigningRecords as any)(of(slice.actions.listSigningRecords(searchRequest)), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted).toEqual([
            pagingActions.list(EntityType.SIGNING_RECORD),
            slice.actions.listSigningRecordsSuccess({ data: response }),
            pagingActions.listSuccess({ entity: EntityType.SIGNING_RECORD, totalItems: 1 }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSigningRecords),
        ]);
    });

    test('listSigningRecords failure emits paging and failure actions', async () => {
        const deps = createDeps({
            listSigningRecords: () => throwError(() => new Error('list failed')),
        });

        const output$ = (listSigningRecords as any)(
            of(slice.actions.listSigningRecords({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any)),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[0]).toEqual(pagingActions.list(EntityType.SIGNING_RECORD));
        expect(emitted[1]).toEqual(slice.actions.listSigningRecordsFailure({ error: 'Failed to fetch Signing Records. list failed' }));
        expect(emitted[2]).toEqual(pagingActions.listFailure(EntityType.SIGNING_RECORD));
        expect(emitted[3].type).toBe(userInterfaceActions.insertWidgetLock.type);
        expect(emitted[3].payload.widgetName).toBe(LockWidgetNameEnum.ListOfSigningRecords);
    });

    test('listSigningRecords success passes the server response through without local filtering', async () => {
        const response = {
            items: [{ uuid: 'rec-deleted' }, { uuid: 'rec-1' }, { uuid: 'rec-2' }],
            totalItems: 3,
            pageNumber: 1,
            itemsPerPage: 10,
            totalPages: 1,
        } as any;

        const deps = createDeps({ listSigningRecords: () => of(response) });
        // Even if the store still carries locally-deleted uuids, the list must reflect server state:
        // the server is the source of truth now that bulk delete re-fetches after completing.
        const state$ = { value: { signingRecords: { deletedSigningRecordUuids: ['rec-deleted'] } } } as any;

        const output$ = (listSigningRecords as any)(
            of(slice.actions.listSigningRecords({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any)),
            state$,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[1]).toEqual(slice.actions.listSigningRecordsSuccess({ data: response }));
        expect(emitted[2]).toEqual(pagingActions.listSuccess({ entity: EntityType.SIGNING_RECORD, totalItems: 3 }));
    });

    test('getSigningRecord success emits success and removeWidgetLock', async () => {
        const uuid = 'rec-detail-1';
        const detail = { uuid, name: 'doc' } as any;

        const deps = createDeps({
            getSigningRecord: ({ uuid: value }) => {
                expect(value).toBe(uuid);
                return of(detail);
            },
        });

        const output$ = (getSigningRecord as any)(of(slice.actions.getSigningRecord({ uuid })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.getSigningRecordSuccess({ detail }));
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SigningRecordDetail));
    });

    test('getSigningRecord failure emits failure with status code and widget lock', async () => {
        const deps = createDeps({
            getSigningRecord: () => throwError(() => ({ status: 404, message: 'nope' })),
        });

        const output$ = (getSigningRecord as any)(of(slice.actions.getSigningRecord({ uuid: 'missing' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0].type).toBe(slice.actions.getSigningRecordFailure.type);
        expect(emitted[0].payload.statusCode).toBe(404);
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('getSearchableFields success emits success action', async () => {
        const fields = [{ group: 'g', fields: [] }] as any;
        const deps = createDeps({ listSigningRecordSearchableFields: () => of(fields) });

        const output$ = (getSearchableFields as any)(of(slice.actions.getSearchableFields()), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted[0]).toEqual(slice.actions.getSearchableFieldsSuccess({ fields }));
    });

    test('deleteSigningRecord success emits success and alert', async () => {
        const deps = createDeps({ deleteSigningRecord: () => of(undefined) });

        const output$ = (deleteSigningRecord as any)(of(slice.actions.deleteSigningRecord({ uuid: 'rec-1' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.deleteSigningRecordSuccess({ uuid: 'rec-1' }));
        expect(emitted[1].type).toBe(alertsSlice.actions.success.type);
    });

    test('bulkDeleteSigningRecords success (no errors, page unchanged) emits success, alert and a re-fetch without setPagination', async () => {
        const deps = createDeps({
            bulkDeleteSigningRecords: ({ requestBody }) => {
                expect(requestBody).toEqual(['rec-1', 'rec-2']);
                return of([]);
            },
        });

        // On page 1 with 5 items, deleting 2 still leaves page 1 populated, so the page does not
        // shift and no setPagination is dispatched — only the re-fetch of the current page.
        const state$ = {
            value: {
                pagings: {
                    pagings: [
                        {
                            entity: EntityType.SIGNING_RECORD,
                            paging: { pageNumber: 1, pageSize: 10, totalItems: 5, checkedRows: [], isFetchingList: false },
                        },
                    ],
                },
                filters: {
                    filters: [{ entity: EntityType.SIGNING_RECORD, filter: { currentFilters: [] } }],
                },
            },
        } as any;

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['rec-1', 'rec-2'] })),
            state$,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(3), toArray()));

        expect(emitted[0]).toEqual(slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors: [] }));
        expect(emitted[1].type).toBe(alertsSlice.actions.success.type);
        expect(emitted[2]).toEqual(slice.actions.listSigningRecords({ pageNumber: 1, itemsPerPage: 10, filters: [] }));
        expect(emitted.some((a: any) => a.type === pagingActions.setPagination.type)).toBe(false);
    });

    test('bulkDeleteSigningRecords success steps back to last valid page when current page becomes empty', async () => {
        const deps = createDeps({ bulkDeleteSigningRecords: () => of([]) });

        // 10 items total, pageSize 5, user on page 2 (items 6–10).
        // Deleting 5 items leaves 5 total → only page 1 exists.
        // safePage = min(2, ceil(5/5)=1) = 1
        const state$ = {
            value: {
                pagings: {
                    pagings: [
                        {
                            entity: EntityType.SIGNING_RECORD,
                            paging: { pageNumber: 2, pageSize: 5, totalItems: 10, checkedRows: [], isFetchingList: false },
                        },
                    ],
                },
                filters: {
                    filters: [{ entity: EntityType.SIGNING_RECORD, filter: { currentFilters: [] } }],
                },
            },
        } as any;

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['r1', 'r2', 'r3', 'r4', 'r5'] })),
            state$,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[2]).toEqual(pagingActions.setPagination({ entity: EntityType.SIGNING_RECORD, pageNumber: 1, pageSize: 5 }));
        expect(emitted[3]).toEqual(slice.actions.listSigningRecords({ pageNumber: 1, itemsPerPage: 5, filters: [] }));
    });

    test('bulkDeleteSigningRecords with partial errors re-fetches the list without a success alert', async () => {
        // rec-1 fails, rec-2 is deleted server-side. Since the reducers no longer splice locally,
        // the deleted row must be removed by a re-fetch — but with no success alert.
        const errors = [{ uuid: 'rec-1', name: 'rec-1', message: 'In use' }] as any;
        const deps = createDeps({ bulkDeleteSigningRecords: () => of(errors) });

        const state$ = {
            value: {
                pagings: {
                    pagings: [
                        {
                            entity: EntityType.SIGNING_RECORD,
                            paging: { pageNumber: 1, pageSize: 10, totalItems: 5, checkedRows: [], isFetchingList: false },
                        },
                    ],
                },
                filters: { filters: [{ entity: EntityType.SIGNING_RECORD, filter: { currentFilters: [] } }] },
            },
        } as any;

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['rec-1', 'rec-2'] })),
            state$,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[0]).toEqual(slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors }));
        expect(emitted.some((a: any) => a.type === slice.actions.listSigningRecords.type)).toBe(true);
        expect(emitted.some((a: any) => a.type === alertsSlice.actions.success.type)).toBe(false);
        expect(emitted.some((a: any) => a.type === pagingActions.setPagination.type)).toBe(false);
    });

    test('bulkDeleteSigningRecords with all items failing emits only success (no alert, no re-fetch)', async () => {
        // Every uuid errored → nothing was deleted, so there is nothing to re-fetch or re-page.
        const errors = [
            { uuid: 'rec-1', name: 'rec-1', message: 'In use' },
            { uuid: 'rec-2', name: 'rec-2', message: 'In use' },
        ] as any;
        const deps = createDeps({ bulkDeleteSigningRecords: () => of(errors) });

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['rec-1', 'rec-2'] })),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted).toEqual([slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors })]);
    });
});
