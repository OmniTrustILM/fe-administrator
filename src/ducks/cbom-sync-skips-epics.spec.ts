import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { LockWidgetNameEnum } from 'types/user-interface';
import { actions as alertActions } from './alerts';
import { slice } from './cbom-sync-skips';
import cbomSyncSkipsEpics from './cbom-sync-skips-epics';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { actions as userInterfaceActions } from './user-interface';

const page = { items: [{ uuid: 'skip-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;

function deps(overrides: Record<string, (args?: any) => any> = {}) {
    return {
        apiClients: {
            cbomManagement: {
                listCbomSyncSkips: vi.fn(() => of(page)),
                retryCbomSyncSkip: vi.fn(() => of({ uuid: 'skip-1', serialNumber: 'urn:uuid:a', state: 'retrying', attempts: 0 })),
                ...overrides,
            },
        },
    } as any;
}

describe('cbom sync skips epics', () => {
    test('a list request pages, stores the page and lifts the widget lock', async () => {
        const request = { pageNumber: 2, itemsPerPage: 10, filters: [{ fieldIdentifier: 'CBOM_SYNC_SKIP_STATE' }] } as any;
        const dependencies = deps();
        const emitted = await firstValueFrom(
            (cbomSyncSkipsEpics[0] as any)(of(slice.actions.listSyncSkips(request)), of({}), dependencies).pipe(take(4), toArray()),
        );

        // The page's own request reaches the endpoint whole: a filter or a page number dropped here would be silent.
        expect(dependencies.apiClients.cbomManagement.listCbomSyncSkips).toHaveBeenCalledWith({ searchRequestDto: request });
        expect(emitted).toEqual([
            pagingActions.list(EntityType.CBOM_SYNC_SKIP),
            slice.actions.listSyncSkipsSuccess({ data: page }),
            pagingActions.listSuccess({ entity: EntityType.CBOM_SYNC_SKIP, totalItems: 1 }),
            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCbomSyncSkips),
        ]);
    });

    test('a failed list request fails the paging and locks the widget with the error', async () => {
        const emitted = await firstValueFrom(
            (cbomSyncSkipsEpics[0] as any)(
                of(slice.actions.listSyncSkips({ filters: [] } as any)),
                of({}),
                deps({ listCbomSyncSkips: () => throwError(() => new Error('boom')) }),
            ).pipe(take(4), toArray()),
        );

        expect(emitted[1].type).toBe(slice.actions.listSyncSkipsFailure.type);
        expect(emitted[2]).toEqual(pagingActions.listFailure(EntityType.CBOM_SYNC_SKIP));
        expect(emitted[3].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('a retry that lands reports success and carries the row as it now stands', async () => {
        const dependencies = deps();
        const emitted = await firstValueFrom(
            (cbomSyncSkipsEpics[1] as any)(of(slice.actions.retrySyncSkip({ uuid: 'skip-1' })), of({}), dependencies).pipe(
                take(2),
                toArray(),
            ),
        );

        expect(dependencies.apiClients.cbomManagement.retryCbomSyncSkip).toHaveBeenCalledWith({ uuid: 'skip-1' });
        expect(emitted[0]).toEqual(
            slice.actions.retrySyncSkipSuccess({
                skip: { uuid: 'skip-1', serialNumber: 'urn:uuid:a', state: 'retrying', attempts: 0 } as any,
            }),
        );
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(JSON.stringify(emitted[1].payload)).toContain('urn:uuid:a');
    });

    test('a retry that fails clears the busy row and shows the error', async () => {
        const emitted = await firstValueFrom(
            (cbomSyncSkipsEpics[1] as any)(
                of(slice.actions.retrySyncSkip({ uuid: 'skip-1' })),
                of({}),
                deps({ retryCbomSyncSkip: () => throwError(() => ({ status: 404, response: { message: 'No such entry' } })) }),
            ).pipe(take(2), toArray()),
        );

        expect(emitted[0].type).toBe(slice.actions.retrySyncSkipFailure.type);
        expect(emitted[1].type).toBe(alertActions.error.type);
    });
});
