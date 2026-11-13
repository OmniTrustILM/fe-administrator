import { describe, expect, test } from 'vitest';

import { Resource } from 'types/openapi';
import { actions as customAttributesActions } from './customAttributes';
import reducer, { actions, initialState, selectors } from './est-profiles';

describe('estProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            estProfile: { uuid: 'cp-1' } as any,
            estProfiles: [{ uuid: 'cp-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['cp-1', 'cp-2'] }));
        expect(next.checkedRows).toEqual(['cp-1', 'cp-2']);
    });

    test('clearDeleteErrorMessages', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ uuid: 'cp-1' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('resetEstProfile clears estProfile', () => {
        const next = reducer({ ...initialState, estProfile: { uuid: 'cp-1' } as any }, actions.resetEstProfile());
        expect(next.estProfile).toBeUndefined();
    });

    test('listEstProfiles / success / failure', () => {
        let next = reducer(initialState, actions.listEstProfiles());
        expect(next.isFetchingList).toBe(true);

        const items = [{ uuid: 'cp-1' }, { uuid: 'cp-2' }] as any[];
        next = reducer(next, actions.listEstProfilesSuccess({ estProfileList: items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.estProfiles).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.listEstProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getEstProfile / success / failure', () => {
        let next = reducer(initialState, actions.getEstProfile({ uuid: 'cp-1' }));
        expect(next.isFetchingDetail).toBe(true);

        const profile = { uuid: 'cp-1', name: 'Profile 1' } as any;
        next = reducer(next, actions.getEstProfileSuccess({ estProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.estProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getEstProfileFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createEstProfile / success / failure', () => {
        let next = reducer(initialState, actions.createEstProfile({ name: 'P1' } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createEstProfileSucceeded).toBe(false);

        next = reducer(next, actions.createEstProfileSuccess());
        expect(next.isCreating).toBe(false);
        expect(next.createEstProfileSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createEstProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createEstProfileSucceeded).toBe(false);
    });

    test('updateEstProfile / success / failure', () => {
        let next = reducer(initialState, actions.updateEstProfile({ uuid: 'cp-1', updateEstRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateEstProfileSucceeded).toBe(false);

        const profile = { uuid: 'cp-1', name: 'Updated' } as any;
        next = reducer(next, actions.updateEstProfileSuccess({ estProfile: profile }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateEstProfileSucceeded).toBe(true);

        next = reducer({ ...next, isUpdating: true }, actions.updateEstProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateEstProfileSucceeded).toBe(false);
    });

    test('updateEstProfileRaProfile / success / failure', () => {
        let next = reducer(initialState, actions.updateEstProfileRaProfile({ uuid: 'cp-1', raProfileUuid: 'ra-1' }));
        expect(next.isUpdatingRaProfile).toBe(true);

        next = reducer(next, actions.updateEstProfileRaProfileSuccess({ uuid: 'cp-1', raProfileUuid: 'ra-1' }));
        expect(next.isUpdatingRaProfile).toBe(false);

        next = reducer({ ...next, isUpdatingRaProfile: true }, actions.updateEstProfileRaProfileFailure({ error: 'err' }));
        expect(next.isUpdatingRaProfile).toBe(false);
    });

    test('deleteEstProfile / success removes from list and clears detail / failure sets error', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];
        const profile = { uuid: 'cp-1', name: 'P1' } as any;

        let next = reducer({ ...initialState, estProfiles: items, estProfile: profile }, actions.deleteEstProfile({ uuid: 'cp-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteEstProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.estProfiles).toEqual([{ uuid: 'cp-2' }]);
        expect(next.estProfile).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteEstProfileFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('enableEstProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: false } as any];
        const profile = { uuid: 'cp-1', enabled: false } as any;

        let next = reducer({ ...initialState, estProfiles: items, estProfile: profile }, actions.enableEstProfile({ uuid: 'cp-1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableEstProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.estProfiles[0].enabled).toBe(true);
        expect(next.estProfile?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableEstProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableEstProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: true } as any];
        const profile = { uuid: 'cp-1', enabled: true } as any;

        let next = reducer({ ...initialState, estProfiles: items, estProfile: profile }, actions.disableEstProfile({ uuid: 'cp-1' }));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableEstProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.estProfiles[0].enabled).toBe(false);
        expect(next.estProfile?.enabled).toBe(false);

        next = reducer({ ...next, isDisabling: true }, actions.disableEstProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('bulkDeleteEstProfiles / success with errors stores errors / success without errors removes items / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, estProfiles: items }, actions.bulkDeleteEstProfiles({ uuids: ['cp-1', 'cp-2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        const errors = [{ uuid: 'cp-1', message: 'In use' }] as any[];
        next = reducer(next, actions.bulkDeleteEstProfilesSuccess({ uuids: ['cp-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.estProfiles).toEqual(items);

        next = reducer({ ...initialState, estProfiles: items }, actions.bulkDeleteEstProfilesSuccess({ uuids: ['cp-1'], errors: [] }));
        expect(next.estProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteEstProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteEstProfiles / success removes items / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, estProfiles: items }, actions.bulkForceDeleteEstProfiles({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteEstProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.estProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkForceDeleting: true }, actions.bulkForceDeleteEstProfilesFailure({ error: 'err' }));
        expect(next.isBulkForceDeleting).toBe(false);
    });

    test('bulkEnableEstProfiles / success sets enabled / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: false } as any, { uuid: 'cp-2', enabled: false } as any];
        const profile = { uuid: 'cp-1', enabled: false } as any;

        let next = reducer(
            { ...initialState, estProfiles: items, estProfile: profile },
            actions.bulkEnableEstProfiles({ uuids: ['cp-1'] }),
        );
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableEstProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.estProfiles[0].enabled).toBe(true);
        expect(next.estProfiles[1].enabled).toBe(false);
        expect(next.estProfile?.enabled).toBe(true);

        next = reducer({ ...next, isBulkEnabling: true }, actions.bulkEnableEstProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableEstProfiles / success sets disabled / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: true } as any, { uuid: 'cp-2', enabled: true } as any];
        const profile = { uuid: 'cp-1', enabled: true } as any;

        let next = reducer(
            { ...initialState, estProfiles: items, estProfile: profile },
            actions.bulkDisableEstProfiles({ uuids: ['cp-1'] }),
        );
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableEstProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.estProfiles[0].enabled).toBe(false);
        expect(next.estProfiles[1].enabled).toBe(true);
        expect(next.estProfile?.enabled).toBe(false);

        next = reducer({ ...next, isBulkDisabling: true }, actions.bulkDisableEstProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });

    test('syncs loaded profile custom attributes on remove/update content success', () => {
        const withDetail = {
            ...initialState,
            estProfile: { uuid: 'cp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const afterRemove = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.EstProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [],
            }),
        );
        expect(afterRemove.estProfile?.customAttributes).toHaveLength(0);

        const afterUpdate = reducer(
            withDetail,
            customAttributesActions.updateCustomAttributeContentSuccess({
                resource: Resource.EstProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [{ uuid: 'ca-2', name: 'bar' }] as any,
            }),
        );
        expect(afterUpdate.estProfile?.customAttributes?.[0]?.uuid).toBe('ca-2');
    });

    test('does not touch profile custom attributes for a different resource or uuid', () => {
        const withDetail = {
            ...initialState,
            estProfile: { uuid: 'cp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const otherUuid = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.EstProfiles,
                resourceUuid: 'cp-other',
                customAttributes: [],
            }),
        );
        expect(otherUuid.estProfile?.customAttributes).toHaveLength(1);

        const otherResource = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.ScepProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [],
            }),
        );
        expect(otherResource.estProfile?.customAttributes).toHaveLength(1);
    });
});

describe('estProfiles selectors', () => {
    test('selectors read values from estProfiles state', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;
        const featureState = {
            ...initialState,
            estProfile: profile,
            estProfiles: [profile],
            checkedRows: ['cp-1'],
            deleteErrorMessage: 'err',
            bulkDeleteErrorMessages: [{ uuid: 'cp-1' }] as any[],
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createEstProfileSucceeded: true,
            isDeleting: true,
            isUpdating: true,
            updateEstProfileSucceeded: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isUpdatingRaProfile: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
            isBulkForceDeleting: true,
        };

        const state = { estProfiles: featureState } as any;

        expect(selectors.estProfile(state)).toEqual(profile);
        expect(selectors.estProfiles(state)).toEqual([profile]);
        expect(selectors.checkedRows(state)).toEqual(['cp-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('err');
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createEstProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateEstProfileSucceeded(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isUpdatingRaProfile(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
    });
});
