import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { actions as timeQualityConfigurationActions } from './time-quality-configurations';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { LockWidgetNameEnum } from 'types/user-interface';

type EpicDeps = {
    apiClients: {
        timeQualityConfigurations: {
            listTimeQualityConfigurations: (args: any) => any;
            getTimeQualityConfiguration: (args: any) => any;
            listTimeQualityConfigurationSearchableFields: () => any;
            createTimeQualityConfiguration: (args: any) => any;
            updateTimeQualityConfiguration: (args: any) => any;
            deleteTimeQualityConfiguration: (args: any) => any;
            bulkDeleteTimeQualityConfigurations: (args: any) => any;
            listSigningProfilesForTimeQualityConfiguration: (args: any) => any;
        };
    };
};

enum TimeQualityConfigurationsEpicIndex {
    List = 0,
    Detail = 1,
    SearchableFields = 2,
    Create = 3,
    Update = 4,
    Delete = 5,
    BulkDelete = 6,
    ListAssociatedSigningProfiles = 7,
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
    const { default: epics } = await import('./time-quality-configurations-epics');

    const defaultClient = {
        listTimeQualityConfigurations: () =>
            of({
                items: [{ uuid: 'c-1', name: 'TQ Config 1' }],
                totalItems: 1,
            }),
        getTimeQualityConfiguration: () => of({ uuid: 'c-1', name: 'TQ Config 1' }),
        listTimeQualityConfigurationSearchableFields: () => of([{ searchGroupEnum: 'g-1' }]),
        createTimeQualityConfiguration: () => of({ uuid: 'c-new', name: 'New TQ Config' }),
        updateTimeQualityConfiguration: () => of({ uuid: 'c-1', name: 'Updated TQ Config' }),
        deleteTimeQualityConfiguration: () => of(null),
        bulkDeleteTimeQualityConfigurations: () => of([]),
        listSigningProfilesForTimeQualityConfiguration: () => of([{ uuid: 'sp-1', name: 'Signing Profile 1' }]),
    };

    const deps: EpicDeps = {
        apiClients: {
            timeQualityConfigurations: depsOverrides.timeQualityConfigurations
                ? { ...defaultClient, ...depsOverrides.timeQualityConfigurations }
                : defaultClient,
        },
    };

    const epic = (epics as any)[epicIndex];
    const output$ = epic(of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('timeQualityConfigurations epics', () => {
    test('listTimeQualityConfigurations success emits listSuccess, pagingListSuccess and removeWidgetLock', async () => {
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.List,
            timeQualityConfigurationActions.listTimeQualityConfigurations(),
            {},
            3,
        );

        expect(emitted[0]).toEqual(
            timeQualityConfigurationActions.listTimeQualityConfigurationsSuccess({
                timeQualityConfigurations: [{ uuid: 'c-1', name: 'TQ Config 1' }] as any,
            }),
        );
        expect(emitted[1]).toEqual(pagingActions.listSuccess({ entity: EntityType.TIME_QUALITY_CONFIGURATION, totalItems: 1 }));
        expect(emitted[2]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfTimeQualityConfigurations));
    });

    test('listTimeQualityConfigurations failure emits listFailure, pagingListFailure and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.List,
            timeQualityConfigurationActions.listTimeQualityConfigurations(),
            {
                timeQualityConfigurations: {
                    listTimeQualityConfigurations: () => throwError(() => err),
                } as any,
            },
            3,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.listTimeQualityConfigurationsFailure.type);
        expect(emitted[1].type).toBe(pagingActions.listFailure.type);
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('getTimeQualityConfiguration success emits getSuccess and removeWidgetLock', async () => {
        const config = { uuid: 'c-1', name: 'TQ Config 1' };
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Detail,
            timeQualityConfigurationActions.getTimeQualityConfiguration({ uuid: 'c-1' }),
            {
                timeQualityConfigurations: {
                    getTimeQualityConfiguration: () => of(config),
                } as any,
            },
            2,
        );

        expect(emitted[0]).toEqual(
            timeQualityConfigurationActions.getTimeQualityConfigurationSuccess({ timeQualityConfiguration: config as any }),
        );
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TimeQualityConfigurationDetails));
    });

    test('getTimeQualityConfiguration failure emits getFailure, fetchError and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Detail,
            timeQualityConfigurationActions.getTimeQualityConfiguration({ uuid: 'c-1' }),
            {
                timeQualityConfigurations: {
                    getTimeQualityConfiguration: () => throwError(() => err),
                } as any,
            },
            3,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.getTimeQualityConfigurationFailure.type);
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({ error: err, message: 'Failed to get Time Quality Configuration details' }),
        );
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('listTimeQualityConfigurationSearchableFields success emits searchableFieldsSuccess', async () => {
        const fields = [{ searchGroupEnum: 'g-1' }];
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.SearchableFields,
            timeQualityConfigurationActions.listTimeQualityConfigurationSearchableFields(),
            {
                timeQualityConfigurations: {
                    listTimeQualityConfigurationSearchableFields: () => of(fields),
                } as any,
            },
            1,
        );

        expect(emitted[0]).toEqual(
            timeQualityConfigurationActions.listTimeQualityConfigurationSearchableFieldsSuccess({ searchableFields: fields as any }),
        );
    });

    test('listTimeQualityConfigurationSearchableFields failure emits searchableFieldsFailure', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.SearchableFields,
            timeQualityConfigurationActions.listTimeQualityConfigurationSearchableFields(),
            {
                timeQualityConfigurations: {
                    listTimeQualityConfigurationSearchableFields: () => throwError(() => err),
                } as any,
            },
            1,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.listTimeQualityConfigurationSearchableFieldsFailure.type);
    });

    test('createTimeQualityConfiguration success emits createSuccess and redirect', async () => {
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Create,
            timeQualityConfigurationActions.createTimeQualityConfiguration({
                timeQualityConfigurationRequestDto: {} as any,
            }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.createTimeQualityConfigurationSuccess.type);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../timequalityconfigurations/detail/c-new' }));
    });

    test('createTimeQualityConfiguration failure emits createFailure and fetchError', async () => {
        const err = new Error('create failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Create,
            timeQualityConfigurationActions.createTimeQualityConfiguration({
                timeQualityConfigurationRequestDto: {} as any,
            }),
            {
                timeQualityConfigurations: {
                    createTimeQualityConfiguration: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.createTimeQualityConfigurationFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to create Time Quality Configuration' }));
    });

    test('updateTimeQualityConfiguration success emits updateSuccess and redirect', async () => {
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Update,
            timeQualityConfigurationActions.updateTimeQualityConfiguration({
                uuid: 'c-1',
                timeQualityConfigurationRequestDto: {} as any,
            }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.updateTimeQualityConfigurationSuccess.type);
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../../timequalityconfigurations/detail/c-1' }));
    });

    test('updateTimeQualityConfiguration failure emits updateFailure and fetchError', async () => {
        const err = new Error('update failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Update,
            timeQualityConfigurationActions.updateTimeQualityConfiguration({
                uuid: 'c-1',
                timeQualityConfigurationRequestDto: {} as any,
            }),
            {
                timeQualityConfigurations: {
                    updateTimeQualityConfiguration: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.updateTimeQualityConfigurationFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to update Time Quality Configuration' }));
    });

    test('deleteTimeQualityConfiguration success emits deleteSuccess and redirect', async () => {
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Delete,
            timeQualityConfigurationActions.deleteTimeQualityConfiguration({ uuid: 'c-1' }),
            {},
            2,
        );

        expect(emitted[0]).toEqual(timeQualityConfigurationActions.deleteTimeQualityConfigurationSuccess({ uuid: 'c-1' }));
        expect(emitted[1]).toEqual(appRedirectActions.redirect({ url: '../../timequalityconfigurations' }));
    });

    test('deleteTimeQualityConfiguration failure emits deleteFailure and fetchError', async () => {
        const err = new Error('delete failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.Delete,
            timeQualityConfigurationActions.deleteTimeQualityConfiguration({ uuid: 'c-1' }),
            {
                timeQualityConfigurations: {
                    deleteTimeQualityConfiguration: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.deleteTimeQualityConfigurationFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete Time Quality Configuration' }));
    });

    test('bulkDeleteTimeQualityConfigurations success emits bulkDeleteSuccess and alert', async () => {
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.BulkDelete,
            timeQualityConfigurationActions.bulkDeleteTimeQualityConfigurations({ uuids: ['c-1', 'c-2'] }),
            {},
            2,
        );

        expect(emitted[0]).toEqual(
            timeQualityConfigurationActions.bulkDeleteTimeQualityConfigurationsSuccess({ uuids: ['c-1', 'c-2'], errors: [] }),
        );
        expect(emitted[1]).toEqual(alertActions.success('Selected Time Quality Configurations successfully deleted.'));
    });

    test('bulkDeleteTimeQualityConfigurations failure emits bulkDeleteFailure and fetchError', async () => {
        const err = new Error('bulk delete failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.BulkDelete,
            timeQualityConfigurationActions.bulkDeleteTimeQualityConfigurations({ uuids: ['c-1'] }),
            {
                timeQualityConfigurations: {
                    bulkDeleteTimeQualityConfigurations: () => throwError(() => err),
                } as any,
            },
            2,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.bulkDeleteTimeQualityConfigurationsFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete Time Quality Configurations' }));
    });

    test('listAssociatedSigningProfiles success emits listAssociatedSigningProfilesSuccess', async () => {
        const profiles = [{ uuid: 'sp-1', name: 'Signing Profile 1' }];
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.ListAssociatedSigningProfiles,
            timeQualityConfigurationActions.listAssociatedSigningProfiles({ uuid: 'c-1' }),
            {
                timeQualityConfigurations: {
                    listSigningProfilesForTimeQualityConfiguration: () => of(profiles),
                } as any,
            },
            1,
        );

        expect(emitted[0]).toEqual(
            timeQualityConfigurationActions.listAssociatedSigningProfilesSuccess({ signingProfiles: profiles as any }),
        );
    });

    test('listAssociatedSigningProfiles failure emits listAssociatedSigningProfilesFailure', async () => {
        const err = new Error('fetch failed');
        const emitted = await runEpic(
            TimeQualityConfigurationsEpicIndex.ListAssociatedSigningProfiles,
            timeQualityConfigurationActions.listAssociatedSigningProfiles({ uuid: 'c-1' }),
            {
                timeQualityConfigurations: {
                    listSigningProfilesForTimeQualityConfiguration: () => throwError(() => err),
                } as any,
            },
            1,
        );

        expect(emitted[0].type).toBe(timeQualityConfigurationActions.listAssociatedSigningProfilesFailure.type);
    });
});
