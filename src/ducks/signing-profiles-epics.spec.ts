import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { actions as signingProfileActions } from './signing-profiles';
import { actions as appRedirectActions } from './app-redirect';
import { actions as alertActions } from './alerts';
import { actions as userInterfaceActions } from './user-interface';
import { actions as pagingActions } from './paging';
import { EntityType } from './filters';
import { LockWidgetNameEnum } from 'types/user-interface';
import { SigningWorkflowType } from 'types/openapi';

// Epic indices match the order of the exported `epics` array in signing-profiles-epics.ts
enum SigningProfilesEpicIndex {
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
    ActivateTsp = 11,
    DeactivateTsp = 12,
    GetTspActivationDetails = 13,
    ListSupportedProtocols = 14,
    ListSigningCertificates = 15,
    ListSignatureAttributes = 16,
    ListSignatureFormattingConnectorAttributes = 17,
    ListSignatureFormattingConnectors = 18,
    ListSigningRecords = 19,
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
    depsOverrides: { signingProfiles?: any; connectorsV2?: any } = {},
    takeCount = 1,
    state?: any,
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./signing-profiles-epics');

    const defaultSigningProfiles = {
        listSigningProfiles: () =>
            of({
                items: [{ uuid: 'p-1', name: 'Profile 1', enabled: true }],
                totalItems: 1,
            }),
        getSigningProfile: () => of({ uuid: 'p-1', name: 'Profile 1', enabled: true }),
        listSigningProfileSearchableFields: () => of([{ searchGroupEnum: 'g-1' }]),
        createSigningProfile: () => of({ uuid: 'p-new', name: 'New Profile' }),
        updateSigningProfile: () => of({ uuid: 'p-1', name: 'Updated Profile' }),
        deleteSigningProfile: () => of(null),
        enableSigningProfile: () => of(undefined),
        disableSigningProfile: () => of(undefined),
        bulkDeleteSigningProfiles: () => of([]),
        bulkEnableSigningProfiles: () => of(undefined),
        bulkDisableSigningProfiles: () => of(undefined),
        activateTsp: () => of({ uuid: 'tsp-1' }),
        deactivateTsp: () => of(undefined),
        getTspActivationDetails: () => of({ uuid: 'tsp-1' }),
        listSupportedProtocols: () => of(['tsp']),
        listSigningCertificates: () => of([{ uuid: 'c-1' }]),
        listSignatureAttributesForCertificate: () => of([{ uuid: 'a-1' }]),
        listSignatureFormattingConnectorAttributes: () => of([{ uuid: 'a-1' }]),
        listSigningRecordsForSigningProfile: () => of({ items: [], totalItems: 0 }),
    };

    const defaultConnectorsV2 = {
        listConnectorsV2: () => of({ items: [] }),
    };

    const deps = {
        apiClients: {
            signingProfiles: { ...defaultSigningProfiles, ...depsOverrides.signingProfiles },
            connectorsV2: { ...defaultConnectorsV2, ...depsOverrides.connectorsV2 },
        },
    };

    const epic = (epics as any)[epicIndex];
    const output$ = epic(of(action), new BehaviorSubject(state ?? { signingProfiles: {} }) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('signingProfiles epics', () => {
    test('listSigningProfiles success emits listSuccess, pagingListSuccess and removeWidgetLock', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.List,
            signingProfileActions.listSigningProfiles({ itemsPerPage: 10, pageNumber: 1, filters: [] }),
            {},
            3,
        );

        expect(emitted[0]).toEqual(
            signingProfileActions.listSigningProfilesSuccess({
                signingProfiles: [{ uuid: 'p-1', name: 'Profile 1', enabled: true }] as any,
            }),
        );
        expect(emitted[1]).toEqual(pagingActions.listSuccess({ entity: EntityType.SIGNING_PROFILE, totalItems: 1 }));
        expect(emitted[2]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSigningProfiles));
    });

    test('listSigningProfiles handles undefined payload and empty response', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.List,
            signingProfileActions.listSigningProfiles(undefined),
            {
                signingProfiles: {
                    listSigningProfiles: () => of({}),
                },
            },
            3,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSigningProfilesSuccess({ signingProfiles: [] }));
        expect(emitted[1]).toEqual(pagingActions.listSuccess({ entity: EntityType.SIGNING_PROFILE, totalItems: 0 }));
    });

    test('listSigningProfiles failure emits listFailure, pagingListFailure and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.List,
            signingProfileActions.listSigningProfiles({ itemsPerPage: 10, pageNumber: 1, filters: [] }),
            {
                signingProfiles: {
                    listSigningProfiles: () => throwError(() => err),
                },
            },
            3,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSigningProfilesFailure.type);
        expect(emitted[1]).toEqual(pagingActions.listFailure(EntityType.SIGNING_PROFILE));
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('getSigningProfile success emits getSuccess and removeWidgetLock', async () => {
        const profile = { uuid: 'p-1', name: 'Profile 1', enabled: true };
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Detail,
            signingProfileActions.getSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    getSigningProfile: () => of(profile),
                },
            },
            2,
        );

        expect(emitted[0]).toEqual(signingProfileActions.getSigningProfileSuccess({ signingProfile: profile as any }));
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SigningProfileDetails));
    });

    test('getSigningProfile failure emits getFailure, fetchError and insertWidgetLock', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Detail,
            signingProfileActions.getSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    getSigningProfile: () => throwError(() => err),
                },
            },
            3,
        );

        expect(emitted[0].type).toBe(signingProfileActions.getSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('listSigningProfileSearchableFields success emits searchableFieldsSuccess', async () => {
        const fields = [{ searchGroupEnum: 'g-1' }];
        const emitted = await runEpic(
            SigningProfilesEpicIndex.SearchableFields,
            signingProfileActions.listSigningProfileSearchableFields(),
            {
                signingProfiles: {
                    listSigningProfileSearchableFields: () => of(fields),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSigningProfileSearchableFieldsSuccess({ searchableFields: fields as any }));
    });

    test('listSigningProfileSearchableFields failure emits searchableFieldsFailure', async () => {
        const err = new Error('failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.SearchableFields,
            signingProfileActions.listSigningProfileSearchableFields(),
            {
                signingProfiles: {
                    listSigningProfileSearchableFields: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSigningProfileSearchableFieldsFailure.type);
    });

    test('createSigningProfile success emits createSuccess and redirect', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Create,
            signingProfileActions.createSigningProfile({ signingProfileRequestDto: {} as any }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.createSigningProfileSuccess.type);
        expect(emitted[1].type).toBe(appRedirectActions.redirect.type);
    });

    test('createSigningProfile failure emits createFailure and fetchError', async () => {
        const err = new Error('create failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Create,
            signingProfileActions.createSigningProfile({ signingProfileRequestDto: {} as any }),
            {
                signingProfiles: {
                    createSigningProfile: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.createSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('updateSigningProfile success emits updateSuccess and redirect', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Update,
            signingProfileActions.updateSigningProfile({ uuid: 'p-1', signingProfileRequestDto: {} as any }),
            {},
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.updateSigningProfileSuccess.type);
        expect(emitted[1].type).toBe(appRedirectActions.redirect.type);
    });

    test('updateSigningProfile failure emits updateFailure and fetchError', async () => {
        const err = new Error('update failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Update,
            signingProfileActions.updateSigningProfile({ uuid: 'p-1', signingProfileRequestDto: {} as any }),
            {
                signingProfiles: {
                    updateSigningProfile: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.updateSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('deleteSigningProfile success emits deleteSuccess and redirect', async () => {
        const emitted = await runEpic(SigningProfilesEpicIndex.Delete, signingProfileActions.deleteSigningProfile({ uuid: 'p-1' }), {}, 2);

        expect(emitted[0]).toEqual(signingProfileActions.deleteSigningProfileSuccess({ uuid: 'p-1' }));
        expect(emitted[1].type).toBe(appRedirectActions.redirect.type);
    });

    test('deleteSigningProfile failure emits deleteFailure and fetchError', async () => {
        const err = new Error('delete failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Delete,
            signingProfileActions.deleteSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    deleteSigningProfile: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.deleteSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('enableSigningProfile success emits enableSuccess', async () => {
        const emitted = await runEpic(SigningProfilesEpicIndex.Enable, signingProfileActions.enableSigningProfile({ uuid: 'p-1' }), {}, 1);

        expect(emitted[0]).toEqual(signingProfileActions.enableSigningProfileSuccess({ uuid: 'p-1' }));
    });

    test('enableSigningProfile failure emits enableFailure and fetchError', async () => {
        const err = new Error('enable failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Enable,
            signingProfileActions.enableSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    enableSigningProfile: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.enableSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('disableSigningProfile success emits disableSuccess', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Disable,
            signingProfileActions.disableSigningProfile({ uuid: 'p-1' }),
            {},
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.disableSigningProfileSuccess({ uuid: 'p-1' }));
    });

    test('disableSigningProfile failure emits disableFailure and fetchError', async () => {
        const err = new Error('disable failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.Disable,
            signingProfileActions.disableSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    disableSigningProfile: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.disableSigningProfileFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('bulkDeleteSigningProfiles success (page unchanged) emits success, alert and a re-fetch without setPagination', async () => {
        // On page 1 with 5 items, deleting 2 still leaves page 1 populated, so the page does not
        // shift and no setPagination is dispatched — only the re-fetch of the current page.
        const state = {
            pagings: {
                pagings: [
                    {
                        entity: EntityType.SIGNING_PROFILE,
                        paging: { pageNumber: 1, pageSize: 10, totalItems: 5, checkedRows: [], isFetchingList: false },
                    },
                ],
            },
            filters: {
                filters: [{ entity: EntityType.SIGNING_PROFILE, filter: { currentFilters: [] } }],
            },
        };

        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDelete,
            signingProfileActions.bulkDeleteSigningProfiles({ uuids: ['p-1', 'p-2'] }),
            {},
            3,
            state,
        );

        expect(emitted[0]).toEqual(signingProfileActions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1', 'p-2'], errors: [] }));
        expect(emitted[1].type).toBe(alertActions.success.type);
        expect(emitted[2]).toEqual(signingProfileActions.listSigningProfiles({ pageNumber: 1, itemsPerPage: 10, filters: [] }));
        expect(emitted.some((a: any) => a.type === pagingActions.setPagination.type)).toBe(false);
    });

    test('bulkDeleteSigningProfiles success steps back to last valid page when current page becomes empty', async () => {
        // 10 items total, pageSize 5, user on page 2 (items 6–10). Deleting all 5 leaves 5 total →
        // only page 1 exists. safePage = min(2, ceil(5/5)=1) = 1, so it steps back and re-fetches page 1.
        const state = {
            pagings: {
                pagings: [
                    {
                        entity: EntityType.SIGNING_PROFILE,
                        paging: { pageNumber: 2, pageSize: 5, totalItems: 10, checkedRows: [], isFetchingList: false },
                    },
                ],
            },
            filters: {
                filters: [{ entity: EntityType.SIGNING_PROFILE, filter: { currentFilters: [] } }],
            },
        };

        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDelete,
            signingProfileActions.bulkDeleteSigningProfiles({ uuids: ['p1', 'p2', 'p3', 'p4', 'p5'] }),
            {},
            4,
            state,
        );

        expect(emitted[2]).toEqual(pagingActions.setPagination({ entity: EntityType.SIGNING_PROFILE, pageNumber: 1, pageSize: 5 }));
        expect(emitted[3]).toEqual(signingProfileActions.listSigningProfiles({ pageNumber: 1, itemsPerPage: 5, filters: [] }));
    });

    test('bulkDeleteSigningProfiles with partial errors re-fetches the list without a success alert', async () => {
        // p-1 fails, p-2 is deleted server-side. The reducers no longer splice locally, so the
        // deleted row must be removed by a re-fetch — but with no success alert.
        const errors = [{ uuid: 'p-1', name: 'p-1', message: 'In use' }] as any;
        const state = {
            pagings: {
                pagings: [
                    {
                        entity: EntityType.SIGNING_PROFILE,
                        paging: { pageNumber: 1, pageSize: 10, totalItems: 5, checkedRows: [], isFetchingList: false },
                    },
                ],
            },
            filters: { filters: [{ entity: EntityType.SIGNING_PROFILE, filter: { currentFilters: [] } }] },
        };

        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDelete,
            signingProfileActions.bulkDeleteSigningProfiles({ uuids: ['p-1', 'p-2'] }),
            { signingProfiles: { bulkDeleteSigningProfiles: () => of(errors) } },
            4,
            state,
        );

        expect(emitted[0]).toEqual(signingProfileActions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1', 'p-2'], errors }));
        expect(emitted.some((a: any) => a.type === signingProfileActions.listSigningProfiles.type)).toBe(true);
        expect(emitted.some((a: any) => a.type === alertActions.success.type)).toBe(false);
        expect(emitted.some((a: any) => a.type === pagingActions.setPagination.type)).toBe(false);
    });

    test('bulkDeleteSigningProfiles with all items failing emits only success (no alert, no re-fetch)', async () => {
        // Every uuid errored → nothing was deleted, so there is nothing to re-fetch or re-page.
        const errors = [
            { uuid: 'p-1', name: 'p-1', message: 'In use' },
            { uuid: 'p-2', name: 'p-2', message: 'In use' },
        ] as any;

        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDelete,
            signingProfileActions.bulkDeleteSigningProfiles({ uuids: ['p-1', 'p-2'] }),
            { signingProfiles: { bulkDeleteSigningProfiles: () => of(errors) } },
            4,
        );

        expect(emitted).toEqual([signingProfileActions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1', 'p-2'], errors })]);
    });

    test('bulkDeleteSigningProfiles failure emits bulkDeleteFailure and fetchError', async () => {
        const err = new Error('bulk delete failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDelete,
            signingProfileActions.bulkDeleteSigningProfiles({ uuids: ['p-1'] }),
            {
                signingProfiles: {
                    bulkDeleteSigningProfiles: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.bulkDeleteSigningProfilesFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('bulkEnableSigningProfiles success emits bulkEnableSuccess', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkEnable,
            signingProfileActions.bulkEnableSigningProfiles({ uuids: ['p-1', 'p-2'] }),
            {},
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.bulkEnableSigningProfilesSuccess({ uuids: ['p-1', 'p-2'] }));
    });

    test('bulkEnableSigningProfiles failure emits bulkEnableFailure and fetchError', async () => {
        const err = new Error('bulk enable failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkEnable,
            signingProfileActions.bulkEnableSigningProfiles({ uuids: ['p-1'] }),
            {
                signingProfiles: {
                    bulkEnableSigningProfiles: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.bulkEnableSigningProfilesFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('bulkDisableSigningProfiles success emits bulkDisableSuccess', async () => {
        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDisable,
            signingProfileActions.bulkDisableSigningProfiles({ uuids: ['p-1', 'p-2'] }),
            {},
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.bulkDisableSigningProfilesSuccess({ uuids: ['p-1', 'p-2'] }));
    });

    test('bulkDisableSigningProfiles failure emits bulkDisableFailure and fetchError', async () => {
        const err = new Error('bulk disable failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.BulkDisable,
            signingProfileActions.bulkDisableSigningProfiles({ uuids: ['p-1'] }),
            {
                signingProfiles: {
                    bulkDisableSigningProfiles: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.bulkDisableSigningProfilesFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('activateTsp success emits activateTspSuccess', async () => {
        const details = { uuid: 'tsp-1' };
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ActivateTsp,
            signingProfileActions.activateTsp({ signingProfileUuid: 'p-1', tspProfileUuid: 'tsp-1' }),
            {
                signingProfiles: {
                    activateTsp: () => of(details),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.activateTspSuccess({ tspActivationDetails: details as any }));
    });

    test('activateTsp failure emits activateTspFailure and fetchError', async () => {
        const err = new Error('activate TSP failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ActivateTsp,
            signingProfileActions.activateTsp({ signingProfileUuid: 'p-1', tspProfileUuid: 'tsp-1' }),
            {
                signingProfiles: {
                    activateTsp: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.activateTspFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to activate TSP' }));
    });

    test('deactivateTsp success emits deactivateTspSuccess', async () => {
        const emitted = await runEpic(SigningProfilesEpicIndex.DeactivateTsp, signingProfileActions.deactivateTsp({ uuid: 'p-1' }), {}, 1);

        expect(emitted[0]).toEqual(signingProfileActions.deactivateTspSuccess({ uuid: 'p-1' }));
    });

    test('deactivateTsp failure emits deactivateTspFailure and fetchError', async () => {
        const err = new Error('deactivate TSP failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.DeactivateTsp,
            signingProfileActions.deactivateTsp({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    deactivateTsp: () => throwError(() => err),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(signingProfileActions.deactivateTspFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('getTspActivationDetails success emits getTspDetailsSuccess', async () => {
        const details = { uuid: 'tsp-1' };
        const emitted = await runEpic(
            SigningProfilesEpicIndex.GetTspActivationDetails,
            signingProfileActions.getTspActivationDetails({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    getTspActivationDetails: () => of(details),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.getTspActivationDetailsSuccess({ tspActivationDetails: details as any }));
    });

    test('getTspActivationDetails failure emits getTspDetailsFailure', async () => {
        const err = new Error('tsp details failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.GetTspActivationDetails,
            signingProfileActions.getTspActivationDetails({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    getTspActivationDetails: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.getTspActivationDetailsFailure.type);
    });

    test('listSupportedProtocols success emits listSupportedProtocolsSuccess', async () => {
        const protocols = ['tsp'];
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSupportedProtocols,
            signingProfileActions.listSupportedProtocols({ workflowType: SigningWorkflowType.Timestamping }),
            {
                signingProfiles: {
                    listSupportedProtocols: () => of(protocols),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSupportedProtocolsSuccess({ supportedProtocols: protocols as any }));
    });

    test('listSupportedProtocols forwards workflowType as signingWorkflowType to API', async () => {
        let capturedArgs: any;
        await runEpic(
            SigningProfilesEpicIndex.ListSupportedProtocols,
            signingProfileActions.listSupportedProtocols({ workflowType: SigningWorkflowType.Timestamping }),
            {
                signingProfiles: {
                    listSupportedProtocols: (args: any) => {
                        capturedArgs = args;
                        return of(['tsp']);
                    },
                },
            },
            1,
        );

        expect(capturedArgs).toEqual({ signingWorkflowType: SigningWorkflowType.Timestamping });
    });

    test('listSupportedProtocols failure emits listSupportedProtocolsFailure', async () => {
        const err = new Error('protocols failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSupportedProtocols,
            signingProfileActions.listSupportedProtocols({ workflowType: SigningWorkflowType.Timestamping }),
            {
                signingProfiles: {
                    listSupportedProtocols: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSupportedProtocolsFailure.type);
    });

    test('listSigningCertificates success emits listSigningCertificatesSuccess', async () => {
        const certs = [{ uuid: 'c-1' }];
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSigningCertificates,
            signingProfileActions.listSigningCertificates({ workflowType: SigningWorkflowType.Timestamping }),
            {
                signingProfiles: {
                    listSigningCertificates: () => of(certs),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSigningCertificatesSuccess({ signingCertificates: certs as any }));
    });

    test('listSigningCertificates failure emits listSigningCertificatesFailure', async () => {
        const err = new Error('certs failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSigningCertificates,
            signingProfileActions.listSigningCertificates({ workflowType: SigningWorkflowType.Timestamping }),
            {
                signingProfiles: {
                    listSigningCertificates: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSigningCertificatesFailure.type);
    });

    test('listSigningCertificates forwards workflowType and qualifiedTimestamp to API', async () => {
        const certs = [{ uuid: 'c-2' }];
        let capturedArgs: any;
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSigningCertificates,
            signingProfileActions.listSigningCertificates({ workflowType: SigningWorkflowType.Timestamping, qualifiedTimestamp: true }),
            {
                signingProfiles: {
                    listSigningCertificates: (args: any) => {
                        capturedArgs = args;
                        return of(certs);
                    },
                },
            },
            1,
        );

        expect(capturedArgs).toEqual({ signingWorkflowType: SigningWorkflowType.Timestamping, qualifiedTimestamp: true });
        expect(emitted[0]).toEqual(signingProfileActions.listSigningCertificatesSuccess({ signingCertificates: certs as any }));
    });

    test('listSignatureAttributesForCertificate success emits success action', async () => {
        const descriptors = [{ uuid: 'a-1' }];
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureAttributes,
            signingProfileActions.listSignatureAttributesForCertificate({ certificateUuid: 'c-1' }),
            {
                signingProfiles: {
                    listSignatureAttributesForCertificate: () => of(descriptors),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(
            signingProfileActions.listSignatureAttributesForCertificateSuccess({ attributeDescriptors: descriptors as any }),
        );
    });

    test('listSignatureAttributesForCertificate failure emits failure action', async () => {
        const err = new Error('attrs failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureAttributes,
            signingProfileActions.listSignatureAttributesForCertificate({ certificateUuid: 'c-1' }),
            {
                signingProfiles: {
                    listSignatureAttributesForCertificate: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSignatureAttributesForCertificateFailure.type);
    });

    test('listSignatureFormattingConnectorAttributes merges saved content from timestamping workflow', async () => {
        const descriptors = [{ uuid: 'a-1' }, { uuid: 'a-2' }];
        const state = {
            signingProfiles: {
                signingProfile: {
                    uuid: 'p-1',
                    workflow: {
                        type: SigningWorkflowType.Timestamping,
                        signatureFormattingConnectorAttributes: [{ uuid: 'a-1', content: [{ data: 'saved' }] }],
                    },
                },
            },
        };

        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectorAttributes,
            signingProfileActions.listSignatureFormattingConnectorAttributes({ connectorUuid: 'cn-1' }),
            {
                signingProfiles: {
                    listSignatureFormattingConnectorAttributes: () => of(descriptors),
                },
            },
            1,
            state,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSignatureFormattingConnectorAttributesSuccess.type);
        const merged = (emitted[0] as any).payload.attributeDescriptors;
        expect(merged[0]).toEqual({ uuid: 'a-1', content: [{ data: 'saved' }] });
        expect(merged[1]).toEqual({ uuid: 'a-2' });
    });

    test('listSignatureFormattingConnectorAttributes leaves descriptors unchanged without a saved profile', async () => {
        const descriptors = [{ uuid: 'a-1' }];
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectorAttributes,
            signingProfileActions.listSignatureFormattingConnectorAttributes({ connectorUuid: 'cn-1' }),
            {
                signingProfiles: {
                    listSignatureFormattingConnectorAttributes: () => of(descriptors),
                },
            },
            1,
        );

        expect((emitted[0] as any).payload.attributeDescriptors).toEqual(descriptors);
    });

    test('listSignatureFormattingConnectorAttributes failure emits failure action', async () => {
        const err = new Error('formatter attrs failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectorAttributes,
            signingProfileActions.listSignatureFormattingConnectorAttributes({ connectorUuid: 'cn-1' }),
            {
                signingProfiles: {
                    listSignatureFormattingConnectorAttributes: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSignatureFormattingConnectorAttributesFailure.type);
    });

    test('listSignatureFormattingConnectors success applies feature filter for timestamping', async () => {
        let capturedArgs: any;
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectors,
            signingProfileActions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.Timestamping }),
            {
                connectorsV2: {
                    listConnectorsV2: (args: any) => {
                        capturedArgs = args;
                        return of({ items: [] });
                    },
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSignatureFormattingConnectorsSuccess({ connectors: [] }));
        const filters = capturedArgs.searchRequestDto.filters;
        expect(filters.some((f: any) => f.fieldIdentifier === 'CONNECTOR_FEATURES' && f.value === 'timestamping')).toBe(true);
        expect(filters.some((f: any) => f.fieldIdentifier === 'CONNECTOR_INTERFACE')).toBe(true);
    });

    test('listSignatureFormattingConnectors omits feature filter for unmapped workflow', async () => {
        let capturedArgs: any;
        await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectors,
            signingProfileActions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.RawSigning }),
            {
                connectorsV2: {
                    listConnectorsV2: (args: any) => {
                        capturedArgs = args;
                        return of({ items: [] });
                    },
                },
            },
            1,
        );

        const filters = capturedArgs.searchRequestDto.filters;
        expect(filters.some((f: any) => f.fieldIdentifier === 'CONNECTOR_FEATURES')).toBe(false);
        expect(filters.some((f: any) => f.fieldIdentifier === 'CONNECTOR_INTERFACE')).toBe(true);
    });

    test('listSignatureFormattingConnectors failure emits failure action', async () => {
        const err = new Error('connectors failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSignatureFormattingConnectors,
            signingProfileActions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.Timestamping }),
            {
                connectorsV2: {
                    listConnectorsV2: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSignatureFormattingConnectorsFailure.type);
    });

    test('listSigningRecordsForSigningProfile success emits listSigningRecordsSuccess', async () => {
        const response = { items: [{ uuid: 'ds-1' }], totalItems: 1 };
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSigningRecords,
            signingProfileActions.listSigningRecordsForSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    listSigningRecordsForSigningProfile: () => of(response),
                },
            },
            1,
        );

        expect(emitted[0]).toEqual(signingProfileActions.listSigningRecordsForSigningProfileSuccess({ signingRecords: response as any }));
    });

    test('listSigningRecordsForSigningProfile failure emits listSigningRecordsFailure', async () => {
        const err = new Error('signing records failed');
        const emitted = await runEpic(
            SigningProfilesEpicIndex.ListSigningRecords,
            signingProfileActions.listSigningRecordsForSigningProfile({ uuid: 'p-1' }),
            {
                signingProfiles: {
                    listSigningRecordsForSigningProfile: () => throwError(() => err),
                },
            },
            1,
        );

        expect(emitted[0].type).toBe(signingProfileActions.listSigningRecordsForSigningProfileFailure.type);
    });
});
