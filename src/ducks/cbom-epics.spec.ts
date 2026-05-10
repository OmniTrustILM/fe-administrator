import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import cbomEpics from './cbom-epics';
import { slice } from './cbom';
import { alertsSlice } from './alert-slice';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';
import { actions as appRedirectActions } from './app-redirect';
import { LockWidgetNameEnum } from 'types/user-interface';

type EpicDeps = {
    apiClients: {
        cbomManagement: {
            listCboms: (args: any) => any;
            getCbomDetail: (args: any) => any;
            listCbomVersions: (args: any) => any;
            getCbomSearchableFields: () => any;
            uploadCbom: (args: any) => any;
            deleteCbom: (args: any) => any;
            bulkDeleteCbom: (args: any) => any;
            sync: () => any;
        };
    };
};

function createDeps(overrides: Partial<EpicDeps['apiClients']['cbomManagement']> = {}): EpicDeps {
    return {
        apiClients: {
            cbomManagement: {
                listCboms: () => of({ items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 10, totalPages: 0 }),
                getCbomDetail: () => of({ uuid: 'detail-default' }),
                listCbomVersions: () => of([]),
                getCbomSearchableFields: () => of([]),
                uploadCbom: () => of({ uuid: 'uploaded-default' }),
                deleteCbom: () => of(undefined),
                bulkDeleteCbom: () => of([]),
                sync: () => of(undefined),
                ...overrides,
            },
        },
    };
}

describe('cbom epics', () => {
    test('listCboms success emits paging and success actions', async () => {
        const searchRequest = { pageNumber: 1, itemsPerPage: 10, filters: [] } as any;
        const response = { items: [{ uuid: 'cbom-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;

        const deps = createDeps({
            listCboms: ({ searchRequestDto }) => {
                expect(searchRequestDto).toEqual(searchRequest);
                return of(response);
            },
        });

        const output$ = (cbomEpics[0] as any)(of(slice.actions.listCboms(searchRequest)), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted).toEqual([
            pagingActions.list(EntityType.CBOM),
            slice.actions.listCbomsSuccess({ data: response }),
            pagingActions.listSuccess({ entity: EntityType.CBOM, totalItems: 1 }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCboms),
        ]);
    });

    test('listCboms failure emits paging and failure actions', async () => {
        const deps = createDeps({
            listCboms: () => throwError(() => new Error('list failed')),
        });

        const output$ = (cbomEpics[0] as any)(
            of(slice.actions.listCboms({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any)),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));

        expect(emitted[0]).toEqual(pagingActions.list(EntityType.CBOM));
        expect(emitted[1]).toEqual(slice.actions.listCbomsFailure({ error: 'Failed to fetch CBOMs. list failed' }));
        expect(emitted[2]).toEqual(pagingActions.listFailure(EntityType.CBOM));
        expect(emitted[3].type).toBe(userInterfaceActions.insertWidgetLock.type);
        expect(emitted[3].payload.widgetName).toBe(LockWidgetNameEnum.ListOfCboms);
    });

    test('listCboms success adjusts paging totalItems for locally deleted cboms', async () => {
        const searchRequest = { pageNumber: 1, itemsPerPage: 10, filters: [] } as any;
        const response = {
            items: [{ uuid: 'cbom-deleted' }, { uuid: 'cbom-visible-1' }, { uuid: 'cbom-visible-2' }],
            totalItems: 3,
            pageNumber: 1,
            itemsPerPage: 10,
            totalPages: 1,
        } as any;

        const deps = createDeps({
            listCboms: () => of(response),
        });

        const state$ = { value: { cbom: { deletedCbomUuids: ['cbom-deleted'] } } } as any;

        const output$ = (cbomEpics[0] as any)(of(slice.actions.listCboms(searchRequest)), state$, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(4), toArray()));
        const adjustedResponse = {
            ...response,
            items: [{ uuid: 'cbom-visible-1' }, { uuid: 'cbom-visible-2' }],
            totalItems: 2,
        };

        expect(emitted[0]).toEqual(pagingActions.list(EntityType.CBOM));
        expect(emitted[1]).toEqual(slice.actions.listCbomsSuccess({ data: adjustedResponse }));
        expect(emitted[2]).toEqual(pagingActions.listSuccess({ entity: EntityType.CBOM, totalItems: 2 }));
        expect(emitted[3]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCboms));
    });

    test('getCbomDetail success emits getCbomDetailSuccess and removeWidgetLock', async () => {
        const uuid = 'cbom-detail-1';
        const detail = { uuid, version: 4, serialNumber: 'urn:cbom:1' } as any;

        const deps = createDeps({
            getCbomDetail: ({ uuid: value }) => {
                expect(value).toBe(uuid);
                return of(detail);
            },
        });

        const output$ = (cbomEpics[1] as any)(of(slice.actions.getCbomDetail({ uuid })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([
            slice.actions.getCbomDetailSuccess({ detail }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CbomDetail),
        ]);
    });

    test('getCbomDetail failure emits getCbomDetailFailure and insertWidgetLock', async () => {
        const deps = createDeps({
            getCbomDetail: () => throwError(() => new Error('detail failed')),
        });

        const output$ = (cbomEpics[1] as any)(of(slice.actions.getCbomDetail({ uuid: 'u' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.getCbomDetailFailure({ error: 'Failed to fetch CBOM detail. detail failed' }));
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
        expect(emitted[1].payload.widgetName).toBe(LockWidgetNameEnum.CbomDetail);
    });

    test('getCbomDetail failure includes backend status code when present', async () => {
        const deps = createDeps({
            getCbomDetail: () => throwError(() => ({ status: 404, message: 'not found' })),
        });

        const output$ = (cbomEpics[1] as any)(of(slice.actions.getCbomDetail({ uuid: 'u' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(
            slice.actions.getCbomDetailFailure({ error: 'Failed to fetch CBOM detail. not found', statusCode: 404 }),
        );
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
        expect(emitted[1].payload.widgetName).toBe(LockWidgetNameEnum.CbomDetail);
    });

    test('listCbomVersions success emits listCbomVersionsSuccess and removeWidgetLock', async () => {
        const uuid = 'cbom-versions-1';
        const versions = [
            { uuid: 'v-1', version: 1 },
            { uuid: 'v-2', version: 2 },
        ] as any[];

        const deps = createDeps({
            listCbomVersions: ({ uuid: value }) => {
                expect(value).toBe(uuid);
                return of(versions);
            },
        });

        const output$ = (cbomEpics[2] as any)(of(slice.actions.listCbomVersions({ uuid })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([
            slice.actions.listCbomVersionsSuccess({ versions }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CbomVersions),
        ]);
    });

    test('listCbomVersions failure emits listCbomVersionsFailure and insertWidgetLock', async () => {
        const deps = createDeps({
            listCbomVersions: () => throwError(() => new Error('versions failed')),
        });

        const output$ = (cbomEpics[2] as any)(of(slice.actions.listCbomVersions({ uuid: 'u' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.listCbomVersionsFailure({ error: 'Failed to fetch CBOM versions. versions failed' }));
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
        expect(emitted[1].payload.widgetName).toBe(LockWidgetNameEnum.CbomVersions);
    });

    test('getSearchableFields success emits getSearchableFieldsSuccess', async () => {
        const fields = [{ group: 'cbom', fields: [{ field: 'serialNumber', label: 'Serial Number' }] }] as any;
        const deps = createDeps({
            getCbomSearchableFields: () => of(fields),
        });

        const output$ = (cbomEpics[3] as any)(of(slice.actions.getSearchableFields()), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted).toEqual([slice.actions.getSearchableFieldsSuccess({ fields })]);
    });

    test('getSearchableFields failure emits getSearchableFieldsFailure and fetchError', async () => {
        const err = new Error('searchable failed');
        const deps = createDeps({
            getCbomSearchableFields: () => throwError(() => err),
        });

        const output$ = (cbomEpics[3] as any)(of(slice.actions.getSearchableFields()), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(
            slice.actions.getSearchableFieldsFailure({ error: 'Failed to fetch searchable fields. searchable failed' }),
        );
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to fetch searchable fields' }));
    });

    test('uploadCbom success emits uploadCbomSuccess and success alert', async () => {
        const uploadPayload = { content: { metadata: { serialNumber: 'urn:cbom:1' } } } as any;
        const created = { uuid: 'created-cbom', serialNumber: 'urn:cbom:1' } as any;

        const deps = createDeps({
            uploadCbom: ({ cbomUploadRequestDto }) => {
                expect(cbomUploadRequestDto).toEqual(uploadPayload);
                return of(created);
            },
        });

        const output$ = (cbomEpics[4] as any)(of(slice.actions.uploadCbom(uploadPayload)), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([
            slice.actions.uploadCbomSuccess({ cbom: created }),
            alertsSlice.actions.success('CBOM uploaded successfully.'),
        ]);
    });

    test('uploadCbom failure emits uploadCbomFailure and alert error', async () => {
        const deps = createDeps({
            uploadCbom: () => throwError(() => new Error('upload failed')),
        });

        const output$ = (cbomEpics[4] as any)(
            of(slice.actions.uploadCbom({ content: { metadata: {} } } as any)),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.uploadCbomFailure({ error: 'Failed to upload CBOM. upload failed' }));
        expect(emitted[1]).toEqual(alertsSlice.actions.error('Failed to upload CBOM. upload failed'));
    });

    test('uploadCbom failure deduplicates repeated already exists phrase', async () => {
        const deps = createDeps({
            uploadCbom: () => throwError(() => ({ message: 'Object already exists already exists' })),
        });

        const output$ = (cbomEpics[4] as any)(
            of(slice.actions.uploadCbom({ content: { metadata: {} } } as any)),
            of({}) as any,
            deps as any,
        );
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(
            slice.actions.uploadCbomFailure({
                error: 'A CBOM with the same serial number and version already exists.\nPlease upload a new version or update the existing CBOM.',
            }),
        );
        expect(emitted[1]).toEqual(
            alertsSlice.actions.error(
                'A CBOM with the same serial number and version already exists.\nPlease upload a new version or update the existing CBOM.',
            ),
        );
    });

    test('uploadCbom failure maps backend duplicate serial/version message to user-friendly text', async () => {
        const deps = createDeps({
            uploadCbom: () =>
                throwError(() => ({
                    message:
                        "Failed to upload CBOM (400): Object of type 'CbomDetailDto' identified by CBOM with given serial number and version already exists.",
                })),
        });

        const output$ = (cbomEpics[4] as any)(of(slice.actions.uploadCbom({ content: {} } as any)), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(
            slice.actions.uploadCbomFailure({
                error: 'A CBOM with the same serial number and version already exists.\nPlease upload a new version or update the existing CBOM.',
            }),
        );
        expect(emitted[1]).toEqual(
            alertsSlice.actions.error(
                'A CBOM with the same serial number and version already exists.\nPlease upload a new version or update the existing CBOM.',
            ),
        );
    });

    test('deleteCbom success emits deleteCbomSuccess and success alert', async () => {
        const uuid = 'cbom-delete-1';
        const deps = createDeps({
            deleteCbom: ({ uuid: value }) => {
                expect(value).toBe(uuid);
                return of(undefined);
            },
        });

        const output$ = (cbomEpics[5] as any)(of(slice.actions.deleteCbom({ uuid })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([slice.actions.deleteCbomSuccess({ uuid }), alertsSlice.actions.success('CBOM successfully deleted.')]);
    });

    test('deleteCbom failure emits deleteCbomFailure and error alert', async () => {
        const deps = createDeps({
            deleteCbom: () => throwError(() => new Error('delete failed')),
        });

        const output$ = (cbomEpics[5] as any)(of(slice.actions.deleteCbom({ uuid: 'u' })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.deleteCbomFailure({ error: 'Failed to delete CBOM. delete failed' }));
        expect(emitted[1]).toEqual(alertsSlice.actions.error('Failed to delete CBOM. delete failed'));
    });

    test('bulkDeleteCbom success emits bulkDeleteCbomSuccess and success alert', async () => {
        const uuids = ['u1', 'u2'];
        const deps = createDeps({
            bulkDeleteCbom: ({ requestBody }) => {
                expect(requestBody).toEqual(uuids);
                return of([]);
            },
        });

        const output$ = (cbomEpics[6] as any)(of(slice.actions.bulkDeleteCbom({ uuids })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([
            slice.actions.bulkDeleteCbomSuccess({ uuids }),
            alertsSlice.actions.success('Selected CBOMs successfully deleted.'),
        ]);
    });

    test('bulkDeleteCbom failure emits bulkDeleteCbomFailure and error alert', async () => {
        const deps = createDeps({
            bulkDeleteCbom: () => throwError(() => new Error('bulk delete failed')),
        });

        const output$ = (cbomEpics[6] as any)(of(slice.actions.bulkDeleteCbom({ uuids: ['u1', 'u2'] })), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.bulkDeleteCbomFailure({ error: 'Failed to bulk delete CBOMs. bulk delete failed' }));
        expect(emitted[1]).toEqual(alertsSlice.actions.error('Failed to bulk delete CBOMs. bulk delete failed'));
    });

    test('syncCboms success emits syncCbomsSuccess and success alert', async () => {
        const deps = createDeps({
            sync: () => of(undefined),
        });

        const output$ = (cbomEpics[7] as any)(of(slice.actions.syncCboms()), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted).toEqual([slice.actions.syncCbomsSuccess(), alertsSlice.actions.success('CBOMs successfully synchronized.')]);
    });

    test('syncCboms failure emits syncCbomsFailure and error alert', async () => {
        const deps = createDeps({
            sync: () => throwError(() => new Error('sync failed')),
        });

        const output$ = (cbomEpics[7] as any)(of(slice.actions.syncCboms()), of({}) as any, deps as any);
        const emitted = await firstValueFrom(output$.pipe(take(2), toArray()));

        expect(emitted[0]).toEqual(slice.actions.syncCbomsFailure({ error: 'Failed to sync CBOMs. sync failed' }));
        expect(emitted[1]).toEqual(alertsSlice.actions.error('Failed to sync CBOMs. sync failed'));
    });
});
