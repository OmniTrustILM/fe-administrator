import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './time-quality-configurations';

describe('timeQualityConfigurations slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            timeQualityConfiguration: { uuid: 'c-1' } as any,
            timeQualityConfigurations: [{ uuid: 'c-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['c-1', 'c-2'] }));
        expect(next.checkedRows).toEqual(['c-1', 'c-2']);
    });

    test('clearDeleteErrorMessages clears error fields', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'some error', bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('listTimeQualityConfigurations sets isFetchingList', () => {
        const next = reducer(initialState, actions.listTimeQualityConfigurations());
        expect(next.isFetchingList).toBe(true);
    });

    test('listTimeQualityConfigurationsSuccess updates list', () => {
        const configs = [{ uuid: 'c-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingList: true },
            actions.listTimeQualityConfigurationsSuccess({ timeQualityConfigurations: configs }),
        );
        expect(next.isFetchingList).toBe(false);
        expect(next.timeQualityConfigurations).toEqual(configs);
    });

    test('listTimeQualityConfigurationsFailure clears isFetchingList', () => {
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listTimeQualityConfigurationsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getTimeQualityConfiguration sets isFetchingDetail', () => {
        const next = reducer(initialState, actions.getTimeQualityConfiguration({ uuid: 'c-1' }));
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getTimeQualityConfigurationSuccess sets detail and updates list entry', () => {
        const existing = { uuid: 'c-1', name: 'Old' } as any;
        const updated = { uuid: 'c-1', name: 'New' } as any;
        const state = { ...initialState, isFetchingDetail: true, timeQualityConfigurations: [existing] };
        const next = reducer(state, actions.getTimeQualityConfigurationSuccess({ timeQualityConfiguration: updated }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.timeQualityConfiguration).toEqual(updated);
        expect(next.timeQualityConfigurations[0]).toEqual(updated);
    });

    test('getTimeQualityConfigurationFailure clears isFetchingDetail', () => {
        const next = reducer({ ...initialState, isFetchingDetail: true }, actions.getTimeQualityConfigurationFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('listTimeQualityConfigurationSearchableFields sets isFetchingSearchableFields', () => {
        const next = reducer(initialState, actions.listTimeQualityConfigurationSearchableFields());
        expect(next.isFetchingSearchableFields).toBe(true);
    });

    test('listTimeQualityConfigurationSearchableFieldsSuccess sets fields', () => {
        const fields = [{ searchGroupEnum: 'grp' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listTimeQualityConfigurationSearchableFieldsSuccess({ searchableFields: fields }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
        expect(next.searchableFields).toEqual(fields);
    });

    test('listTimeQualityConfigurationSearchableFieldsFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listTimeQualityConfigurationSearchableFieldsFailure({ error: 'err' }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
    });

    test('createTimeQualityConfiguration sets isCreating', () => {
        const next = reducer(initialState, actions.createTimeQualityConfiguration({ timeQualityConfigurationRequestDto: {} as any }));
        expect(next.isCreating).toBe(true);
    });

    test('createTimeQualityConfigurationSuccess clears isCreating', () => {
        const next = reducer(
            { ...initialState, isCreating: true },
            actions.createTimeQualityConfigurationSuccess({ timeQualityConfiguration: { uuid: 'c-1' } as any }),
        );
        expect(next.isCreating).toBe(false);
    });

    test('createTimeQualityConfigurationFailure clears isCreating', () => {
        const next = reducer({ ...initialState, isCreating: true }, actions.createTimeQualityConfigurationFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
    });

    test('updateTimeQualityConfiguration sets isUpdating', () => {
        const next = reducer(
            initialState,
            actions.updateTimeQualityConfiguration({ uuid: 'c-1', timeQualityConfigurationRequestDto: {} as any }),
        );
        expect(next.isUpdating).toBe(true);
    });

    test('updateTimeQualityConfigurationSuccess updates detail and list', () => {
        const existing = { uuid: 'c-1', name: 'Old' } as any;
        const updated = { uuid: 'c-1', name: 'Updated' } as any;
        const state = { ...initialState, isUpdating: true, timeQualityConfiguration: existing, timeQualityConfigurations: [existing] };
        const next = reducer(state, actions.updateTimeQualityConfigurationSuccess({ timeQualityConfiguration: updated }));
        expect(next.isUpdating).toBe(false);
        expect(next.timeQualityConfiguration).toEqual(updated);
        expect(next.timeQualityConfigurations[0]).toEqual(updated);
    });

    test('updateTimeQualityConfigurationFailure clears isUpdating', () => {
        const next = reducer({ ...initialState, isUpdating: true }, actions.updateTimeQualityConfigurationFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('deleteTimeQualityConfiguration sets isDeleting and clears deleteErrorMessage', () => {
        const next = reducer({ ...initialState, deleteErrorMessage: 'old error' }, actions.deleteTimeQualityConfiguration({ uuid: 'c-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');
    });

    test('deleteTimeQualityConfigurationSuccess removes from list and clears detail', () => {
        const config = { uuid: 'c-1' } as any;
        const state = { ...initialState, isDeleting: true, timeQualityConfiguration: config, timeQualityConfigurations: [config] };
        const next = reducer(state, actions.deleteTimeQualityConfigurationSuccess({ uuid: 'c-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.timeQualityConfigurations).toHaveLength(0);
        expect(next.timeQualityConfiguration).toBeUndefined();
    });

    test('deleteTimeQualityConfigurationFailure sets deleteErrorMessage', () => {
        const next = reducer(
            { ...initialState, isDeleting: true },
            actions.deleteTimeQualityConfigurationFailure({ error: 'delete failed' }),
        );
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('bulkDeleteTimeQualityConfigurations sets isBulkDeleting and clears errors', () => {
        const next = reducer(
            { ...initialState, bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.bulkDeleteTimeQualityConfigurations({ uuids: ['c-1'] }),
        );
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('bulkDeleteTimeQualityConfigurationsSuccess removes items from list', () => {
        const configs = [{ uuid: 'c-1' }, { uuid: 'c-2' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, timeQualityConfigurations: configs };
        const next = reducer(state, actions.bulkDeleteTimeQualityConfigurationsSuccess({ uuids: ['c-1'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.timeQualityConfigurations).toHaveLength(1);
        expect(next.timeQualityConfigurations[0].uuid).toBe('c-2');
    });

    test('bulkDeleteTimeQualityConfigurationsSuccess with errors sets bulkDeleteErrorMessages', () => {
        const errors = [{ message: 'err', uuid: 'c-1', name: 'TQ Config 1' }] as any[];
        const configs = [{ uuid: 'c-1' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, timeQualityConfigurations: configs };
        const next = reducer(state, actions.bulkDeleteTimeQualityConfigurationsSuccess({ uuids: ['c-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.timeQualityConfigurations).toHaveLength(1);
    });

    test('listAssociatedSigningProfiles sets isFetchingAssociatedSigningProfiles and clears list', () => {
        const state = { ...initialState, associatedSigningProfiles: [{ uuid: 'sp-1' }] as any[] };
        const next = reducer(state, actions.listAssociatedSigningProfiles({ uuid: 'c-1' }));
        expect(next.isFetchingAssociatedSigningProfiles).toBe(true);
        expect(next.associatedSigningProfiles).toEqual([]);
    });

    test('listAssociatedSigningProfilesSuccess sets profiles and clears flag', () => {
        const profiles = [{ uuid: 'sp-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingAssociatedSigningProfiles: true },
            actions.listAssociatedSigningProfilesSuccess({ signingProfiles: profiles }),
        );
        expect(next.isFetchingAssociatedSigningProfiles).toBe(false);
        expect(next.associatedSigningProfiles).toEqual(profiles);
    });

    test('listAssociatedSigningProfilesFailure clears isFetchingAssociatedSigningProfiles', () => {
        const next = reducer(
            { ...initialState, isFetchingAssociatedSigningProfiles: true },
            actions.listAssociatedSigningProfilesFailure({ error: 'err' }),
        );
        expect(next.isFetchingAssociatedSigningProfiles).toBe(false);
    });
});

describe('timeQualityConfigurations selectors', () => {
    test('selectors read all values from state', () => {
        const config = { uuid: 'c-1' } as any;
        const configs = [config];
        const fields = [{ searchGroupEnum: 'g-1' }] as any[];
        const bulkErrors = [{ message: 'err' }] as any[];

        const profiles = [{ uuid: 'sp-1' }] as any[];

        const featureState = {
            ...initialState,
            timeQualityConfiguration: config,
            timeQualityConfigurations: configs,
            searchableFields: fields,
            checkedRows: ['c-1'],
            deleteErrorMessage: 'del err',
            bulkDeleteErrorMessages: bulkErrors,
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingSearchableFields: true,
            isCreating: true,
            isDeleting: true,
            isUpdating: true,
            isBulkDeleting: true,
            associatedSigningProfiles: profiles,
            isFetchingAssociatedSigningProfiles: true,
        };

        const state = { timeQualityConfigurations: featureState } as any;

        expect(selectors.timeQualityConfiguration(state)).toEqual(config);
        expect(selectors.timeQualityConfigurations(state)).toEqual(configs);
        expect(selectors.searchableFields(state)).toEqual(fields);
        expect(selectors.checkedRows(state)).toEqual(['c-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('del err');
        expect(selectors.bulkDeleteErrorMessages(state)).toEqual(bulkErrors);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingSearchableFields(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.associatedSigningProfiles(state)).toEqual(profiles);
        expect(selectors.isFetchingAssociatedSigningProfiles(state)).toBe(true);
    });
});
