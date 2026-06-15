import { describe, expect, test } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { actions } from './tsp-profile-basic-credentials';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';

type EpicDeps = {
    apiClients: {
        tspProfileBasicCredentials: {
            listTspProfileBasicCredentials: (args: any) => any;
            createTspProfileBasicCredential: (args: any) => any;
            updateTspProfileBasicCredential: (args: any) => any;
            deleteTspProfileBasicCredential: (args: any) => any;
        };
    };
};

enum EpicIndex {
    List = 0,
    Create = 1,
    Update = 2,
    Delete = 3,
}

const CREDENTIAL = { uuid: 'cred-1', username: 'alice', mappedUser: { uuid: 'user-1', name: 'Alice' } };

async function runEpic(
    epicIndex: number,
    action: any,
    clientOverrides: Partial<EpicDeps['apiClients']['tspProfileBasicCredentials']> = {},
    takeCount = 1,
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./tsp-profile-basic-credentials-epics');

    const defaultClient = {
        listTspProfileBasicCredentials: () => of([CREDENTIAL]),
        createTspProfileBasicCredential: () => of(CREDENTIAL),
        updateTspProfileBasicCredential: () => of(CREDENTIAL),
        deleteTspProfileBasicCredential: () => of(undefined),
    };

    const deps: EpicDeps = {
        apiClients: {
            tspProfileBasicCredentials: { ...defaultClient, ...clientOverrides },
        },
    };

    const epic = (epics as any)[epicIndex];
    const output$ = epic(of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('tspProfileBasicCredentials epics', () => {
    test('list success emits listBasicCredentialsSuccess', async () => {
        const emitted = await runEpic(EpicIndex.List, actions.listBasicCredentials({ tspProfileUuid: 'tsp-1' }));
        expect(emitted[0]).toEqual(actions.listBasicCredentialsSuccess({ credentials: [CREDENTIAL] as any }));
    });

    test('list failure emits listFailure and fetchError', async () => {
        const emitted = await runEpic(
            EpicIndex.List,
            actions.listBasicCredentials({ tspProfileUuid: 'tsp-1' }),
            { listTspProfileBasicCredentials: () => throwError(() => new Error('failed')) },
            2,
        );
        expect(emitted[0].type).toBe(actions.listBasicCredentialsFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('create success emits createSuccess and a success alert', async () => {
        const emitted = await runEpic(
            EpicIndex.Create,
            actions.createBasicCredential({
                tspProfileUuid: 'tsp-1',
                request: { username: 'alice', password: 'pw', mappedUserUuid: 'user-1' },
            }),
            {},
            2,
        );
        expect(emitted[0]).toEqual(actions.createBasicCredentialSuccess({ credential: CREDENTIAL as any }));
        expect(emitted[1].type).toBe(alertActions.success.type);
    });

    test('create failure emits only createFailure (error surfaces in the dialog)', async () => {
        const emitted = await runEpic(
            EpicIndex.Create,
            actions.createBasicCredential({ tspProfileUuid: 'tsp-1', request: { username: 'alice', mappedUserUuid: 'user-1' } }),
            { createTspProfileBasicCredential: () => throwError(() => new Error('duplicate')) },
            1,
        );
        expect(emitted[0].type).toBe(actions.createBasicCredentialFailure.type);
    });

    test('update success emits updateSuccess and a success alert', async () => {
        const emitted = await runEpic(
            EpicIndex.Update,
            actions.updateBasicCredential({
                tspProfileUuid: 'tsp-1',
                uuid: 'cred-1',
                request: { username: 'alice', mappedUserUuid: 'user-1' },
            }),
            {},
            2,
        );
        expect(emitted[0]).toEqual(actions.updateBasicCredentialSuccess({ credential: CREDENTIAL as any }));
        expect(emitted[1].type).toBe(alertActions.success.type);
    });

    test('update failure emits only updateFailure', async () => {
        const emitted = await runEpic(
            EpicIndex.Update,
            actions.updateBasicCredential({
                tspProfileUuid: 'tsp-1',
                uuid: 'cred-1',
                request: { username: 'alice', mappedUserUuid: 'user-1' },
            }),
            { updateTspProfileBasicCredential: () => throwError(() => new Error('failed')) },
            1,
        );
        expect(emitted[0].type).toBe(actions.updateBasicCredentialFailure.type);
    });

    test('delete success emits deleteSuccess and a success alert', async () => {
        const emitted = await runEpic(EpicIndex.Delete, actions.deleteBasicCredential({ tspProfileUuid: 'tsp-1', uuid: 'cred-1' }), {}, 2);
        expect(emitted[0]).toEqual(actions.deleteBasicCredentialSuccess({ uuid: 'cred-1' }));
        expect(emitted[1].type).toBe(alertActions.success.type);
    });

    test('delete failure emits only deleteFailure (error surfaces in the error dialog)', async () => {
        const emitted = await runEpic(
            EpicIndex.Delete,
            actions.deleteBasicCredential({ tspProfileUuid: 'tsp-1', uuid: 'cred-1' }),
            { deleteTspProfileBasicCredential: () => throwError(() => new Error('failed')) },
            1,
        );
        expect(emitted[0].type).toBe(actions.deleteBasicCredentialFailure.type);
    });
});
