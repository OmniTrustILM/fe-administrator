import { describe, expect, test } from 'vitest';

import { Resource } from 'types/openapi';
import { actions as customAttributesActions } from './customAttributes';
import reducer, { actions, initialState, selectors } from './cmp-profiles';

describe('cmpProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            cmpProfile: { uuid: 'cp-1' } as any,
            cmpProfiles: [{ uuid: 'cp-1' } as any],
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

    test('resetCmpProfile clears cmpProfile', () => {
        const next = reducer({ ...initialState, cmpProfile: { uuid: 'cp-1' } as any }, actions.resetCmpProfile());
        expect(next.cmpProfile).toBeUndefined();
    });

    test('listCmpProfiles / success / failure', () => {
        let next = reducer(initialState, actions.listCmpProfiles());
        expect(next.isFetchingList).toBe(true);

        const items = [{ uuid: 'cp-1' }, { uuid: 'cp-2' }] as any[];
        next = reducer(next, actions.listCmpProfilesSuccess({ cmpProfileList: items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.cmpProfiles).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.listCmpProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('listCmpSigningCertificates / success / failure', () => {
        let next = reducer(initialState, actions.listCmpSigningCertificates());
        expect(next.isFetchingCertificates).toBe(true);

        const certs = [{ uuid: 'cert-1' }] as any[];
        next = reducer(next, actions.listCmpSigningCertificatesSuccess({ certificates: certs }));
        expect(next.isFetchingCertificates).toBe(false);
        expect(next.cmpSigningCertificates).toEqual(certs);

        next = reducer({ ...next, isFetchingCertificates: true }, actions.listCmpSigningCertificatesFailure({ error: 'err' }));
        expect(next.isFetchingCertificates).toBe(false);
    });

    test('getCmpProfile / success / failure', () => {
        let next = reducer(initialState, actions.getCmpProfile({ uuid: 'cp-1' }));
        expect(next.isFetchingDetail).toBe(true);

        const profile = { uuid: 'cp-1', name: 'Profile 1' } as any;
        next = reducer(next, actions.getCmpProfileSuccess({ cmpProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.cmpProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getCmpProfileFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createCmpProfile / success / failure', () => {
        let next = reducer(initialState, actions.createCmpProfile({ name: 'P1' } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createCmpProfileSucceeded).toBe(false);

        next = reducer(next, actions.createCmpProfileSuccess());
        expect(next.isCreating).toBe(false);
        expect(next.createCmpProfileSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createCmpProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCmpProfileSucceeded).toBe(false);
    });

    test('updateCmpProfile / success / failure', () => {
        let next = reducer(initialState, actions.updateCmpProfile({ uuid: 'cp-1', updateCmpRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateCmpProfileSucceeded).toBe(false);

        const profile = { uuid: 'cp-1', name: 'Updated' } as any;
        next = reducer(next, actions.updateCmpProfileSuccess({ cmpProfile: profile }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCmpProfileSucceeded).toBe(true);

        next = reducer({ ...next, isUpdating: true }, actions.updateCmpProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCmpProfileSucceeded).toBe(false);
    });

    test('deleteCmpProfile / success removes from list and clears detail / failure sets error', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];
        const profile = { uuid: 'cp-1', name: 'P1' } as any;

        let next = reducer({ ...initialState, cmpProfiles: items, cmpProfile: profile }, actions.deleteCmpProfile({ uuid: 'cp-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteCmpProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.cmpProfiles).toEqual([{ uuid: 'cp-2' }]);
        expect(next.cmpProfile).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteCmpProfileFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('enableCmpProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: false } as any];
        const profile = { uuid: 'cp-1', enabled: false } as any;

        let next = reducer({ ...initialState, cmpProfiles: items, cmpProfile: profile }, actions.enableCmpProfile({ uuid: 'cp-1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableCmpProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.cmpProfiles[0].enabled).toBe(true);
        expect(next.cmpProfile?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableCmpProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableCmpProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: true } as any];
        const profile = { uuid: 'cp-1', enabled: true } as any;

        let next = reducer({ ...initialState, cmpProfiles: items, cmpProfile: profile }, actions.disableCmpProfile({ uuid: 'cp-1' }));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableCmpProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.cmpProfiles[0].enabled).toBe(false);
        expect(next.cmpProfile?.enabled).toBe(false);

        next = reducer({ ...next, isDisabling: true }, actions.disableCmpProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('bulkDeleteCmpProfiles / success with errors stores errors / success without errors removes items / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, cmpProfiles: items }, actions.bulkDeleteCmpProfiles({ uuids: ['cp-1', 'cp-2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        // With errors - does not remove items
        const errors = [{ uuid: 'cp-1', message: 'In use' }] as any[];
        next = reducer(next, actions.bulkDeleteCmpProfilesSuccess({ uuids: ['cp-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.cmpProfiles).toEqual(items);

        // Without errors - removes items
        next = reducer({ ...initialState, cmpProfiles: items }, actions.bulkDeleteCmpProfilesSuccess({ uuids: ['cp-1'], errors: [] }));
        expect(next.cmpProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteCmpProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteCmpProfiles / success removes items / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, cmpProfiles: items }, actions.bulkForceDeleteCmpProfiles({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteCmpProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.cmpProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkForceDeleting: true }, actions.bulkForceDeleteCmpProfilesFailure({ error: 'err' }));
        expect(next.isBulkForceDeleting).toBe(false);
    });

    test('bulkEnableCmpProfiles / success sets enabled / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: false } as any, { uuid: 'cp-2', enabled: false } as any];
        const profile = { uuid: 'cp-1', enabled: false } as any;

        let next = reducer(
            { ...initialState, cmpProfiles: items, cmpProfile: profile },
            actions.bulkEnableCmpProfiles({ uuids: ['cp-1'] }),
        );
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableCmpProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.cmpProfiles[0].enabled).toBe(true);
        expect(next.cmpProfiles[1].enabled).toBe(false);
        expect(next.cmpProfile?.enabled).toBe(true);

        next = reducer({ ...next, isBulkEnabling: true }, actions.bulkEnableCmpProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableCmpProfiles / success sets disabled / failure', () => {
        const items = [{ uuid: 'cp-1', enabled: true } as any, { uuid: 'cp-2', enabled: true } as any];
        const profile = { uuid: 'cp-1', enabled: true } as any;

        let next = reducer(
            { ...initialState, cmpProfiles: items, cmpProfile: profile },
            actions.bulkDisableCmpProfiles({ uuids: ['cp-1'] }),
        );
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableCmpProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.cmpProfiles[0].enabled).toBe(false);
        expect(next.cmpProfiles[1].enabled).toBe(true);
        expect(next.cmpProfile?.enabled).toBe(false);

        next = reducer({ ...next, isBulkDisabling: true }, actions.bulkDisableCmpProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });

    test('syncs loaded profile custom attributes on remove/update content success', () => {
        const withDetail = {
            ...initialState,
            cmpProfile: { uuid: 'cp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const afterRemove = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.CmpProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [],
            }),
        );
        expect(afterRemove.cmpProfile?.customAttributes).toHaveLength(0);

        const afterUpdate = reducer(
            withDetail,
            customAttributesActions.updateCustomAttributeContentSuccess({
                resource: Resource.CmpProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [{ uuid: 'ca-2', name: 'bar' }] as any,
            }),
        );
        expect(afterUpdate.cmpProfile?.customAttributes?.[0]?.uuid).toBe('ca-2');
    });

    test('does not touch profile custom attributes for a different resource or uuid', () => {
        const withDetail = {
            ...initialState,
            cmpProfile: { uuid: 'cp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const otherUuid = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.CmpProfiles,
                resourceUuid: 'cp-other',
                customAttributes: [],
            }),
        );
        expect(otherUuid.cmpProfile?.customAttributes).toHaveLength(1);

        const otherResource = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.ScepProfiles,
                resourceUuid: 'cp-1',
                customAttributes: [],
            }),
        );
        expect(otherResource.cmpProfile?.customAttributes).toHaveLength(1);
    });
});

describe('cmpProfiles selectors', () => {
    test('selectors read values from cmpProfiles state', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;
        const certs = [{ uuid: 'cert-1' }] as any[];
        const featureState = {
            ...initialState,
            cmpProfile: profile,
            cmpProfiles: [profile],
            cmpSigningCertificates: certs,
            checkedRows: ['cp-1'],
            deleteErrorMessage: 'err',
            bulkDeleteErrorMessages: [{ uuid: 'cp-1' }] as any[],
            isFetchingList: true,
            isFetchingCertificates: true,
            isFetchingDetail: true,
            isCreating: true,
            createCmpProfileSucceeded: true,
            isDeleting: true,
            isUpdating: true,
            updateCmpProfileSucceeded: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
            isBulkForceDeleting: true,
        };

        const state = { cmpProfiles: featureState } as any;

        expect(selectors.cmpProfile(state)).toEqual(profile);
        expect(selectors.cmpProfiles(state)).toEqual([profile]);
        expect(selectors.cmpSigningCertificates(state)).toEqual(certs);
        expect(selectors.checkedRows(state)).toEqual(['cp-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('err');
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingCertificates(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createCmpProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateCmpProfileSucceeded(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
    });
});
