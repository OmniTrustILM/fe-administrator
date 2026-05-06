import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './globalMetadata';

describe('globalMetadata slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect(next.checkedRows).toEqual(['a', 'b']);
    });

    test('listGlobalMetadata / success / failure', () => {
        let next = reducer(initialState, actions.listGlobalMetadata());
        expect(next.isFetchingList).toBe(true);
        expect(next.globalMetadataList).toEqual([]);

        next = reducer(next, actions.listGlobalMetadataSuccess([{ uuid: 'gm1' } as any]));
        expect(next.isFetchingList).toBe(false);
        expect(next.globalMetadataList).toHaveLength(1);

        next = reducer({ ...next, isFetchingList: true }, actions.listGlobalMetadataFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('createGlobalMetadata / success / failure', () => {
        let next = reducer(initialState, actions.createGlobalMetadata({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createGlobalMetadataSucceeded).toBe(false);

        next = reducer(next, actions.createGlobalMetadataSuccess({ uuid: 'gm1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createGlobalMetadataSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createGlobalMetadataFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createGlobalMetadataSucceeded).toBe(false);
    });

    test('updateGlobalMetadata / success / failure', () => {
        let next = reducer(initialState, actions.updateGlobalMetadata({ uuid: 'gm1', globalMetadataUpdateRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateGlobalMetadataSucceeded).toBe(false);

        next = reducer(next, actions.updateGlobalMetadataSuccess({ uuid: 'gm1', name: 'updated' } as any));
        expect(next.isUpdating).toBe(false);
        expect(next.updateGlobalMetadataSucceeded).toBe(true);
        expect(next.globalMetadata?.uuid).toBe('gm1');

        next = reducer({ ...next, isUpdating: true }, actions.updateGlobalMetadataFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateGlobalMetadataSucceeded).toBe(false);
    });

    test('getGlobalMetadata / success / failure', () => {
        let next = reducer(initialState, actions.getGlobalMetadata('gm1'));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.globalMetadata).toBeUndefined();

        next = reducer(next, actions.getGlobalMetadataSuccess({ uuid: 'gm1' } as any));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.globalMetadata?.uuid).toBe('gm1');

        next = reducer({ ...next, isFetchingDetail: true }, actions.getGlobalMetadataFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getConnectorList / success / failure', () => {
        let next = reducer(initialState, actions.getConnectorList());
        expect(next.isFetchingConnectorMetadata).toBe(true);

        next = reducer(next, actions.getConnectorListSuccess([{ uuid: 'conn1', name: 'c' }]));
        expect(next.isFetchingConnectorMetadata).toBe(false);
        expect(next.connectorList).toHaveLength(1);

        next = reducer({ ...next, isFetchingConnectorMetadata: true }, actions.getConnectorListFailure({ error: 'err' }));
        expect(next.isFetchingConnectorMetadata).toBe(false);
    });

    test('getConnectorMetadata / success / failure', () => {
        let next = reducer(initialState, actions.getConnectorMetadata('conn1'));
        expect(next.isFetchingConnectorMetadata).toBe(true);
        expect(next.connectorMetadata).toBeUndefined();

        next = reducer(next, actions.getConnectorMetadataSuccess([{ uuid: 'cm1' } as any]));
        expect(next.isFetchingConnectorMetadata).toBe(false);
        expect(next.connectorMetadata).toHaveLength(1);

        next = reducer({ ...next, isFetchingConnectorMetadata: true }, actions.getConnectorMetadataFailure({ error: 'err' }));
        expect(next.isFetchingConnectorMetadata).toBe(false);
    });

    test('promoteConnectorMetadata is a no-op on state', () => {
        const next = reducer(initialState, actions.promoteConnectorMetadata({ uuid: 'x', connectorUuid: 'y' }));
        expect(next).toEqual(initialState);
    });

    test('promoteConnectorMetadataSuccess adds to list and removes from connectorMetadata', () => {
        const state = {
            ...initialState,
            globalMetadataList: [{ uuid: 'gm1' } as any],
            connectorMetadata: [{ uuid: 'cm1' } as any, { uuid: 'cm2' } as any],
        };
        const next = reducer(
            state as any,
            actions.promoteConnectorMetadataSuccess({ uuid: 'cm1', globalMetadata: { uuid: 'gm-new' } as any }),
        );
        expect(next.globalMetadataList).toHaveLength(2);
        expect(next.connectorMetadata).toHaveLength(1);
        expect(next.connectorMetadata![0].uuid).toBe('cm2');
    });

    test('promoteConnectorMetadataSuccess with no matching connectorMetadata uuid', () => {
        const state = {
            ...initialState,
            globalMetadataList: [],
            connectorMetadata: [{ uuid: 'cm1' } as any],
        };
        const next = reducer(
            state as any,
            actions.promoteConnectorMetadataSuccess({ uuid: 'cm-notfound', globalMetadata: { uuid: 'gm-new' } as any }),
        );
        expect(next.globalMetadataList).toHaveLength(1);
        expect(next.connectorMetadata).toHaveLength(1);
    });

    test('promoteConnectorMetadataSuccess when connectorMetadata is undefined', () => {
        const state = { ...initialState, connectorMetadata: undefined };
        const next = reducer(
            state as any,
            actions.promoteConnectorMetadataSuccess({ uuid: 'cm1', globalMetadata: { uuid: 'gm-new' } as any }),
        );
        expect(next.globalMetadataList).toHaveLength(1);
    });

    test('promoteConnectorMetadataFailure is a no-op on state', () => {
        const next = reducer(initialState, actions.promoteConnectorMetadataFailure({ error: 'err' }));
        expect(next).toEqual(initialState);
    });

    test('deleteGlobalMetadata / success removes from list / failure', () => {
        const state = { ...initialState, globalMetadataList: [{ uuid: 'gm1' } as any] };
        let next = reducer(state as any, actions.deleteGlobalMetadata('gm1'));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteGlobalMetadataSuccess('gm1'));
        expect(next.isDeleting).toBe(false);
        expect(next.globalMetadataList).toHaveLength(0);

        const stateNoMatch = { ...initialState, globalMetadataList: [{ uuid: 'gm2' } as any] };
        const next2 = reducer(stateNoMatch as any, actions.deleteGlobalMetadataSuccess('gm-notfound'));
        expect(next2.globalMetadataList).toHaveLength(1);

        const nextFail = reducer({ ...initialState, isDeleting: true } as any, actions.deleteGlobalMetadataFailure({ error: 'err' }));
        expect(nextFail.isDeleting).toBe(false);
    });

    test('bulkDeleteGlobalMetadata / success removes items and clears detail / failure', () => {
        const state = {
            ...initialState,
            globalMetadataList: [{ uuid: 'gm1' } as any, { uuid: 'gm2' } as any],
            globalMetadata: { uuid: 'gm1' } as any,
            checkedRows: ['gm1', 'gm2'],
        };
        let next = reducer(state as any, actions.bulkDeleteGlobalMetadata(['gm1', 'gm2']));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteGlobalMetadataSuccess(['gm1', 'gm2']));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.globalMetadataList).toHaveLength(0);
        expect(next.globalMetadata).toBeUndefined();
        expect(next.checkedRows).toEqual([]);

        const stateNoMatch = {
            ...initialState,
            globalMetadataList: [{ uuid: 'gm3' } as any],
            globalMetadata: { uuid: 'gm3' } as any,
        };
        const next2 = reducer(stateNoMatch as any, actions.bulkDeleteGlobalMetadataSuccess(['gm-notfound']));
        expect(next2.globalMetadataList).toHaveLength(1);
        expect(next2.globalMetadata?.uuid).toBe('gm3');

        const nextFail = reducer(
            { ...initialState, isBulkDeleting: true } as any,
            actions.bulkDeleteGlobalMetadataFailure({ error: 'err' }),
        );
        expect(nextFail.isBulkDeleting).toBe(false);
    });
});

describe('globalMetadata selectors', () => {
    test('all selectors return correct values from feature state', () => {
        const featureState = {
            ...initialState,
            checkedRows: ['x'],
            globalMetadata: { uuid: 'gm1' } as any,
            globalMetadataList: [{ uuid: 'gm1' } as any],
            connectorList: [{ uuid: 'conn1', name: 'c' }],
            connectorMetadata: [{ uuid: 'cm1' } as any],
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingConnectorMetadata: true,
            isCreating: true,
            createGlobalMetadataSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isUpdating: true,
            updateGlobalMetadataSucceeded: true,
        } as any;

        const state = { globalMetadata: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['x']);
        expect(selectors.globalMetadata(state)?.uuid).toBe('gm1');
        expect(selectors.globalMetadataList(state)).toHaveLength(1);
        expect(selectors.connectorList(state)).toHaveLength(1);
        expect(selectors.connectorMetadata(state)).toHaveLength(1);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingConnectorMetadata(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createGlobalMetadataSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateGlobalMetadataSucceeded(state)).toBe(true);
    });
});
