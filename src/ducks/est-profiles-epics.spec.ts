import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';

import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions } from './est-profiles';
import epics from './est-profiles-epics';
import { actions as userInterfaceActions } from './user-interface';

type Epic = (action$: any, state$: any, deps: any) => any;

async function run(epicName: string, action: UnknownAction, client: Record<string, unknown>, count = 5): Promise<UnknownAction[]> {
    const epic = (epics as (Epic & { name: string })[]).find((candidate) => candidate.name === epicName);
    if (!epic) throw new Error(`Epic "${epicName}" not found`);
    return firstValueFrom(epic(of(action), of({}), { apiClients: { estProfiles: client } }).pipe(take(count), toArray())) as Promise<
        UnknownAction[]
    >;
}

const apiError = () => ({ status: 500, response: { message: 'boom' } });
const detailDto = { uuid: 'est-1', name: 'EST', issueCertificateAttributes: [] };

function types(emitted: UnknownAction[]) {
    return emitted.map((a) => a.type);
}

describe('est-profiles epics', () => {
    test('listEstProfiles emits success and removes the widget lock', async () => {
        const emitted = await run('listEstProfiles', actions.listEstProfiles(), { listEstProfiles: () => of([{ uuid: 'est-1' }]) }, 2);
        expect(types(emitted)).toEqual([actions.listEstProfilesSuccess.type, userInterfaceActions.removeWidgetLock.type]);
        expect(emitted[0]).toMatchObject({ payload: { estProfileList: [{ uuid: 'est-1' }] } });
    });

    test('listEstProfiles emits failure and inserts the widget lock', async () => {
        const emitted = await run('listEstProfiles', actions.listEstProfiles(), { listEstProfiles: () => throwError(apiError) }, 2);
        expect(types(emitted)).toEqual([actions.listEstProfilesFailure.type, userInterfaceActions.insertWidgetLock.type]);
        expect(emitted[0]).toMatchObject({ payload: { error: expect.stringContaining('Failed to get EST Profiles list') } });
    });

    test('getEstProfile emits success and removes the widget lock', async () => {
        const getEstProfile = vi.fn(() => of(detailDto));
        const emitted = await run('getEstProfile', actions.getEstProfile({ uuid: 'est-1' }), { getEstProfile }, 2);
        expect(getEstProfile).toHaveBeenCalledWith({ uuid: 'est-1' });
        expect(types(emitted)).toEqual([actions.getEstProfileSuccess.type, userInterfaceActions.removeWidgetLock.type]);
    });

    test('getEstProfile emits failure, an error redirect and a widget lock', async () => {
        const emitted = await run(
            'getEstProfile',
            actions.getEstProfile({ uuid: 'est-1' }),
            { getEstProfile: () => throwError(apiError) },
            3,
        );
        expect(types(emitted)).toEqual([
            actions.getEstProfileFailure.type,
            appRedirectActions.fetchError.type,
            userInterfaceActions.insertWidgetLock.type,
        ]);
    });

    test('createEstProfile transforms the request, emits success and redirects to the detail', async () => {
        const createEstProfile = vi.fn(() => of({ uuid: 'est-9' }));
        const emitted = await run(
            'createEstProfile',
            actions.createEstProfile({ name: 'EST', authenticationPolicy: 'NONE' } as any),
            { createEstProfile },
            2,
        );
        expect(createEstProfile).toHaveBeenCalledWith({ estProfileRequestDto: expect.objectContaining({ name: 'EST' }) });
        expect(types(emitted)).toEqual([actions.createEstProfileSuccess.type, appRedirectActions.redirect.type]);
        expect(emitted[1]).toMatchObject({ payload: { url: '../estprofiles/detail/est-9' } });
    });

    test('createEstProfile emits failure and an error redirect', async () => {
        const emitted = await run(
            'createEstProfile',
            actions.createEstProfile({ name: 'EST' } as any),
            { createEstProfile: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.createEstProfileFailure.type, appRedirectActions.fetchError.type]);
        expect(emitted[0]).toMatchObject({ payload: { error: expect.stringContaining('Failed to create EST Profile') } });
    });

    test('updateEstProfile transforms the request, emits success and redirects to the detail', async () => {
        const updateEstProfile = vi.fn(() => of(detailDto));
        const emitted = await run(
            'updateEstProfile',
            actions.updateEstProfile({ uuid: 'est-1', updateEstRequest: { allowRenewal: true } as any }),
            { updateEstProfile },
            2,
        );
        expect(updateEstProfile).toHaveBeenCalledWith({
            uuid: 'est-1',
            estProfileEditRequestDto: expect.objectContaining({ allowRenewal: true }),
        });
        expect(types(emitted)).toEqual([actions.updateEstProfileSuccess.type, appRedirectActions.redirect.type]);
        expect(emitted[1]).toMatchObject({ payload: { url: '../../estprofiles/detail/est-1' } });
    });

    test('updateEstProfile emits failure and an error redirect', async () => {
        const emitted = await run(
            'updateEstProfile',
            actions.updateEstProfile({ uuid: 'est-1', updateEstRequest: {} as any }),
            { updateEstProfile: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.updateEstProfileFailure.type, appRedirectActions.fetchError.type]);
        expect(emitted[0]).toMatchObject({ payload: { error: expect.stringContaining('Failed to update EST Profile') } });
    });

    test('updateEstProfileRaProfile emits success and refreshes the detail', async () => {
        const updateEstProfileRaProfile = vi.fn(() => of(undefined));
        const emitted = await run(
            'updateEstProfileRaProfile',
            actions.updateEstProfileRaProfile({ uuid: 'est-1', raProfileUuid: 'ra-1' }),
            { updateEstProfileRaProfile },
            2,
        );
        expect(updateEstProfileRaProfile).toHaveBeenCalledWith({ uuid: 'est-1', raProfileUuid: 'ra-1' });
        expect(emitted).toEqual([
            actions.updateEstProfileRaProfileSuccess({ uuid: 'est-1', raProfileUuid: 'ra-1' }),
            actions.getEstProfile({ uuid: 'est-1' }),
        ]);
    });

    test('updateEstProfileRaProfile emits failure and an error redirect', async () => {
        const emitted = await run(
            'updateEstProfileRaProfile',
            actions.updateEstProfileRaProfile({ uuid: 'est-1', raProfileUuid: 'ra-1' }),
            { updateEstProfileRaProfile: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.updateEstProfileRaProfileFailure.type, appRedirectActions.fetchError.type]);
    });

    test('deleteEstProfile emits success and redirects to the list', async () => {
        const emitted = await run(
            'deleteEstProfile',
            actions.deleteEstProfile({ uuid: 'est-1' }),
            { deleteEstProfile: () => of(undefined) },
            2,
        );
        expect(types(emitted)).toEqual([actions.deleteEstProfileSuccess.type, appRedirectActions.redirect.type]);
        expect(emitted[1]).toMatchObject({ payload: { url: '../../estprofiles' } });
    });

    test('deleteEstProfile emits failure and an error redirect', async () => {
        const emitted = await run(
            'deleteEstProfile',
            actions.deleteEstProfile({ uuid: 'est-1' }),
            { deleteEstProfile: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.deleteEstProfileFailure.type, appRedirectActions.fetchError.type]);
        expect(emitted[0]).toMatchObject({ payload: { error: expect.stringContaining('Failed to delete EST Profile') } });
    });

    test.each([
        [
            'enableEstProfile',
            actions.enableEstProfile,
            actions.enableEstProfileSuccess,
            actions.enableEstProfileFailure,
            'Failed to enable EST Profile',
        ],
        [
            'disableEstProfile',
            actions.disableEstProfile,
            actions.disableEstProfileSuccess,
            actions.disableEstProfileFailure,
            'Failed to disable EST Profile',
        ],
    ])('%s emits success and failure', async (name, action, success, failure, message) => {
        const ok = await run(name, action({ uuid: 'est-1' }), { [name]: () => of(undefined) }, 1);
        expect(ok).toEqual([success({ uuid: 'est-1' })]);

        const failed = await run(name, action({ uuid: 'est-1' }), { [name]: () => throwError(apiError) }, 2);
        expect(types(failed)).toEqual([failure.type, appRedirectActions.fetchError.type]);
        expect(failed[0]).toMatchObject({ payload: { error: expect.stringContaining(message) } });
    });

    test('bulkDeleteEstProfiles emits success carrying the per-item errors', async () => {
        const errors = [{ uuid: 'est-2', message: 'in use' }];
        const bulkDeleteEstProfiles = vi.fn(() => of(errors));
        const emitted = await run(
            'bulkDeleteEstProfiles',
            actions.bulkDeleteEstProfiles({ uuids: ['est-1', 'est-2'] }),
            { bulkDeleteEstProfiles },
            1,
        );
        expect(bulkDeleteEstProfiles).toHaveBeenCalledWith({ requestBody: ['est-1', 'est-2'] });
        expect(emitted).toEqual([actions.bulkDeleteEstProfilesSuccess({ uuids: ['est-1', 'est-2'], errors } as any)]);
    });

    test('bulkDeleteEstProfiles emits failure and an error redirect', async () => {
        const emitted = await run(
            'bulkDeleteEstProfiles',
            actions.bulkDeleteEstProfiles({ uuids: ['est-1'] }),
            { bulkDeleteEstProfiles: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.bulkDeleteEstProfilesFailure.type, appRedirectActions.fetchError.type]);
    });

    test('bulkForceDeleteEstProfiles redirects when a redirect is given', async () => {
        const forceDeleteEstProfiles = vi.fn(() => of(undefined));
        const emitted = await run(
            'bulkForceDeleteEstProfiles',
            actions.bulkForceDeleteEstProfiles({ uuids: ['est-1'], redirect: '../../estprofiles' }),
            { forceDeleteEstProfiles },
            2,
        );
        expect(forceDeleteEstProfiles).toHaveBeenCalledWith({ requestBody: ['est-1'] });
        expect(types(emitted)).toEqual([actions.bulkForceDeleteEstProfilesSuccess.type, appRedirectActions.redirect.type]);
    });

    test('bulkForceDeleteEstProfiles does not redirect without a redirect', async () => {
        const emitted = await run(
            'bulkForceDeleteEstProfiles',
            actions.bulkForceDeleteEstProfiles({ uuids: ['est-1'] }),
            { forceDeleteEstProfiles: () => of(undefined) },
            1,
        );
        expect(emitted).toEqual([actions.bulkForceDeleteEstProfilesSuccess({ uuids: ['est-1'] })]);
    });

    test('bulkForceDeleteEstProfiles keeps failed profiles and does not redirect', async () => {
        const emitted = await run(
            'bulkForceDeleteEstProfiles',
            actions.bulkForceDeleteEstProfiles({ uuids: ['est-1', 'est-2'], redirect: '../../estprofiles' }),
            { forceDeleteEstProfiles: () => of([{ uuid: 'est-2', name: 'Two', message: 'in use' }]) },
            2,
        );
        expect(emitted[0]).toEqual(actions.bulkForceDeleteEstProfilesSuccess({ uuids: ['est-1'] }));
        expect(emitted[1].type).toBe(alertActions.error.type);
    });

    test('bulkForceDeleteEstProfiles emits failure and an error redirect', async () => {
        const emitted = await run(
            'bulkForceDeleteEstProfiles',
            actions.bulkForceDeleteEstProfiles({ uuids: ['est-1'] }),
            { forceDeleteEstProfiles: () => throwError(apiError) },
            2,
        );
        expect(types(emitted)).toEqual([actions.bulkForceDeleteEstProfilesFailure.type, appRedirectActions.fetchError.type]);
    });

    test.each([
        [
            'bulkEnableEstProfiles',
            actions.bulkEnableEstProfiles,
            actions.bulkEnableEstProfilesSuccess,
            actions.bulkEnableEstProfilesFailure,
        ],
        [
            'bulkDisableEstProfiles',
            actions.bulkDisableEstProfiles,
            actions.bulkDisableEstProfilesSuccess,
            actions.bulkDisableEstProfilesFailure,
        ],
    ])('%s emits success and failure', async (name, action, success, failure) => {
        const ok = await run(name, action({ uuids: ['est-1'] }), { [name]: () => of(undefined) }, 1);
        expect(ok).toEqual([success({ uuids: ['est-1'] })]);

        const failed = await run(name, action({ uuids: ['est-1'] }), { [name]: () => throwError(apiError) }, 2);
        expect(types(failed)).toEqual([failure.type, appRedirectActions.fetchError.type]);
    });
});
