import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './tsp-profiles';

describe('tspProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            tspProfile: { uuid: 'profile-1' } as any,
            tspProfiles: [{ uuid: 'profile-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['profile-1', 'profile-2'] }));
        expect(next.checkedRows).toEqual(['profile-1', 'profile-2']);
    });

    test('clearDeleteErrorMessages clears error fields', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'some error', bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('listTspProfiles sets isFetchingList', () => {
        const next = reducer(initialState, actions.listTspProfiles());
        expect(next.isFetchingList).toBe(true);
    });

    test('listTspProfilesSuccess updates list', () => {
        const profiles = [{ uuid: 'profile-1' }] as any[];
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listTspProfilesSuccess({ tspProfiles: profiles }));
        expect(next.isFetchingList).toBe(false);
        expect(next.tspProfiles).toEqual(profiles);
    });

    test('listTspProfilesFailure clears isFetchingList', () => {
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listTspProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getTspProfile sets isFetchingDetail', () => {
        const next = reducer(initialState, actions.getTspProfile({ uuid: 'profile-1' }));
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getTspProfileSuccess sets detail and updates list entry', () => {
        const existing = { uuid: 'profile-1', name: 'Old' } as any;
        const updated = { uuid: 'profile-1', name: 'New' } as any;
        const state = { ...initialState, isFetchingDetail: true, tspProfiles: [existing] };
        const next = reducer(state, actions.getTspProfileSuccess({ tspProfile: updated }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.tspProfile).toEqual(updated);
        expect(next.tspProfiles[0]).toEqual(updated);
    });

    test('getTspProfileFailure clears isFetchingDetail', () => {
        const next = reducer({ ...initialState, isFetchingDetail: true }, actions.getTspProfileFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('listTspProfileSearchableFields sets isFetchingSearchableFields', () => {
        const next = reducer(initialState, actions.listTspProfileSearchableFields());
        expect(next.isFetchingSearchableFields).toBe(true);
    });

    test('listTspProfileSearchableFieldsSuccess sets fields', () => {
        const fields = [{ searchGroupEnum: 'grp' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listTspProfileSearchableFieldsSuccess({ searchableFields: fields }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
        expect(next.searchableFields).toEqual(fields);
    });

    test('listTspProfileSearchableFieldsFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listTspProfileSearchableFieldsFailure({ error: 'err' }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
    });

    test('createTspProfile sets isCreating', () => {
        const next = reducer(initialState, actions.createTspProfile({ tspProfileRequestDto: {} as any }));
        expect(next.isCreating).toBe(true);
    });

    test('createTspProfileSuccess clears isCreating', () => {
        const next = reducer(
            { ...initialState, isCreating: true },
            actions.createTspProfileSuccess({ tspProfile: { uuid: 'profile-1' } as any }),
        );
        expect(next.isCreating).toBe(false);
    });

    test('createTspProfileFailure clears isCreating', () => {
        const next = reducer({ ...initialState, isCreating: true }, actions.createTspProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
    });

    test('updateTspProfile sets isUpdating', () => {
        const next = reducer(initialState, actions.updateTspProfile({ uuid: 'profile-1', tspProfileRequestDto: {} as any }));
        expect(next.isUpdating).toBe(true);
    });

    test('updateTspProfileSuccess updates detail and list', () => {
        const existing = { uuid: 'profile-1', name: 'Old' } as any;
        const updated = { uuid: 'profile-1', name: 'Updated' } as any;
        const state = { ...initialState, isUpdating: true, tspProfile: existing, tspProfiles: [existing] };
        const next = reducer(state, actions.updateTspProfileSuccess({ tspProfile: updated }));
        expect(next.isUpdating).toBe(false);
        expect(next.tspProfile).toEqual(updated);
        expect(next.tspProfiles[0]).toEqual(updated);
    });

    test('updateTspProfileFailure clears isUpdating', () => {
        const next = reducer({ ...initialState, isUpdating: true }, actions.updateTspProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('deleteTspProfile sets isDeleting and clears deleteErrorMessage', () => {
        const next = reducer({ ...initialState, deleteErrorMessage: 'old error' }, actions.deleteTspProfile({ uuid: 'profile-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');
    });

    test('deleteTspProfileSuccess removes from list and clears detail', () => {
        const profile = { uuid: 'profile-1' } as any;
        const state = { ...initialState, isDeleting: true, tspProfile: profile, tspProfiles: [profile] };
        const next = reducer(state, actions.deleteTspProfileSuccess({ uuid: 'profile-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.tspProfiles).toHaveLength(0);
        expect(next.tspProfile).toBeUndefined();
    });

    test('deleteTspProfileFailure sets deleteErrorMessage', () => {
        const next = reducer({ ...initialState, isDeleting: true }, actions.deleteTspProfileFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('enableTspProfile sets isEnabling', () => {
        const next = reducer(initialState, actions.enableTspProfile({ uuid: 'profile-1' }));
        expect(next.isEnabling).toBe(true);
    });

    test('enableTspProfileSuccess sets enabled=true in list and detail', () => {
        const profile = { uuid: 'profile-1', enabled: false } as any;
        const state = {
            ...initialState,
            isEnabling: true,
            tspProfile: profile,
            tspProfiles: [{ ...profile }],
        };
        const next = reducer(state, actions.enableTspProfileSuccess({ uuid: 'profile-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.tspProfiles[0].enabled).toBe(true);
        expect(next.tspProfile?.enabled).toBe(true);
    });

    test('enableTspProfileFailure clears isEnabling', () => {
        const next = reducer({ ...initialState, isEnabling: true }, actions.enableTspProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableTspProfile sets isDisabling', () => {
        const next = reducer(initialState, actions.disableTspProfile({ uuid: 'profile-1' }));
        expect(next.isDisabling).toBe(true);
    });

    test('disableTspProfileSuccess sets enabled=false in list and detail', () => {
        const profile = { uuid: 'profile-1', enabled: true } as any;
        const state = {
            ...initialState,
            isDisabling: true,
            tspProfile: profile,
            tspProfiles: [{ ...profile }],
        };
        const next = reducer(state, actions.disableTspProfileSuccess({ uuid: 'profile-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.tspProfiles[0].enabled).toBe(false);
        expect(next.tspProfile?.enabled).toBe(false);
    });

    test('disableTspProfileFailure clears isDisabling', () => {
        const next = reducer({ ...initialState, isDisabling: true }, actions.disableTspProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('bulkDeleteTspProfiles sets isBulkDeleting and clears errors', () => {
        const next = reducer(
            { ...initialState, bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.bulkDeleteTspProfiles({ uuids: ['profile-1'] }),
        );
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('bulkDeleteTspProfilesSuccess removes items from list', () => {
        const profiles = [{ uuid: 'profile-1' }, { uuid: 'profile-2' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, tspProfiles: profiles };
        const next = reducer(state, actions.bulkDeleteTspProfilesSuccess({ uuids: ['profile-1'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.tspProfiles).toHaveLength(1);
        expect(next.tspProfiles[0].uuid).toBe('profile-2');
    });

    test('bulkDeleteTspProfilesSuccess with errors sets bulkDeleteErrorMessages', () => {
        const errors = [{ message: 'err', uuid: 'profile-1', name: 'TSP Profile 1' }] as any[];
        const profiles = [{ uuid: 'profile-1' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, tspProfiles: profiles };
        const next = reducer(state, actions.bulkDeleteTspProfilesSuccess({ uuids: ['profile-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.tspProfiles).toHaveLength(1);
    });

    test('bulkDeleteTspProfilesFailure clears isBulkDeleting', () => {
        const next = reducer({ ...initialState, isBulkDeleting: true }, actions.bulkDeleteTspProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkEnableTspProfiles sets isBulkEnabling', () => {
        const next = reducer(initialState, actions.bulkEnableTspProfiles({ uuids: ['profile-1'] }));
        expect(next.isBulkEnabling).toBe(true);
    });

    test('bulkEnableTspProfilesSuccess sets enabled=true for matching uuids', () => {
        const profiles = [
            { uuid: 'profile-1', enabled: false },
            { uuid: 'profile-2', enabled: false },
        ] as any[];
        const state = { ...initialState, isBulkEnabling: true, tspProfiles: profiles };
        const next = reducer(state, actions.bulkEnableTspProfilesSuccess({ uuids: ['profile-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.tspProfiles[0].enabled).toBe(true);
        expect(next.tspProfiles[1].enabled).toBe(false);
    });

    test('bulkEnableTspProfilesFailure clears isBulkEnabling', () => {
        const next = reducer({ ...initialState, isBulkEnabling: true }, actions.bulkEnableTspProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableTspProfiles sets isBulkDisabling', () => {
        const next = reducer(initialState, actions.bulkDisableTspProfiles({ uuids: ['profile-1'] }));
        expect(next.isBulkDisabling).toBe(true);
    });

    test('bulkDisableTspProfilesSuccess sets enabled=false for matching uuids', () => {
        const profiles = [
            { uuid: 'profile-1', enabled: true },
            { uuid: 'profile-2', enabled: true },
        ] as any[];
        const state = { ...initialState, isBulkDisabling: true, tspProfiles: profiles };
        const next = reducer(state, actions.bulkDisableTspProfilesSuccess({ uuids: ['profile-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.tspProfiles[0].enabled).toBe(false);
        expect(next.tspProfiles[1].enabled).toBe(true);
    });

    test('bulkDisableTspProfilesFailure clears isBulkDisabling', () => {
        const next = reducer({ ...initialState, isBulkDisabling: true }, actions.bulkDisableTspProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });
});

describe('tspProfiles selectors', () => {
    test('selectors read all values from state', () => {
        const profile = { uuid: 'profile-1' } as any;
        const profiles = [profile];
        const fields = [{ searchGroupEnum: 'g-1' }] as any[];
        const bulkErrors = [{ message: 'err' }] as any[];

        const featureState = {
            ...initialState,
            tspProfile: profile,
            tspProfiles: profiles,
            searchableFields: fields,
            checkedRows: ['profile-1'],
            deleteErrorMessage: 'del err',
            bulkDeleteErrorMessages: bulkErrors,
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingSearchableFields: true,
            isCreating: true,
            isDeleting: true,
            isUpdating: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
        };

        const state = { tspProfiles: featureState } as any;

        expect(selectors.tspProfile(state)).toEqual(profile);
        expect(selectors.tspProfiles(state)).toEqual(profiles);
        expect(selectors.searchableFields(state)).toEqual(fields);
        expect(selectors.checkedRows(state)).toEqual(['profile-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('del err');
        expect(selectors.bulkDeleteErrorMessages(state)).toEqual(bulkErrors);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingSearchableFields(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
    });
});
