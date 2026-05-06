import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './acme-profiles';

describe('acme-profiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isCreating: true, isDeleting: true, checkedRows: ['x'] } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('setCheckedRows stores provided rows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect(next.checkedRows).toEqual(['a', 'b']);
    });

    test('clearDeleteErrorMessages clears both error fields', () => {
        const dirty = {
            ...initialState,
            deleteErrorMessage: 'some error',
            bulkDeleteErrorMessages: [{ uuid: 'x', name: 'x', message: 'err' }],
        } as any;
        const next = reducer(dirty, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('listAcmeProfiles sets isFetchingList', () => {
        const next = reducer(initialState, actions.listAcmeProfiles());
        expect(next.isFetchingList).toBe(true);
    });

    test('listAcmeProfilesSuccess stores list and clears flag', () => {
        const loading = { ...initialState, isFetchingList: true } as any;
        const next = reducer(loading, actions.listAcmeProfilesSuccess({ acmeProfileList: [{ uuid: 'ap-1' }] as any }));
        expect(next.isFetchingList).toBe(false);
        expect(next.acmeProfiles).toHaveLength(1);
        expect(next.acmeProfiles[0].uuid).toBe('ap-1');
    });

    test('listAcmeProfilesFailure clears isFetchingList', () => {
        const loading = { ...initialState, isFetchingList: true } as any;
        const next = reducer(loading, actions.listAcmeProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getAcmeProfile sets isFetchingDetail', () => {
        const next = reducer(initialState, actions.getAcmeProfile({ uuid: 'ap-1' }));
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getAcmeProfileSuccess stores profile and clears flag — profile not in list → pushed', () => {
        const loading = { ...initialState, isFetchingDetail: true } as any;
        const profile = { uuid: 'ap-1', name: 'test' } as any;
        const next = reducer(loading, actions.getAcmeProfileSuccess({ acmeProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.acmeProfile).toEqual(profile);
        expect(next.acmeProfiles).toContainEqual(profile);
    });

    test('getAcmeProfileSuccess updates existing entry in list', () => {
        const existing = { uuid: 'ap-1', name: 'old' } as any;
        const state = { ...initialState, isFetchingDetail: true, acmeProfiles: [existing] } as any;
        const updated = { uuid: 'ap-1', name: 'new' } as any;
        const next = reducer(state, actions.getAcmeProfileSuccess({ acmeProfile: updated }));
        expect(next.acmeProfiles).toHaveLength(1);
        expect(next.acmeProfiles[0].name).toBe('new');
    });

    test('getAcmeProfileFailure clears isFetchingDetail', () => {
        const loading = { ...initialState, isFetchingDetail: true } as any;
        const next = reducer(loading, actions.getAcmeProfileFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createAcmeProfile sets isCreating and clears succeeded flag', () => {
        const state = { ...initialState, createAcmeProfileSucceeded: true } as any;
        const next = reducer(state, actions.createAcmeProfile({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createAcmeProfileSucceeded).toBe(false);
    });

    test('createAcmeProfileSuccess clears isCreating and sets succeeded', () => {
        const loading = { ...initialState, isCreating: true } as any;
        const next = reducer(loading, actions.createAcmeProfileSuccess({ uuid: 'ap-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createAcmeProfileSucceeded).toBe(true);
    });

    test('createAcmeProfileFailure clears isCreating and succeeded flag', () => {
        const loading = { ...initialState, isCreating: true, createAcmeProfileSucceeded: true } as any;
        const next = reducer(loading, actions.createAcmeProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createAcmeProfileSucceeded).toBe(false);
    });

    test('updateAcmeProfile sets isUpdating and clears succeeded flag', () => {
        const state = { ...initialState, updateAcmeProfileSucceeded: true } as any;
        const next = reducer(state, actions.updateAcmeProfile({ uuid: 'ap-1', updateAcmeRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateAcmeProfileSucceeded).toBe(false);
    });

    test('updateAcmeProfileSuccess clears isUpdating and sets succeeded — profile not in list → pushed', () => {
        const loading = { ...initialState, isUpdating: true } as any;
        const profile = { uuid: 'ap-1', name: 'updated' } as any;
        const next = reducer(loading, actions.updateAcmeProfileSuccess({ acmeProfile: profile }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateAcmeProfileSucceeded).toBe(true);
        expect(next.acmeProfiles).toContainEqual(profile);
    });

    test('updateAcmeProfileSuccess updates existing entry in list and acmeProfile', () => {
        const existing = { uuid: 'ap-1', name: 'old' } as any;
        const state = { ...initialState, isUpdating: true, acmeProfiles: [existing], acmeProfile: existing } as any;
        const updated = { uuid: 'ap-1', name: 'new' } as any;
        const next = reducer(state, actions.updateAcmeProfileSuccess({ acmeProfile: updated }));
        expect(next.acmeProfiles[0].name).toBe('new');
        expect(next.acmeProfile?.name).toBe('new');
    });

    test('updateAcmeProfileFailure clears isUpdating and succeeded flag', () => {
        const loading = { ...initialState, isUpdating: true, updateAcmeProfileSucceeded: true } as any;
        const next = reducer(loading, actions.updateAcmeProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateAcmeProfileSucceeded).toBe(false);
    });

    test('deleteAcmeProfile sets isDeleting and clears deleteErrorMessage', () => {
        const state = { ...initialState, deleteErrorMessage: 'old error' } as any;
        const next = reducer(state, actions.deleteAcmeProfile({ uuid: 'ap-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');
    });

    test('deleteAcmeProfileSuccess removes profile from list and clears acmeProfile', () => {
        const profile = { uuid: 'ap-1' } as any;
        const state = { ...initialState, isDeleting: true, acmeProfiles: [profile], acmeProfile: profile } as any;
        const next = reducer(state, actions.deleteAcmeProfileSuccess({ uuid: 'ap-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.acmeProfiles).toHaveLength(0);
        expect(next.acmeProfile).toBeUndefined();
    });

    test('deleteAcmeProfileSuccess does not clear acmeProfile when uuid differs', () => {
        const profile = { uuid: 'ap-1' } as any;
        const current = { uuid: 'ap-2' } as any;
        const state = { ...initialState, isDeleting: true, acmeProfiles: [profile], acmeProfile: current } as any;
        const next = reducer(state, actions.deleteAcmeProfileSuccess({ uuid: 'ap-1' }));
        expect(next.acmeProfile?.uuid).toBe('ap-2');
    });

    test('deleteAcmeProfileFailure clears isDeleting and stores error message', () => {
        const loading = { ...initialState, isDeleting: true } as any;
        const next = reducer(loading, actions.deleteAcmeProfileFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('deleteAcmeProfileFailure uses fallback message when error is undefined', () => {
        const loading = { ...initialState, isDeleting: true } as any;
        const next = reducer(loading, actions.deleteAcmeProfileFailure({ error: undefined }));
        expect(next.deleteErrorMessage).toBe('Unknown error');
    });

    test('enableAcmeProfile sets isEnabling', () => {
        const next = reducer(initialState, actions.enableAcmeProfile({ uuid: 'ap-1' }));
        expect(next.isEnabling).toBe(true);
    });

    test('enableAcmeProfileSuccess clears isEnabling and sets enabled on list entry and acmeProfile', () => {
        const profile = { uuid: 'ap-1', enabled: false } as any;
        const state = { ...initialState, isEnabling: true, acmeProfiles: [profile], acmeProfile: { ...profile } } as any;
        const next = reducer(state, actions.enableAcmeProfileSuccess({ uuid: 'ap-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.acmeProfiles[0].enabled).toBe(true);
        expect(next.acmeProfile?.enabled).toBe(true);
    });

    test('enableAcmeProfileFailure clears isEnabling', () => {
        const loading = { ...initialState, isEnabling: true } as any;
        const next = reducer(loading, actions.enableAcmeProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableAcmeProfile sets isDisabling', () => {
        const next = reducer(initialState, actions.disableAcmeProfile({ uuid: 'ap-1' }));
        expect(next.isDisabling).toBe(true);
    });

    test('disableAcmeProfileSuccess clears isDisabling and sets enabled=false on list entry and acmeProfile', () => {
        const profile = { uuid: 'ap-1', enabled: true } as any;
        const state = { ...initialState, isDisabling: true, acmeProfiles: [profile], acmeProfile: { ...profile } } as any;
        const next = reducer(state, actions.disableAcmeProfileSuccess({ uuid: 'ap-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.acmeProfiles[0].enabled).toBe(false);
        expect(next.acmeProfile?.enabled).toBe(false);
    });

    test('disableAcmeProfileFailure clears isDisabling', () => {
        const loading = { ...initialState, isDisabling: true } as any;
        const next = reducer(loading, actions.disableAcmeProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('bulkDeleteAcmeProfiles sets isBulkDeleting and clears bulkDeleteErrorMessages', () => {
        const state = { ...initialState, bulkDeleteErrorMessages: [{ uuid: 'x' }] } as any;
        const next = reducer(state, actions.bulkDeleteAcmeProfiles({ uuids: ['ap-1'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('bulkDeleteAcmeProfilesSuccess with errors stores errors and does not remove profiles', () => {
        const profile = { uuid: 'ap-1' } as any;
        const state = { ...initialState, isBulkDeleting: true, acmeProfiles: [profile] } as any;
        const errors = [{ uuid: 'ap-1', name: 'ap-1', message: 'in use' }] as any;
        const next = reducer(state, actions.bulkDeleteAcmeProfilesSuccess({ uuids: ['ap-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.acmeProfiles).toHaveLength(1);
    });

    test('bulkDeleteAcmeProfilesSuccess without errors removes profiles from list and clears acmeProfile', () => {
        const profile = { uuid: 'ap-1' } as any;
        const state = { ...initialState, isBulkDeleting: true, acmeProfiles: [profile], acmeProfile: profile } as any;
        const next = reducer(state, actions.bulkDeleteAcmeProfilesSuccess({ uuids: ['ap-1'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.acmeProfiles).toHaveLength(0);
        expect(next.acmeProfile).toBeUndefined();
    });

    test('bulkDeleteAcmeProfilesFailure clears isBulkDeleting', () => {
        const loading = { ...initialState, isBulkDeleting: true } as any;
        const next = reducer(loading, actions.bulkDeleteAcmeProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteAcmeProfiles sets isBulkForceDeleting', () => {
        const next = reducer(initialState, actions.bulkForceDeleteAcmeProfiles({ uuids: ['ap-1'] }));
        expect(next.isBulkForceDeleting).toBe(true);
    });

    test('bulkForceDeleteAcmeProfilesSuccess removes profiles from list and clears acmeProfile', () => {
        const profile = { uuid: 'ap-1' } as any;
        const state = { ...initialState, isBulkForceDeleting: true, acmeProfiles: [profile], acmeProfile: profile } as any;
        const next = reducer(state, actions.bulkForceDeleteAcmeProfilesSuccess({ uuids: ['ap-1'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.acmeProfiles).toHaveLength(0);
        expect(next.acmeProfile).toBeUndefined();
    });

    test('bulkForceDeleteAcmeProfilesSuccess does not clear acmeProfile when uuid not in list', () => {
        const profile = { uuid: 'ap-1' } as any;
        const current = { uuid: 'ap-2' } as any;
        const state = { ...initialState, isBulkForceDeleting: true, acmeProfiles: [profile], acmeProfile: current } as any;
        const next = reducer(state, actions.bulkForceDeleteAcmeProfilesSuccess({ uuids: ['ap-1'] }));
        expect(next.acmeProfile?.uuid).toBe('ap-2');
    });

    test('bulkForceDeleteAcmeProfilesFailure clears isBulkForceDeleting', () => {
        const loading = { ...initialState, isBulkForceDeleting: true } as any;
        const next = reducer(loading, actions.bulkForceDeleteAcmeProfilesFailure({ error: 'err' }));
        expect(next.isBulkForceDeleting).toBe(false);
    });

    test('bulkEnableAcmeProfiles sets isBulkEnabling', () => {
        const next = reducer(initialState, actions.bulkEnableAcmeProfiles({ uuids: ['ap-1'] }));
        expect(next.isBulkEnabling).toBe(true);
    });

    test('bulkEnableAcmeProfilesSuccess sets enabled=true on matched profiles and acmeProfile', () => {
        const profile = { uuid: 'ap-1', enabled: false } as any;
        const state = { ...initialState, isBulkEnabling: true, acmeProfiles: [profile], acmeProfile: { ...profile } } as any;
        const next = reducer(state, actions.bulkEnableAcmeProfilesSuccess({ uuids: ['ap-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.acmeProfiles[0].enabled).toBe(true);
        expect(next.acmeProfile?.enabled).toBe(true);
    });

    test('bulkEnableAcmeProfilesFailure clears isBulkEnabling', () => {
        const loading = { ...initialState, isBulkEnabling: true } as any;
        const next = reducer(loading, actions.bulkEnableAcmeProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableAcmeProfiles sets isBulkDisabling', () => {
        const next = reducer(initialState, actions.bulkDisableAcmeProfiles({ uuids: ['ap-1'] }));
        expect(next.isBulkDisabling).toBe(true);
    });

    test('bulkDisableAcmeProfilesSuccess sets enabled=false on matched profiles and acmeProfile', () => {
        const profile = { uuid: 'ap-1', enabled: true } as any;
        const state = { ...initialState, isBulkDisabling: true, acmeProfiles: [profile], acmeProfile: { ...profile } } as any;
        const next = reducer(state, actions.bulkDisableAcmeProfilesSuccess({ uuids: ['ap-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.acmeProfiles[0].enabled).toBe(false);
        expect(next.acmeProfile?.enabled).toBe(false);
    });

    test('bulkDisableAcmeProfilesFailure clears isBulkDisabling', () => {
        const loading = { ...initialState, isBulkDisabling: true } as any;
        const next = reducer(loading, actions.bulkDisableAcmeProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });
});

describe('acme-profiles selectors', () => {
    test('selectors read all values from state', () => {
        const profile = { uuid: 'ap-1' } as any;
        const bulkErrors = [{ uuid: 'ap-2', name: 'ap-2', message: 'in use' }] as any;

        const featureState = {
            ...initialState,
            checkedRows: ['ap-1', 'ap-2'],
            acmeProfile: profile,
            acmeProfiles: [profile],
            deleteErrorMessage: 'del err',
            bulkDeleteErrorMessages: bulkErrors,
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createAcmeProfileSucceeded: true,
            isDeleting: true,
            isUpdating: true,
            updateAcmeProfileSucceeded: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
            isBulkForceDeleting: true,
        } as any;

        const state = { acmeProfiles: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['ap-1', 'ap-2']);
        expect(selectors.acmeProfile(state)).toEqual(profile);
        expect(selectors.acmeProfiles(state)).toHaveLength(1);
        expect(selectors.deleteErrorMessage(state)).toBe('del err');
        expect(selectors.bulkDeleteErrorMessages(state)).toEqual(bulkErrors);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createAcmeProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateAcmeProfileSucceeded(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
    });
});
