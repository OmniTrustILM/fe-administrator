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

    test('listSigningRecords success adjusts paging totalItems for locally deleted records', async () => {
        const response = {
            items: [{ uuid: 'rec-deleted' }, { uuid: 'rec-1' }, { uuid: 'rec-2' }],
            totalItems: 3,
            pageNumber: 1,
            itemsPerPage: 10,
            totalPages: 1,
        } as any;

        const deps = createDeps({ listSigningRecords: () => of(response) });
        const state$ = { value: { signingRecords: { deletedSigningRecordUuids: ['rec-deleted'] } } } as any;

        const output$ = (listSigningRecords as any)(
            of(slice.actions.listSigningRecords({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any)),
            state$,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[1]).toEqual(
            slice.actions.listSigningRecordsSuccess({
                data: { ...response, items: [{ uuid: 'rec-1' }, { uuid: 'rec-2' }], totalItems: 2 },
            }),
        );
        expect(emitted[2]).toEqual(pagingActions.listSuccess({ entity: EntityType.SIGNING_RECORD, totalItems: 2 }));
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

    test('bulkDeleteSigningRecords success (no errors) emits success and alert', async () => {
        const deps = createDeps({
            bulkDeleteSigningRecords: ({ requestBody }) => {
                expect(requestBody).toEqual(['rec-1', 'rec-2']);
                return of([]);
            },
        });

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['rec-1', 'rec-2'] })),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors: [] }));
        expect(emitted[1].type).toBe(alertsSlice.actions.success.type);
    });

    test('bulkDeleteSigningRecords with per-item errors emits success carrying errors and no alert', async () => {
        const errors = [{ uuid: 'rec-1', name: 'rec-1', message: 'In use' }] as any;
        const deps = createDeps({ bulkDeleteSigningRecords: () => of(errors) });

        const output$ = (bulkDeleteSigningRecords as any)(
            of(slice.actions.bulkDeleteSigningRecords({ uuids: ['rec-1', 'rec-2'] })),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted).toEqual([slice.actions.bulkDeleteSigningRecordsSuccess({ uuids: ['rec-1', 'rec-2'], errors })]);
    });
});
