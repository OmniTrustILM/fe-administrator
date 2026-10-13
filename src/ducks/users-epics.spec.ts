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

const createdUser = { uuid: 'u-1', username: 'alice', groups: [], roles: [], enabled: true, systemUser: false };

async function runCreateEpic(usersApi: any, takeCount: number): Promise<any[]> {
    const action = slice.actions.create({ userAddRequest: { username: 'alice', enabled: true }, roles: ['r-1'] });
    const deps = { apiClients: { users: { createUser: () => of(createdUser), ...usersApi } } };

    return firstValueFrom((epics[2] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('users epics', () => {
    test('create assigns the roles to the new user and opens its detail', async () => {
        const assigned: unknown[] = [];
        const emitted = await runCreateEpic(
            {
                updateRoles: (request: unknown) => {
                    assigned.push(request);
                    return of({ ...createdUser, roles: [{ uuid: 'r-1', name: 'admin', systemRole: false }] });
                },
            },
            2,
        );

        expect(assigned).toEqual([{ userUuid: 'u-1', requestBody: ['r-1'] }]);
        expect(emitted[0].type).toBe(slice.actions.createSuccess.type);
        expect(emitted[0].payload.user.roles).toHaveLength(1);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../users/detail/u-1' }));
    });

    test('create reports a user whose roles could not be assigned as created, and opens its detail', async () => {
        const refusal = new Error('roles refused');
        const emitted = await runCreateEpic({ updateRoles: () => throwError(() => refusal) }, 3);

        expect(emitted.map(({ type }) => type)).not.toContain(slice.actions.createFailure.type);
        expect(emitted[0].type).toBe(slice.actions.createSuccess.type);
        expect(emitted[0].payload.user).toMatchObject({ uuid: 'u-1', username: 'alice', roles: [] });
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../users/detail/u-1' }));
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({
            error: refusal,
            message: 'User alice was created, but its roles could not be assigned',
        });
    });

    test('create fails without asking for roles when the user itself is refused', async () => {
        let rolesRequested = false;
        const emitted = await runCreateEpic(
            {
                createUser: () => throwError(() => new Error('username taken')),
                updateRoles: () => {
                    rolesRequested = true;
                    return of(createdUser);
                },
            },
            2,
        );

        expect(rolesRequested).toBe(false);
        expect(emitted[0]).toEqual(slice.actions.createFailure({ error: 'Failed to create user. username taken' }));
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[1].payload.message).toBe('Failed to create user');
    });

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
