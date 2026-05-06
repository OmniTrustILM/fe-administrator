import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './certificateGroups';

describe('certificateGroups slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isCreating: true, checkedRows: ['x'], certificateGroups: [{ uuid: 'g1' } as any] };
        expect(reducer(dirty as any, actions.resetState())).toEqual(initialState);
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect(next.checkedRows).toEqual(['a', 'b']);
    });

    test('listGroups / success / failure', () => {
        let next = reducer(initialState, actions.listGroups());
        expect(next.isFetchingList).toBe(true);
        expect(next.certificateGroups).toEqual([]);

        next = reducer(next, actions.listGroupsSuccess({ groups: [{ uuid: 'g1' } as any] }));
        expect(next.isFetchingList).toBe(false);
        expect(next.certificateGroups).toHaveLength(1);

        next = reducer({ ...next, isFetchingList: true }, actions.listGroupsFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getGroupDetail / success / failure', () => {
        let next = reducer(initialState, actions.getGroupDetail({ uuid: 'g1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.certificateGroup).toBeUndefined();

        next = reducer(next, actions.getGroupDetailSuccess({ group: { uuid: 'g1', name: 'grp' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.certificateGroup?.uuid).toBe('g1');

        next = reducer({ ...next, isFetchingDetail: true }, actions.getGroupDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createGroup / success / failure', () => {
        let next = reducer(initialState, actions.createGroup({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createGroupSucceeded).toBe(false);

        next = reducer(next, actions.createGroupSuccess({ uuid: 'g1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createGroupSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createGroupFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createGroupSucceeded).toBe(false);
    });

    test('updateGroup / success / failure', () => {
        let next = reducer(initialState, actions.updateGroup({ groupUuid: 'g1', editGroupRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateGroupSucceeded).toBe(false);

        next = reducer(next, actions.updateGroupSuccess({ group: { uuid: 'g1', name: 'updated' } as any }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateGroupSucceeded).toBe(true);
        expect(next.certificateGroup?.uuid).toBe('g1');

        next = reducer({ ...next, isUpdating: true }, actions.updateGroupFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateGroupSucceeded).toBe(false);
    });

    test('deleteGroup / success removes from list and clears detail / failure', () => {
        const state = {
            ...initialState,
            certificateGroups: [{ uuid: 'g1' } as any, { uuid: 'g2' } as any],
            certificateGroup: { uuid: 'g1' } as any,
        };
        let next = reducer(state as any, actions.deleteGroup({ uuid: 'g1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteGroupSuccess({ uuid: 'g1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.certificateGroups).toHaveLength(1);
        expect(next.certificateGroups[0].uuid).toBe('g2');
        expect(next.certificateGroup).toBeUndefined();

        const stateNoMatch = {
            ...initialState,
            certificateGroups: [{ uuid: 'g2' } as any],
            certificateGroup: { uuid: 'g2' } as any,
        };
        const next2 = reducer(stateNoMatch as any, actions.deleteGroupSuccess({ uuid: 'g-notfound' }));
        expect(next2.certificateGroups).toHaveLength(1);
        expect(next2.certificateGroup?.uuid).toBe('g2');

        const nextFail = reducer({ ...initialState, isDeleting: true } as any, actions.deleteGroupFailure({ error: 'err' }));
        expect(nextFail.isDeleting).toBe(false);
    });

    test('bulkDeleteGroups / success removes items and clears detail / failure', () => {
        const state = {
            ...initialState,
            certificateGroups: [{ uuid: 'g1' } as any, { uuid: 'g2' } as any],
            certificateGroup: { uuid: 'g1' } as any,
        };
        let next = reducer(state as any, actions.bulkDeleteGroups({ uuids: ['g1', 'g2'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteGroupsSuccess({ uuids: ['g1', 'g2'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.certificateGroups).toHaveLength(0);
        expect(next.certificateGroup).toBeUndefined();

        const stateNoMatch = {
            ...initialState,
            certificateGroups: [{ uuid: 'g3' } as any],
            certificateGroup: { uuid: 'g3' } as any,
        };
        const next2 = reducer(stateNoMatch as any, actions.bulkDeleteGroupsSuccess({ uuids: ['g-notfound'] }));
        expect(next2.certificateGroups).toHaveLength(1);
        expect(next2.certificateGroup?.uuid).toBe('g3');

        const nextFail = reducer({ ...initialState, isBulkDeleting: true } as any, actions.bulkDeleteGroupsFailure({ error: 'err' }));
        expect(nextFail.isBulkDeleting).toBe(false);
    });
});

describe('certificateGroups selectors', () => {
    test('all selectors return correct values from feature state', () => {
        const featureState = {
            ...initialState,
            checkedRows: ['x'],
            certificateGroup: { uuid: 'g1' } as any,
            certificateGroups: [{ uuid: 'g1' } as any],
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createGroupSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isUpdating: true,
            updateGroupSucceeded: true,
        } as any;

        const state = { certificateGroups: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['x']);
        expect(selectors.certificateGroup(state)?.uuid).toBe('g1');
        expect(selectors.certificateGroups(state)).toHaveLength(1);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createGroupSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateGroupSucceeded(state)).toBe(true);
    });
});
