import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import epics from './entities-epics';
import { slice } from './entities';
import { actions as appRedirectActions } from './app-redirect';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

async function runBulkDeleteEpic(
    action: ReturnType<typeof slice.actions.bulkDeleteEntities>,
    depsOverrides: any,
    takeCount: number,
): Promise<any[]> {
    const deps = {
        apiClients: {
            entities: {
                deleteEntityInstance: () => of(undefined),
                ...depsOverrides,
            },
        },
    };

    return firstValueFrom((epics[7] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('entities epics', () => {
    test('bulkDeleteEntities success emits bulkDeleteEntitiesSuccess', async () => {
        const calls: string[] = [];
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteEntities({ uuids: ['e-1', 'e-2'] }),
            {
                deleteEntityInstance: ({ entityUuid }: { entityUuid: string }) => {
                    calls.push(entityUuid);
                    return of(undefined);
                },
            },
            1,
        );

        expect(calls).toEqual(['e-1', 'e-2']);
        expect(emitted).toEqual([slice.actions.bulkDeleteEntitiesSuccess({ uuids: ['e-1', 'e-2'] })]);
    });

    test('bulkDeleteEntities partial failure emits success, failure and fetchError', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteEntities({ uuids: ['e-1', 'e-2'] }),
            {
                deleteEntityInstance: ({ entityUuid }: { entityUuid: string }) =>
                    entityUuid === 'e-2' ? throwError(() => new Error('delete failed')) : of(undefined),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteEntitiesSuccess({ uuids: ['e-1'] }),
            slice.actions.bulkDeleteEntitiesFailure({ error: 'Failed to delete 1 entity' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 1 entity' });
    });

    test('bulkDeleteEntities multiple failures uses plural message', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteEntities({ uuids: ['e-1', 'e-2'] }),
            {
                deleteEntityInstance: () => throwError(() => new Error('delete failed')),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteEntitiesSuccess({ uuids: [] }),
            slice.actions.bulkDeleteEntitiesFailure({ error: 'Failed to delete 2 entities' }),
        ]);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 2 entities' });
    });

    test('bulkDeleteEntities sync throw emits bulkDeleteEntitiesFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteEntities({ uuids: ['e-1'] }),
            {
                deleteEntityInstance: () => {
                    throw err;
                },
            },
            2,
        );

        expect(emitted).toEqual([
            slice.actions.bulkDeleteEntitiesFailure({ error: 'Failed to delete Entities. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Entities' }),
        ]);
    });
});
