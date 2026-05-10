import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import epics from './users-epics';
import { slice } from './users';
import { actions as appRedirectActions } from './app-redirect';

async function runBulkDeleteEpic(
    action: ReturnType<typeof slice.actions.bulkDeleteUsers>,
    depsOverrides: any,
    takeCount: number,
): Promise<any[]> {
    const deps = {
        apiClients: {
            users: {
                deleteUser: () => of(undefined),
                ...depsOverrides,
            },
        },
    };

    return firstValueFrom((epics[5] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('users epics', () => {
    test('bulkDeleteUsers success emits bulkDeleteUsersSuccess', async () => {
        const calls: string[] = [];
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteUsers({ uuids: ['u-1', 'u-2'] }),
            {
                deleteUser: ({ userUuid }: { userUuid: string }) => {
                    calls.push(userUuid);
                    return of(undefined);
                },
            },
            1,
        );

        expect(calls).toEqual(['u-1', 'u-2']);
        expect(emitted).toEqual([slice.actions.bulkDeleteUsersSuccess({ uuids: ['u-1', 'u-2'] })]);
    });

    test('bulkDeleteUsers partial failure emits success, failure and fetchError', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteUsers({ uuids: ['u-1', 'u-2'] }),
            {
                deleteUser: ({ userUuid }: { userUuid: string }) =>
                    userUuid === 'u-2' ? throwError(() => new Error('delete failed')) : of(undefined),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteUsersSuccess({ uuids: ['u-1'] }),
            slice.actions.bulkDeleteUsersFailure({ error: 'Failed to delete 1 user' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 1 user' });
    });

    test('bulkDeleteUsers multiple failures uses plural message', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteUsers({ uuids: ['u-1', 'u-2'] }),
            {
                deleteUser: () => throwError(() => new Error('delete failed')),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteUsersSuccess({ uuids: [] }),
            slice.actions.bulkDeleteUsersFailure({ error: 'Failed to delete 2 users' }),
        ]);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 2 users' });
    });

    test('bulkDeleteUsers sync throw emits bulkDeleteUsersFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteUsers({ uuids: ['u-1'] }),
            {
                deleteUser: () => {
                    throw err;
                },
            },
            2,
        );

        expect(emitted).toEqual([
            slice.actions.bulkDeleteUsersFailure({ error: 'Failed to delete users. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete users' }),
        ]);
    });
});
