import { describe, expect, test } from 'vitest';
import { Resource } from 'types/openapi';
import { actions as customAttributesActions } from './customAttributes';
import { runCommonSliceTests } from './__tests__/common-slice-tests';
import reducer, { actions, initialState, selectors } from './scep-profiles';

describe('scep-profiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    runCommonSliceTests({
        reducer,
        actions,
        initialState,
        dirtyOverrides: { isCreating: true, isFetchingList: true } as any,
        deleteErrorOverrides: { deleteErrorMessage: 'some error', bulkDeleteErrorMessages: [{ uuid: 'x', name: 'x', errors: [] }] as any },
        deleteErrorAssertions: (next) => {
            expect(next.deleteErrorMessage).toBe('');
            expect(next.bulkDeleteErrorMessages).toHaveLength(0);
        },
    });

    test('listScepProfiles / Success / Failure', () => {
        let next = reducer(initialState, actions.listScepProfiles());
        expect(next.isFetchingList).toBe(true);

        next = reducer(next, actions.listScepProfilesSuccess({ scepProfileList: [{ uuid: 'sp-1' }] as any }));
        expect(next.isFetchingList).toBe(false);
        expect(next.scepProfiles).toHaveLength(1);

        const failing = reducer({ ...initialState, isFetchingList: true }, actions.listScepProfilesFailure({ error: 'err' }));
        expect(failing.isFetchingList).toBe(false);
    });

    test('listScepCaCertificates / Success / Failure', () => {
        let next = reducer(initialState, actions.listScepCaCertificates(true));
        expect(next.isFetchingCertificates).toBe(true);

        next = reducer(next, actions.listScepCaCertificatesSuccess({ certificates: [{ uuid: 'cert-1' }] as any }));
        expect(next.isFetchingCertificates).toBe(false);
        expect(next.caCertificates).toHaveLength(1);

        const failing = reducer({ ...initialState, isFetchingCertificates: true }, actions.listScepCaCertificatesFailure({ error: 'err' }));
        expect(failing.isFetchingCertificates).toBe(false);
    });

    test('getScepProfile / Success inserts and updates / Failure', () => {
        let next = reducer(initialState, actions.getScepProfile({ uuid: 'sp-1' }));
        expect(next.isFetchingDetail).toBe(true);

        next = reducer(next, actions.getScepProfileSuccess({ scepProfile: { uuid: 'sp-1', name: 'profile-one' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.scepProfile?.uuid).toBe('sp-1');
        expect(next.scepProfiles).toHaveLength(1);

        const withExisting = {
            ...initialState,
            scepProfiles: [{ uuid: 'sp-1', name: 'old' }] as any,
        };
        const updated = reducer(withExisting, actions.getScepProfileSuccess({ scepProfile: { uuid: 'sp-1', name: 'new' } as any }));
        expect(updated.scepProfiles).toHaveLength(1);
        expect(updated.scepProfiles[0].name).toBe('new');

        const failing = reducer({ ...initialState, isFetchingDetail: true }, actions.getScepProfileFailure({ error: 'err' }));
        expect(failing.isFetchingDetail).toBe(false);
    });

    test('createScepProfile / Success / Failure', () => {
        let next = reducer(initialState, actions.createScepProfile({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createScepProfileSucceeded).toBe(false);

        next = reducer(next, actions.createScepProfileSuccess({ uuid: 'sp-new' }));
        expect(next.isCreating).toBe(false);
        expect(next.createScepProfileSucceeded).toBe(true);

        const failing = reducer({ ...initialState, isCreating: true }, actions.createScepProfileFailure({ error: 'err' }));
        expect(failing.isCreating).toBe(false);
        expect(failing.createScepProfileSucceeded).toBe(false);
    });

    test('updateScepProfile / Success updates list and detail / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'sp-1', name: 'old' }] as any,
            scepProfile: { uuid: 'sp-1', name: 'old' } as any,
        };

        let next = reducer(withData, actions.updateScepProfile({ uuid: 'sp-1', updateScepRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateScepProfileSucceeded).toBe(false);

        next = reducer(next, actions.updateScepProfileSuccess({ scepProfile: { uuid: 'sp-1', name: 'new' } as any }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateScepProfileSucceeded).toBe(true);
        expect(next.scepProfiles[0].name).toBe('new');
        expect(next.scepProfile?.name).toBe('new');

        const failing = reducer({ ...initialState, isUpdating: true }, actions.updateScepProfileFailure({ error: 'err' }));
        expect(failing.isUpdating).toBe(false);
        expect(failing.updateScepProfileSucceeded).toBe(false);
    });

    test('deleteScepProfile / Success removes entry / Failure stores error', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'del-1' }] as any,
            scepProfile: { uuid: 'del-1' } as any,
        };

        let next = reducer(withData, actions.deleteScepProfile({ uuid: 'del-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteScepProfileSuccess({ uuid: 'del-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.scepProfiles).toHaveLength(0);
        expect(next.scepProfile).toBeUndefined();

        const failing = reducer({ ...initialState, isDeleting: true }, actions.deleteScepProfileFailure({ error: 'some error' }));
        expect(failing.isDeleting).toBe(false);
        expect(failing.deleteErrorMessage).toBe('some error');
    });

    test('enableScepProfile / Success enables entry / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'en-1', enabled: false }] as any,
            scepProfile: { uuid: 'en-1', enabled: false } as any,
        };

        let next = reducer(withData, actions.enableScepProfile({ uuid: 'en-1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableScepProfileSuccess({ uuid: 'en-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.scepProfiles[0].enabled).toBe(true);
        expect(next.scepProfile?.enabled).toBe(true);

        const failing = reducer({ ...initialState, isEnabling: true }, actions.enableScepProfileFailure({ error: 'err' }));
        expect(failing.isEnabling).toBe(false);
    });

    test('disableScepProfile / Success disables entry / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'dis-1', enabled: true }] as any,
            scepProfile: { uuid: 'dis-1', enabled: true } as any,
        };

        let next = reducer(withData, actions.disableScepProfile({ uuid: 'dis-1' }));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableScepProfileSuccess({ uuid: 'dis-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.scepProfiles[0].enabled).toBe(false);
        expect(next.scepProfile?.enabled).toBe(false);

        const failing = reducer({ ...initialState, isDisabling: true }, actions.disableScepProfileFailure({ error: 'err' }));
        expect(failing.isDisabling).toBe(false);
    });

    test('bulkDeleteScepProfiles / Success removes entries / Success with errors stores messages / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'b1' }, { uuid: 'b2' }] as any,
            scepProfile: { uuid: 'b1' } as any,
        };

        let next = reducer(withData, actions.bulkDeleteScepProfiles({ uuids: ['b1', 'b2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toHaveLength(0);

        next = reducer(next, actions.bulkDeleteScepProfilesSuccess({ uuids: ['b1', 'b2'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.scepProfiles).toHaveLength(0);
        expect(next.scepProfile).toBeUndefined();

        const withErrors = { ...initialState, scepProfiles: [{ uuid: 'c1' }] as any, isBulkDeleting: true };
        const withErrMessages = reducer(
            withErrors,
            actions.bulkDeleteScepProfilesSuccess({ uuids: ['c1'], errors: [{ uuid: 'c1', name: 'c1', errors: ['cannot delete'] }] }),
        );
        expect(withErrMessages.isBulkDeleting).toBe(false);
        expect(withErrMessages.bulkDeleteErrorMessages).toHaveLength(1);
        expect(withErrMessages.scepProfiles).toHaveLength(1);

        const failing = reducer({ ...initialState, isBulkDeleting: true }, actions.bulkDeleteScepProfilesFailure({ error: 'err' }));
        expect(failing.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteScepProfiles / Success removes entries / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'fd1' }, { uuid: 'fd2' }] as any,
            scepProfile: { uuid: 'fd1' } as any,
        };

        let next = reducer(withData, actions.bulkForceDeleteScepProfiles({ uuids: ['fd1', 'fd2'] }));
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteScepProfilesSuccess({ uuids: ['fd1', 'fd2'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.scepProfiles).toHaveLength(0);
        expect(next.scepProfile).toBeUndefined();

        const failing = reducer(
            { ...initialState, isBulkForceDeleting: true },
            actions.bulkForceDeleteScepProfilesFailure({ error: 'err' }),
        );
        expect(failing.isBulkForceDeleting).toBe(false);
    });

    test('bulkEnableScepProfiles / Success enables entries / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'be1', enabled: false }] as any,
            scepProfile: { uuid: 'be1', enabled: false } as any,
        };

        let next = reducer(withData, actions.bulkEnableScepProfiles({ uuids: ['be1'] }));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableScepProfilesSuccess({ uuids: ['be1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.scepProfiles[0].enabled).toBe(true);
        expect(next.scepProfile?.enabled).toBe(true);

        const failing = reducer({ ...initialState, isBulkEnabling: true }, actions.bulkEnableScepProfilesFailure({ error: 'err' }));
        expect(failing.isBulkEnabling).toBe(false);
    });

    test('syncs loaded profile custom attributes on remove/update content success', () => {
        const withDetail = {
            ...initialState,
            scepProfile: { uuid: 'sp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const afterRemove = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.ScepProfiles,
                resourceUuid: 'sp-1',
                customAttributes: [],
            }),
        );
        expect(afterRemove.scepProfile?.customAttributes).toHaveLength(0);

        const afterUpdate = reducer(
            withDetail,
            customAttributesActions.updateCustomAttributeContentSuccess({
                resource: Resource.ScepProfiles,
                resourceUuid: 'sp-1',
                customAttributes: [{ uuid: 'ca-2', name: 'bar' }] as any,
            }),
        );
        expect(afterUpdate.scepProfile?.customAttributes?.[0]?.uuid).toBe('ca-2');
    });

    test('does not touch profile custom attributes for a different resource or uuid', () => {
        const withDetail = {
            ...initialState,
            scepProfile: { uuid: 'sp-1', customAttributes: [{ uuid: 'ca-1', name: 'foo' }] } as any,
        };

        const otherUuid = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.ScepProfiles,
                resourceUuid: 'sp-other',
                customAttributes: [],
            }),
        );
        expect(otherUuid.scepProfile?.customAttributes).toHaveLength(1);

        const otherResource = reducer(
            withDetail,
            customAttributesActions.removeCustomAttributeContentSuccess({
                resource: Resource.AcmeProfiles,
                resourceUuid: 'sp-1',
                customAttributes: [],
            }),
        );
        expect(otherResource.scepProfile?.customAttributes).toHaveLength(1);
    });

    test('bulkDisableScepProfiles / Success disables entries / Failure', () => {
        const withData = {
            ...initialState,
            scepProfiles: [{ uuid: 'bd1', enabled: true }] as any,
            scepProfile: { uuid: 'bd1', enabled: true } as any,
        };

        let next = reducer(withData, actions.bulkDisableScepProfiles({ uuids: ['bd1'] }));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableScepProfilesSuccess({ uuids: ['bd1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.scepProfiles[0].enabled).toBe(false);
        expect(next.scepProfile?.enabled).toBe(false);

        const failing = reducer({ ...initialState, isBulkDisabling: true }, actions.bulkDisableScepProfilesFailure({ error: 'err' }));
        expect(failing.isBulkDisabling).toBe(false);
    });
});

describe('scep-profiles selectors', () => {
    test('selectors return values from state', () => {
        const featureState = {
            ...initialState,
            scepProfiles: [{ uuid: 'sp-1' }],
            scepProfile: { uuid: 'sp-detail' },
            caCertificates: [{ uuid: 'cert-1' }],
            checkedRows: ['row-1'],
            deleteErrorMessage: 'del-err',
            bulkDeleteErrorMessages: [{ uuid: 'x', name: 'x', errors: [] }],
            isFetchingList: true,
            isFetchingCertificates: true,
            isFetchingDetail: true,
            isCreating: true,
            createScepProfileSucceeded: true,
            isDeleting: true,
            isUpdating: true,
            updateScepProfileSucceeded: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
            isBulkForceDeleting: true,
        } as any;
        const state = { scepProfiles: featureState } as any;

        expect(selectors.scepProfiles(state)).toHaveLength(1);
        expect(selectors.scepProfile(state)?.uuid).toBe('sp-detail');
        expect(selectors.caCertificates(state)).toHaveLength(1);
        expect(selectors.checkedRows(state)).toEqual(['row-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('del-err');
        expect(selectors.bulkDeleteErrorMessages(state)).toHaveLength(1);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingCertificates(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createScepProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateScepProfileSucceeded(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
    });
});
