import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './connectors';
import { AuthType, ConnectorStatus } from 'types/openapi';

describe('connectors slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer({ ...initialState, checkedRows: [] }, actions.setCheckedRows({ checkedRows: ['c-1', 'c-2'] }));
        expect(next.checkedRows).toEqual(['c-1', 'c-2']);
    });

    test('clearDeleteErrorMessages clears delete error state', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ code: 'E', message: 'x' }] as any },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('clearConnectionDetails clears connection details and connectInfo', () => {
        const next = reducer(
            {
                ...initialState,
                connectorConnectionDetails: [{ code: 'FG' }] as any,
                connectInfo: [{ foo: 'bar' }],
            },
            actions.clearConnectionDetails(),
        );
        expect(next.connectorConnectionDetails).toBeUndefined();
        expect(next.connectInfo).toBeUndefined();
    });

    test('clearCallbackData resets callbackData', () => {
        const next = reducer({ ...initialState, callbackData: { cb1: { x: 1 }, cb2: { y: 2 } } }, actions.clearCallbackData());
        expect(next.callbackData).toEqual({});
    });

    test('resetState restores initial values and clears unknown keys', () => {
        const dirtyState = {
            ...initialState,
            connectors: [{ uuid: 'c-1' }],
            connector: { uuid: 'detail-1' } as any,
            connectorHealth: { status: 'Up' } as any,
            isFetchingList: true,
            isCreating: true,
            tempOnlyKey: 'to-be-removed',
        } as any;

        const next = reducer(dirtyState, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempOnlyKey).toBeUndefined();
    });

    test('listConnectors / success / failure update list flags and data', () => {
        let next = reducer(initialState, actions.listConnectors({ pageNumber: 1, itemsPerPage: 10, filters: [] } as any));
        expect(next.isFetchingList).toBe(true);
        expect(next.connectors).toEqual([]);
        expect(next.checkedRows).toEqual([]);

        const connectorList = [{ uuid: 'c-1' }, { uuid: 'c-2' }] as any[];
        next = reducer(next, actions.listConnectorsSuccess({ connectorList }));
        expect(next.isFetchingList).toBe(false);
        expect(next.connectors).toEqual(connectorList);

        next = reducer({ ...next, isFetchingList: true }, actions.listConnectorsFailure());
        expect(next.isFetchingList).toBe(false);
    });

    test('listConnectorsMerge / success / failure merges by uuid without clearing existing list', () => {
        const existing = [{ uuid: 'c-1', name: 'Old' }] as any[];
        let next = reducer({ ...initialState, connectors: existing }, actions.listConnectorsMerge({}));
        expect(next.isFetchingList).toBe(true);

        const incoming = [
            { uuid: 'c-1', name: 'Updated' },
            { uuid: 'c-2', name: 'New' },
        ] as any[];
        next = reducer(next, actions.listConnectorsMergeSuccess({ connectorList: incoming }));

        expect(next.isFetchingList).toBe(false);
        expect(next.connectors).toHaveLength(2);
        expect(next.connectors.find((c) => c.uuid === 'c-1')!.name).toBe('Updated');
        expect(next.connectors.find((c) => c.uuid === 'c-2')).toBeDefined();

        next = reducer({ ...next, isFetchingList: true }, actions.listConnectorsMergeFailure());
        expect(next.isFetchingList).toBe(false);
    });

    test('getConnectorDetail / success / failure updates connector and flags', () => {
        let next = reducer(
            { ...initialState, connector: { uuid: 'old' } as any, connectorHealth: {} as any },
            actions.getConnectorDetail({ uuid: 'c-1' }),
        );
        expect(next.connector).toBeUndefined();
        expect(next.connectorHealth).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        const detail = { uuid: 'c-1', name: 'Detail' } as any;
        next = reducer(next, actions.getConnectorDetailSuccess({ connector: detail }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.connector).toEqual(detail);
        expect(next.connectors).toContainEqual(detail);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getConnectorDetailFailure());
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getConnectorDetailSuccess updates existing connector in list when found, pushes when not', () => {
        const detail = { uuid: 'c-1', name: 'Updated Detail' } as any;
        const existingList = [{ uuid: 'c-1', name: 'Old' } as any, { uuid: 'c-2' } as any];

        let next = reducer(
            { ...initialState, connectors: existingList, isFetchingDetail: true },
            actions.getConnectorDetailSuccess({ connector: detail }),
        );
        expect(next.connector).toEqual(detail);
        expect(next.connectors).toHaveLength(2);
        expect(next.connectors.find((c) => c.uuid === 'c-1')).toEqual(detail);

        const newDetail = { uuid: 'c-3', name: 'New' } as any;
        next = reducer(next, actions.getConnectorDetailSuccess({ connector: newDetail }));
        expect(next.connectors).toHaveLength(3);
        expect(next.connectors.find((c) => c.uuid === 'c-3')).toEqual(newDetail);
    });

    test('getConnectorInfoV2 and getConnectorInfoV2Success update connectorInfoV2', () => {
        let next = reducer({ ...initialState, connectorInfoV2: { old: true } }, actions.getConnectorInfoV2({ uuid: 'c-1' }));
        expect(next.connectorInfoV2).toBeUndefined();

        const info = { version: 'V2', interfaces: [] };
        next = reducer(next, actions.getConnectorInfoV2Success({ info }));
        expect(next.connectorInfoV2).toEqual(info);
    });

    test('getConnectorInfoV2Failure is no-op', () => {
        const prev = { ...initialState, connectorInfoV2: { x: 1 } } as any;
        const next = reducer(prev, actions.getConnectorInfoV2Failure());
        expect(next.connectorInfoV2).toEqual({ x: 1 });
    });

    test('getConnectorHealth / success / failure updates health and flags', () => {
        let next = reducer({ ...initialState, connectorHealth: { status: 'Old' } as any }, actions.getConnectorHealth({ uuid: 'c-1' }));
        expect(next.connectorHealth).toBeUndefined();
        expect(next.isFetchingHealth).toBe(true);

        const health = { status: 'Up' } as any;
        next = reducer(next, actions.getConnectorHealthSuccess({ health }));
        expect(next.isFetchingHealth).toBe(false);
        expect(next.connectorHealth).toEqual(health);

        next = reducer({ ...next, isFetchingHealth: true }, actions.getConnectorHealthFailure());
        expect(next.isFetchingHealth).toBe(false);
    });

    test('createConnector / success / failure updates list and flags', () => {
        const connector = { uuid: 'c-1', name: 'New' } as any;

        let next = reducer(initialState, actions.createConnector({ name: 'New' } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createConnectorSucceeded).toBe(false);

        next = reducer(next, actions.createConnectorSuccess({ connector }));
        expect(next.isCreating).toBe(false);
        expect(next.createConnectorSucceeded).toBe(true);
        expect(next.connectors).toContainEqual(connector);
        expect(next.connector).toEqual(connector);

        next = reducer({ ...next, isCreating: true }, actions.createConnectorFailure());
        expect(next.isCreating).toBe(false);
        expect(next.createConnectorSucceeded).toBe(false);
    });

    test('updateConnector / success / failure updates updateConnectorSucceeded', () => {
        const updated = { uuid: 'c-1', name: 'Updated' } as any;
        const listWithMatch = [{ uuid: 'c-1', name: 'Old' } as any, { uuid: 'c-2' } as any];

        let next = reducer(
            { ...initialState, connectors: listWithMatch, connector: { uuid: 'c-1', name: 'Old' } as any },
            actions.updateConnector({ uuid: 'c-1', connectorUpdateRequest: { name: 'Updated' } } as any),
        );
        expect(next.isUpdating).toBe(true);
        expect(next.updateConnectorSucceeded).toBe(false);

        next = reducer(next, actions.updateConnectorSuccess({ connector: updated }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateConnectorSucceeded).toBe(true);

        next = reducer({ ...next, isUpdating: true }, actions.updateConnectorFailure());
        expect(next.isUpdating).toBe(false);
        expect(next.updateConnectorSucceeded).toBe(false);
    });

    test('updateConnectorSuccess updates list by index or push, and current connector when uuid matches', () => {
        const updated = { uuid: 'c-1', name: 'Updated' } as any;
        const listWithMatch = [{ uuid: 'c-1', name: 'Old' } as any, { uuid: 'c-2' } as any];

        let next = reducer(
            { ...initialState, connectors: listWithMatch, connector: { uuid: 'c-1', name: 'Old' } as any, isUpdating: true },
            actions.updateConnectorSuccess({ connector: updated }),
        );
        expect(next.isUpdating).toBe(false);
        expect(next.connectors.find((c) => c.uuid === 'c-1')).toEqual(updated);
        expect(next.connector).toEqual(updated);

        const newConnector = { uuid: 'c-3', name: 'New' } as any;
        next = reducer({ ...next, connector: newConnector }, actions.updateConnectorSuccess({ connector: newConnector }));
        expect(next.connectors).toHaveLength(3);
        expect(next.connectors.find((c) => c.uuid === 'c-3')).toEqual(newConnector);
        expect(next.connector).toEqual(newConnector);
    });

    test('deleteConnector / success / failure updates list, detail and error message', () => {
        const connector = { uuid: 'c-1' } as any;
        let next = reducer(
            {
                ...initialState,
                connectors: [connector],
                connector,
                connectorHealth: {} as any,
                connectorAttributes: {} as any,
                connectorConnectionDetails: [] as any,
            },
            actions.deleteConnector({ uuid: 'c-1' }),
        );

        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteConnectorSuccess({ uuid: 'c-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.connectors).toEqual([]);
        expect(next.connector).toBeUndefined();
        expect(next.connectorHealth).toBeUndefined();
        expect(next.connectorAttributes).toBeUndefined();
        expect(next.connectorConnectionDetails).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteConnectorFailure({ error: 'failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('failed');
    });

    test('bulkDeleteConnectors / success / failure updates list or error messages', () => {
        const connectors = [{ uuid: 'c-1' } as any, { uuid: 'c-2' } as any, { uuid: 'c-3' } as any];

        let next = reducer({ ...initialState, connectors }, actions.bulkDeleteConnectors({ uuids: ['c-1', 'c-2'] }));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);

        // With errors: list should remain untouched and errors populated
        next = reducer(next, actions.bulkDeleteConnectorsSuccess({ uuids: ['c-1', 'c-2'], errors: [{ code: 'E', message: 'x' } as any] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.connectors).toHaveLength(3);
        expect(next.bulkDeleteErrorMessages).toHaveLength(1);

        // Without errors: targeted uuids should be removed
        next = reducer({ ...initialState, connectors }, actions.bulkDeleteConnectorsSuccess({ uuids: ['c-1', 'c-2'], errors: [] }));
        expect(next.connectors).toHaveLength(1);
        expect(next.connectors[0].uuid).toBe('c-3');

        // When current connector is in deleted uuids, clear connector and related state
        const withCurrentConnector = {
            ...initialState,
            connectors: [{ uuid: 'c-1' } as any, { uuid: 'c-2' } as any],
            connector: { uuid: 'c-1' } as any,
            connectorHealth: {} as any,
            connectorAttributes: {} as any,
            connectorConnectionDetails: [] as any,
            connectInfo: [],
        };
        next = reducer(withCurrentConnector, actions.bulkDeleteConnectorsSuccess({ uuids: ['c-1'], errors: [] }));
        expect(next.connectors).toHaveLength(1);
        expect(next.connector).toBeUndefined();
        expect(next.connectorHealth).toBeUndefined();
        expect(next.connectorAttributes).toBeUndefined();
        expect(next.connectorConnectionDetails).toBeUndefined();
        expect(next.connectInfo).toBeUndefined();

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteConnectorsFailure());
        expect(next.isBulkDeleting).toBe(false);
    });

    test('authorizeConnector / success / failure updates flags and status', () => {
        let next = reducer(initialState, actions.authorizeConnector({ uuid: 'c-1' }));
        expect(next.isAuthorizing).toBe(true);

        next = reducer(
            {
                ...next,
                connector: { uuid: 'c-1', status: ConnectorStatus.WaitingForApproval } as any,
            },
            actions.authorizeConnectorSuccess({ uuid: 'c-1' }),
        );
        expect(next.isAuthorizing).toBe(false);
        expect(next.connector!.status).toBe(ConnectorStatus.Connected);

        next = reducer({ ...next, isAuthorizing: true }, actions.authorizeConnectorFailure());
        expect(next.isAuthorizing).toBe(false);
    });

    test('attribute descriptors reducers update connectorAttributes and flags', () => {
        let next = reducer(
            { ...initialState, connectorAttributes: { group: { kind: [{ uuid: 'old' } as any] } } as any },
            actions.getConnectorAttributesDescriptors({ uuid: 'c-1', functionGroup: 'group' as any, kind: 'kind' }),
        );
        expect(next.isFetchingAttributes).toBe(true);
        expect(next.connectorAttributes?.group?.kind).toBeUndefined();

        const attrs = [{ uuid: 'a-1' } as any];
        next = reducer(next, actions.getConnectorAttributeDescriptorsSuccess({ functionGroup: 'group', kind: 'kind', attributes: attrs }));
        expect(next.isFetchingAllAttributes).toBe(false);
        expect(next.connectorAttributes?.group?.kind).toEqual(attrs);

        next = reducer({ ...next, isFetchingAllAttributes: true }, actions.getConnectorAttributesDescriptorsFailure());
        expect(next.isFetchingAllAttributes).toBe(false);
    });

    test('getConnectorAttributesDescriptors when functionGroup/kind missing does not delete', () => {
        const attrs = { otherGroup: { otherKind: [] } } as any;
        const next = reducer(
            { ...initialState, connectorAttributes: attrs },
            actions.getConnectorAttributesDescriptors({ uuid: 'c-1', functionGroup: 'missingGroup' as any, kind: 'missingKind' }),
        );
        expect(next.isFetchingAttributes).toBe(true);
        expect(next.connectorAttributes).toEqual(attrs);
    });

    test('getConnectorAllAttributesDescriptors reducers replace connectorAttributes', () => {
        let next = reducer(
            { ...initialState, connectorAttributes: { old: {} } as any },
            actions.getConnectorAllAttributesDescriptors({ uuid: 'c-1' }),
        );
        expect(next.isFetchingAllAttributes).toBe(true);
        expect(next.connectorAttributes).toBeUndefined();

        const collection = { group: { kind: [{ uuid: 'a-1' } as any] } } as any;
        next = reducer(next, actions.getConnectorAllAttributesDescriptorsSuccess({ attributeDescriptorCollection: collection }));
        expect(next.isFetchingAllAttributes).toBe(false);
        expect(next.connectorAttributes).toEqual(collection);

        next = reducer({ ...next, isFetchingAllAttributes: true }, actions.getAllConnectorAllAttributesDescriptorsFailure());
        expect(next.isFetchingAllAttributes).toBe(false);
    });

    test('connectConnector / success / failure updates connection details and flags', () => {
        let next = reducer(
            { ...initialState, connectorConnectionDetails: [{ code: 'Old' }] as any, connectInfo: [{}] },
            actions.connectConnector({ uuid: 'c-1' } as any),
        );
        expect(next.connectorConnectionDetails).toEqual([]);
        expect(next.connectInfo).toBeUndefined();
        expect(next.isConnecting).toBe(true);

        const details = [{ code: 'FG' }] as any[];
        next = reducer(next, actions.connectConnectorSuccess({ connectionDetails: details, connectInfo: [{}] }));
        expect(next.isConnecting).toBe(false);
        expect(next.connectorConnectionDetails).toEqual(details);
        expect(next.connectInfo).toEqual([{}]);

        next = reducer({ ...next, isConnecting: true }, actions.connectConnectorFailure());
        expect(next.isConnecting).toBe(false);
    });

    test('reconnectConnector / success / failure updates connection details and connector functionGroups', () => {
        let next = reducer(
            {
                ...initialState,
                connectorConnectionDetails: [{ code: 'Old' }] as any,
                connectInfo: [{}],
                connector: { uuid: 'c-1', functionGroups: [] } as any,
            },
            actions.reconnectConnector({ uuid: 'c-1' }),
        );
        expect(next.connectorConnectionDetails).toBeUndefined();
        expect(next.connectInfo).toBeUndefined();
        expect(next.isReconnecting).toBe(true);

        const fgs = [{ code: 'FG' }] as any[];
        next = reducer(next, actions.reconnectConnectorSuccess({ uuid: 'c-1', functionGroups: fgs, connectInfo: [{}] }));
        expect(next.isReconnecting).toBe(false);
        expect(next.connectorConnectionDetails).toEqual(fgs);
        expect(next.connector!.functionGroups).toEqual(fgs);

        next = reducer({ ...next, isReconnecting: true }, actions.reconnectConnectorFailure());
        expect(next.isReconnecting).toBe(false);
    });

    test('bulkReconnectConnectors / success / failure updates flag', () => {
        let next = reducer(initialState, actions.bulkReconnectConnectors({ uuids: ['c-1', 'c-2'] }));
        expect(next.isBulkReconnecting).toBe(true);

        next = reducer(next, actions.bulkReconnectConnectorsSuccess({ uuids: ['c-1', 'c-2'] }));
        expect(next.isBulkReconnecting).toBe(false);

        next = reducer({ ...next, isBulkReconnecting: true }, actions.bulkReconnectConnectorsFailure());
        expect(next.isBulkReconnecting).toBe(false);
    });

    test('bulkForceDeleteConnectors / success / failure removes connectors and clears detail when in uuids', () => {
        const connectors = [{ uuid: 'c-1' } as any, { uuid: 'c-2' } as any];
        let next = reducer(
            { ...initialState, connectors, connector: { uuid: 'c-1' } as any, connectorHealth: {} as any },
            actions.bulkForceDeleteConnectors({ uuids: ['c-1', 'c-2'] }),
        );
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteConnectorsSuccess({ uuids: ['c-1', 'c-2'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.connectors).toEqual([]);
        expect(next.connector).toBeUndefined();
        expect(next.connectorHealth).toBeUndefined();

        next = reducer({ ...next, isBulkForceDeleting: true }, actions.bulkForceDeleteConnectorsFailure());
        expect(next.isBulkForceDeleting).toBe(false);
    });

    test('callbackConnector sets isRunningCallback and clears existing callbackData', () => {
        const next = reducer(
            { ...initialState, callbackData: { cb1: { old: true } } },
            actions.callbackConnector({
                callbackId: 'cb1',
                callbackConnector: { uuid: 'x', functionGroup: 'fg', kind: 'k', requestAttributeCallback: { mappings: [] } } as any,
            }),
        );
        expect(next.callbackData.cb1).toBeUndefined();
        expect(next.isRunningCallback.cb1).toBe(true);
    });

    test('clearCallbackDataFor clears only the named callback data', () => {
        // given
        const state = { ...initialState, callbackData: { cleared: [{ data: 'a' }], kept: [{ data: 'b' }] } };

        // when
        const next = reducer(state, actions.clearCallbackDataFor({ callbackId: 'cleared' }));

        // then
        expect(next.callbackData.cleared).toBeUndefined();
        expect(next.callbackData.kept).toEqual([{ data: 'b' }]);
    });

    test('callbackResource and clear helpers update callbackData and isRunningCallback', () => {
        let next = reducer(
            { ...initialState, callbackData: { cb: { old: true } }, isRunningCallback: {} } as any,
            actions.callbackResource({
                callbackId: 'cb',
                callbackResource: { uuid: 'x', functionGroup: 'fg', kind: 'kind', requestAttributeCallback: {} as any } as any,
            }),
        );
        expect(next.callbackData.cb).toBeUndefined();
        expect(next.isRunningCallback.cb).toBe(true);

        next = reducer(next, actions.callbackSuccess({ callbackId: 'cb', data: { ok: true } }));
        expect(next.callbackData.cb).toEqual({ ok: true });
        expect(next.isRunningCallback.cb).toBe(false);

        next = reducer(next, actions.callbackFailure({ callbackId: 'cb' }));
        expect(next.isRunningCallback.cb).toBe(false);
    });

    test('each callback dispatch increments callbackSeq per callbackId; responses leave it unchanged', () => {
        const connectorPayload = {
            callbackId: 'cb1',
            callbackConnector: { uuid: 'x', functionGroup: 'fg', kind: 'k', requestAttributeCallback: { mappings: [] } } as any,
        };
        let next = reducer(initialState, actions.callbackConnector(connectorPayload));
        expect(next.callbackSeq.cb1).toBe(1);

        next = reducer(next, actions.callbackConnector(connectorPayload));
        expect(next.callbackSeq.cb1).toBe(2);

        next = reducer(
            next,
            actions.callbackResource({
                callbackId: 'cb2',
                callbackResource: { resource: 'raProfiles', parentObjectUuid: 'p', requestAttributeCallback: {} as any } as any,
            }),
        );
        expect(next.callbackSeq.cb2).toBe(1);
        expect(next.callbackSeq.cb1).toBe(2);

        next = reducer(next, actions.callbackSuccess({ callbackId: 'cb1', data: {} }));
        next = reducer(next, actions.callbackFailure({ callbackId: 'cb2' }));
        expect(next.callbackSeq.cb1).toBe(2);
        expect(next.callbackSeq.cb2).toBe(1);
    });
});

describe('connectors selectors', () => {
    test('selectors read values from connectors state', () => {
        const connectorsState = {
            ...initialState,
            checkedRows: ['c-1'],
            connectors: [{ uuid: 'c-1' } as any],
            connector: { uuid: 'c-1' } as any,
            connectorHealth: { status: 'Up' } as any,
            connectorAttributes: { group: 'g' } as any,
            connectorAuthAttributes: [{ name: 'username' }] as any,
            isFetchingAuthAttributes: true,
            connectorConnectionDetails: [{ code: 'FG' }] as any,
            connectInfo: [{ foo: 'bar' }],
            connectorInfoV2: { info: true },
            deleteErrorMessage: 'err',
            bulkDeleteErrorMessages: [{ code: 'E' } as any],
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingHealth: true,
            isFetchingAttributes: true,
            isFetchingAllAttributes: true,
            isCreating: true,
            createConnectorSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isBulkForceDeleting: true,
            isUpdating: true,
            updateConnectorSucceeded: true,
            isConnecting: true,
            isReconnecting: true,
            isBulkReconnecting: true,
            isAuthorizing: true,
            isBulkAuthorizing: true,
            isRunningCallback: { cb: true },
            callbackData: { cb: { result: 'ok' } },
        } as any;

        const state = { connectors: connectorsState } as any;

        expect(selectors.checkedRows(state)).toEqual(['c-1']);
        expect(selectors.connectors(state)).toEqual(connectorsState.connectors);
        expect(selectors.connector(state)).toEqual(connectorsState.connector);
        expect(selectors.connectorHealth(state)).toEqual(connectorsState.connectorHealth);
        expect(selectors.connectorAttributes(state)).toEqual(connectorsState.connectorAttributes);
        expect(selectors.connectorAuthAttributes(state)).toEqual(connectorsState.connectorAuthAttributes);
        expect(selectors.isFetchingAuthAttributes(state)).toBe(connectorsState.isFetchingAuthAttributes);
        expect(selectors.connectorConnectionDetails(state)).toEqual(connectorsState.connectorConnectionDetails);
        expect(selectors.connectorConnectInfo(state)).toEqual(connectorsState.connectInfo);
        expect(selectors.connectorInfoV2(state)).toEqual(connectorsState.connectorInfoV2);
        expect(selectors.callbackData(state)).toEqual(connectorsState.callbackData);
        expect(selectors.deleteErrorMessage(state)).toBe('err');
        expect(selectors.bulkDeleteErrorMessages(state)).toEqual(connectorsState.bulkDeleteErrorMessages);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingHealth(state)).toBe(true);
        expect(selectors.isFetchingAttributes(state)).toBe(true);
        expect(selectors.isFetchingAllAttributes(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createConnectorSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateConnectorSucceeded(state)).toBe(true);
        expect(selectors.isConnecting(state)).toBe(true);
        expect(selectors.isBulkConnecting(state)).toBe(true);
        expect(selectors.isReconnecting(state)).toBe(true);
        expect(selectors.isBulkReconnecting(state)).toBe(true);
        expect(selectors.isAuthorizing(state)).toBe(true);
        expect(selectors.isBulkAuthorizing(state)).toBe(true);
        expect(selectors.isRunningCallback(state)).toEqual({ cb: true });
    });

    test('getConnectorAuthAttributesDescriptors / success / failure update auth attribute state', () => {
        let next = reducer(
            { ...initialState, connectorAuthAttributes: [{ name: 'stale' }] as any },
            actions.getConnectorAuthAttributesDescriptors({ authType: AuthType.Basic }),
        );
        expect(next.isFetchingAuthAttributes).toBe(true);
        expect(next.connectorAuthAttributes).toBeUndefined();

        const attributes = [{ name: 'username' }, { name: 'password' }] as any;
        next = reducer(next, actions.getConnectorAuthAttributesDescriptorsSuccess({ attributes }));
        expect(next.isFetchingAuthAttributes).toBe(false);
        expect(next.connectorAuthAttributes).toEqual(attributes);

        next = reducer({ ...next, isFetchingAuthAttributes: true }, actions.getConnectorAuthAttributesDescriptorsFailure());
        expect(next.isFetchingAuthAttributes).toBe(false);
    });

    test('clearConnectorAuthAttributesDescriptors clears descriptors and fetching flag', () => {
        const next = reducer(
            { ...initialState, connectorAuthAttributes: [{ name: 'username' }] as any, isFetchingAuthAttributes: true },
            actions.clearConnectorAuthAttributesDescriptors(),
        );
        expect(next.connectorAuthAttributes).toBeUndefined();
        expect(next.isFetchingAuthAttributes).toBe(false);
    });

    test('bulkAuthorizeConnectorsSuccess asks the host to re-read its own listing request', () => {
        const next = reducer({ ...initialState, isBulkAuthorizing: true }, actions.bulkAuthorizeConnectorsSuccess({ uuids: ['c-1'] }));

        expect(next.isBulkAuthorizing).toBe(false);
        expect(next.listRefreshToken).toBe(initialState.listRefreshToken + 1);
        expect(selectors.listRefreshToken({ connectors: next } as any)).toBe(initialState.listRefreshToken + 1);
    });
});
