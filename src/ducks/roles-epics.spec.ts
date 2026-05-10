import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import epics from './roles-epics';
import { actions } from './roles';
import { actions as appRedirectActions } from './app-redirect';

async function runBulkDeleteEpic(action: ReturnType<typeof actions.bulkDelete>, depsOverrides: any, takeCount: number): Promise<any[]> {
    const deps = {
        apiClients: {
            roles: {
                deleteRole: () => of(undefined),
                ...depsOverrides,
            },
        },
    };

    return firstValueFrom((epics[5] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('roles epics', () => {
    test('bulkDelete success emits bulkDeleteSuccess', async () => {
        const calls: string[] = [];
        const emitted = await runBulkDeleteEpic(
            actions.bulkDelete({ uuids: ['r-1', 'r-2'] }),
            {
                deleteRole: ({ roleUuid }: { roleUuid: string }) => {
                    calls.push(roleUuid);
                    return of(undefined);
                },
            },
            1,
        );

        expect(calls).toEqual(['r-1', 'r-2']);
        expect(emitted).toEqual([actions.bulkDeleteSuccess({ uuids: ['r-1', 'r-2'] })]);
    });

    test('bulkDelete partial failure emits success, failure and fetchError', async () => {
        const emitted = await runBulkDeleteEpic(
            actions.bulkDelete({ uuids: ['r-1', 'r-2'] }),
            {
                deleteRole: ({ roleUuid }: { roleUuid: string }) =>
                    roleUuid === 'r-2' ? throwError(() => new Error('delete failed')) : of(undefined),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            actions.bulkDeleteSuccess({ uuids: ['r-1'] }),
            actions.bulkDeleteFailure({ error: 'Failed to delete 1 role' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 1 role' });
    });

    test('bulkDelete multiple failures uses plural message', async () => {
        const emitted = await runBulkDeleteEpic(
            actions.bulkDelete({ uuids: ['r-1', 'r-2'] }),
            {
                deleteRole: () => throwError(() => new Error('delete failed')),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            actions.bulkDeleteSuccess({ uuids: [] }),
            actions.bulkDeleteFailure({ error: 'Failed to delete 2 roles' }),
        ]);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 2 roles' });
    });

    test('bulkDelete sync throw emits bulkDeleteFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runBulkDeleteEpic(
            actions.bulkDelete({ uuids: ['r-1'] }),
            {
                deleteRole: () => {
                    throw err;
                },
            },
            2,
        );

        expect(emitted).toEqual([
            actions.bulkDeleteFailure({ error: 'Failed to delete roles. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete roles' }),
        ]);
    });
});
