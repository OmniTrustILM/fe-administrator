import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { actions as tspProfileActions } from './tsp-profiles';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { LockWidgetNameEnum } from 'types/user-interface';

type EpicDeps = {
    apiClients: {
        tspProfiles: {
            listTspProfiles: (args: any) => any;
            getTspProfile: (args: any) => any;
            listTspProfileSearchableFields: () => any;
            createTspProfile: (args: any) => any;
            updateTspProfile: (args: any) => any;
            deleteTspProfile: (args: any) => any;
            enableTspProfile: (args: any) => any;
            disableTspProfile: (args: any) => any;
            bulkDeleteTspProfiles: (args: any) => any;
            bulkEnableTspProfiles: (args: any) => any;
            bulkDisableTspProfiles: (args: any) => any;
        };
    };
};

enum TspProfilesEpicIndex {
    List = 0,
    Detail = 1,
    SearchableFields = 2,
    Create = 3,
    Update = 4,
    Delete = 5,
    Enable = 6,
    Disable = 7,
    BulkDelete = 8,
    BulkEnable = 9,
    BulkDisable = 10,
}

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

async function runEpic(
    epicIndex: number,
    action: any,
    depsOverrides: Partial<EpicDeps['apiClients']> = {},
    takeCount = 1,
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./tsp-profiles-epics');

    const defaultClient = {
        listTspProfiles: () =>
            of({
                items: [{ uuid: 'profile-1', name: 'TSP Profile 1', enabled: true }],
                totalItems: 1,
            }),
        getTspProfile: () => of({ uuid: 'profile-1', name: 'TSP Profile 1', enabled: true }),
        listTspProfileSearchableFields: () => of([{ searchGroupEnum: 'g-1' }]),
        createTspProfile: () => of({ uuid: 'c-new', name: 'New TSP Profile' }),
        updateTspProfile: () => of({ uuid: 'profile-1', name: 'Updated TSP Profile' }),
        deleteTspProfile: () => of(null),
        enableTspProfile: () => of(undefined),
        disableTspProfile: () => of(undefined),
        bulkDeleteTspProfiles: () => of([]),
        bulkEnableTspProfiles: () => of(undefined),
        bulkDisableTspProfiles: () => of(undefined),
    };

    const deps: EpicDeps = {
        apiClients: {
            tspProfiles: depsOverrides.tspProfiles ? { ...defaultClient, ...depsOverrides.tspProfiles } : defaultClient,
        },
    };

    const epic = (epics as any)[epicIndex];
    const output$ = epic(of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('tspProfiles epics', () => {
    test('listTspProfiles success emits listSuccess and removeWidgetLock', async () => {
        const emitted = await runEpic(TspProfilesEpicIndex.List, tspProfileActions.listTspProfiles(), {}, 3);

        expect(emitted[0]).toEqual(
            tspProfileActions.listTspProfilesSuccess({
                tspProfiles: [{ uuid: 'profile-1', name: 'TSP Profile 1', enabled: true }] as any,
            }),
        );
        expect(emitted[1]).toEqual(pagingActions.listSuccess({ entity: EntityType.TSP_PROFILE, totalItems: 1 }));
        expect(emitted[2]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfTspProfiles));
    });

    test('listTspProfiles failure emits listFailure and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.List,
            tspProfileActions.listTspProfiles(),
            {
                tspProfiles: {
                    listTspProfiles: () => throwError(() => err),
                } as any,
            },
            3,
        );

        expect(emitted[0].type).toBe(tspProfileActions.listTspProfilesFailure.type);
        expect(emitted[1].type).toBe(pagingActions.listFailure.type);
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('getTspProfile success emits getSuccess and removeWidgetLock', async () => {
        const profile = { uuid: 'profile-1', name: 'TSP Profile 1', enabled: true };
        const emitted = await runEpic(
            TspProfilesEpicIndex.Detail,
            tspProfileActions.getTspProfile({ uuid: 'profile-1' }),
            {
                tspProfiles: {
                    getTspProfile: () => of(profile),
                } as any,
            },
            2,
        );

        expect(emitted[0]).toEqual(tspProfileActions.getTspProfileSuccess({ tspProfile: profile as any }));
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TspProfileDetails));
    });

    test('getTspProfile failure emits getFailure, fetchError and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Detail,
            tspProfileActions.getTspProfile({ uuid: 'profile-1' }),
            {
                tspProfiles: {
                    getTspProfile: () => throwError(() => err),
                } as any,
            },
            3,
        );

        expect(emitted[0].type).toBe(tspProfileActions.getTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to get TSP Profile details' }));
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('listTspProfileSearchableFields success emits searchableFieldsSuccess', async () => {
        const fields = [{ searchGroupEnum: 'g-1' }];
        const emitted = await runEpic(
            TspProfilesEpicIndex.SearchableFields,
            tspProfileActions.listTspProfileSearchableFields(),
            {
                tspProfiles: {
                    listTspProfileSearchableFields: () => of(fields),
                } as any,
            },
            1,
        );

        expect(emitted[0]).toEqual(tspProfileActions.listTspProfileSearchableFieldsSuccess({ searchableFields: fields as any }));
    });

    test('listTspProfileSearchableFields failure emits searchableFieldsFailure', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.SearchableFields,
            tspProfileActions.listTspProfileSearchableFields(),
            {
                tspProfiles: {
                    listTspProfileSearchableFields: () => throwError(() => err),
                } as any,
            },
            1,
        );

        expect(emitted[0].type).toBe(tspProfileActions.listTspProfileSearchableFieldsFailure.type);
    });

    test('createTspProfile success emits createSuccess and redirect', async () => {
        const emitted = await runEpic(
            TspProfilesEpicIndex.Create,
            tspProfileActions.createTspProfile({ tspProfileRequestDto: {} as any }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.createTspProfileSuccess.type);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../tspprofiles/detail/c-new' }));
    });

    test('createTspProfile failure emits createFailure and fetchError', async () => {
        const err = new Error('create failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Create,
            tspProfileActions.createTspProfile({ tspProfileRequestDto: {} as any }),
            {
                tspProfiles: {
                    createTspProfile: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.createTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to create TSP Profile' }));
    });

    test('updateTspProfile success emits updateSuccess and redirect', async () => {
        const emitted = await runEpic(
            TspProfilesEpicIndex.Update,
            tspProfileActions.updateTspProfile({ uuid: 'profile-1', tspProfileRequestDto: {} as any }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.updateTspProfileSuccess.type);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../../tspprofiles/detail/profile-1' }));
    });

    test('updateTspProfile failure emits updateFailure and fetchError', async () => {
        const err = new Error('update failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Update,
            tspProfileActions.updateTspProfile({ uuid: 'profile-1', tspProfileRequestDto: {} as any }),
            {
                tspProfiles: {
                    updateTspProfile: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.updateTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to update TSP Profile' }));
    });

    test('deleteTspProfile success emits deleteSuccess and redirect', async () => {
        const emitted = await runEpic(TspProfilesEpicIndex.Delete, tspProfileActions.deleteTspProfile({ uuid: 'profile-1' }), {}, 2);

        expect(emitted[0]).toEqual(tspProfileActions.deleteTspProfileSuccess({ uuid: 'profile-1' }));
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../../tspprofiles' }));
    });

    test('deleteTspProfile failure emits deleteFailure and fetchError', async () => {
        const err = new Error('delete failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Delete,
            tspProfileActions.deleteTspProfile({ uuid: 'profile-1' }),
            {
                tspProfiles: {
                    deleteTspProfile: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.deleteTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete TSP Profile' }));
    });

    test('enableTspProfile success emits enableSuccess', async () => {
        const emitted = await runEpic(TspProfilesEpicIndex.Enable, tspProfileActions.enableTspProfile({ uuid: 'profile-1' }), {}, 1);

        expect(emitted[0]).toEqual(tspProfileActions.enableTspProfileSuccess({ uuid: 'profile-1' }));
    });

    test('enableTspProfile failure emits enableFailure and fetchError', async () => {
        const err = new Error('enable failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Enable,
            tspProfileActions.enableTspProfile({ uuid: 'profile-1' }),
            {
                tspProfiles: {
                    enableTspProfile: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.enableTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to enable TSP Profile' }));
    });

    test('disableTspProfile success emits disableSuccess', async () => {
        const emitted = await runEpic(TspProfilesEpicIndex.Disable, tspProfileActions.disableTspProfile({ uuid: 'profile-1' }), {}, 1);

        expect(emitted[0]).toEqual(tspProfileActions.disableTspProfileSuccess({ uuid: 'profile-1' }));
    });

    test('disableTspProfile failure emits disableFailure and fetchError', async () => {
        const err = new Error('disable failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.Disable,
            tspProfileActions.disableTspProfile({ uuid: 'profile-1' }),
            {
                tspProfiles: {
                    disableTspProfile: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.disableTspProfileFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to disable TSP Profile' }));
    });

    test('bulkDeleteTspProfiles success emits bulkDeleteSuccess and alert', async () => {
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkDelete,
            tspProfileActions.bulkDeleteTspProfiles({ uuids: ['profile-1', 'c-2'] }),
            {},
            2,
        );

        expect(emitted[0]).toEqual(tspProfileActions.bulkDeleteTspProfilesSuccess({ uuids: ['profile-1', 'c-2'], errors: [] }));
        expect(emitted[1]).toEqual(alertActions.success('Selected TSP Profiles successfully deleted.'));
    });

    test('bulkDeleteTspProfiles failure emits bulkDeleteFailure and fetchError', async () => {
        const err = new Error('bulk delete failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkDelete,
            tspProfileActions.bulkDeleteTspProfiles({ uuids: ['profile-1'] }),
            {
                tspProfiles: {
                    bulkDeleteTspProfiles: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.bulkDeleteTspProfilesFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete TSP Profiles' }));
    });

    test('bulkEnableTspProfiles success emits bulkEnableSuccess', async () => {
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkEnable,
            tspProfileActions.bulkEnableTspProfiles({ uuids: ['profile-1', 'c-2'] }),
            {},
            1,
        );

        expect(emitted[0]).toEqual(tspProfileActions.bulkEnableTspProfilesSuccess({ uuids: ['profile-1', 'c-2'] }));
    });

    test('bulkEnableTspProfiles failure emits bulkEnableFailure and fetchError', async () => {
        const err = new Error('bulk enable failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkEnable,
            tspProfileActions.bulkEnableTspProfiles({ uuids: ['profile-1'] }),
            {
                tspProfiles: {
                    bulkEnableTspProfiles: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.bulkEnableTspProfilesFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to enable TSP Profiles' }));
    });

    test('bulkDisableTspProfiles success emits bulkDisableSuccess', async () => {
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkDisable,
            tspProfileActions.bulkDisableTspProfiles({ uuids: ['profile-1', 'c-2'] }),
            {},
            1,
        );

        expect(emitted[0]).toEqual(tspProfileActions.bulkDisableTspProfilesSuccess({ uuids: ['profile-1', 'c-2'] }));
    });

    test('bulkDisableTspProfiles failure emits bulkDisableFailure and fetchError', async () => {
        const err = new Error('bulk disable failed');
        const emitted = await runEpic(
            TspProfilesEpicIndex.BulkDisable,
            tspProfileActions.bulkDisableTspProfiles({ uuids: ['profile-1'] }),
            {
                tspProfiles: {
                    bulkDisableTspProfiles: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(tspProfileActions.bulkDisableTspProfilesFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to disable TSP Profiles' }));
    });
});
