import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './discoveries';

describe('discoveries slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isFetchingDetail: true, discovery: { uuid: 'x' } } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('clearDiscoveryProviderAttributeDescriptors empties descriptors', () => {
        const pre = { ...initialState, discoveryProviderAttributeDescriptors: [{ uuid: 'a' } as any] };
        const next = reducer(pre, actions.clearDiscoveryProviderAttributeDescriptors());
        expect(next.discoveryProviderAttributeDescriptors).toEqual([]);
    });

    test('listDiscoveryProviders / success / failure', () => {
        let next = reducer({ ...initialState, discoveryProviders: [{ uuid: 'p-1' } as any] }, actions.listDiscoveryProviders());
        expect(next.discoveryProviders).toBeUndefined();
        expect(next.isFetchingDiscoveryProviders).toBe(true);

        const providers = [{ uuid: 'p-1' } as any, { uuid: 'p-2' } as any];
        next = reducer(next, actions.listDiscoveryProvidersSuccess({ connectors: providers }));
        expect(next.discoveryProviders).toEqual(providers);
        expect(next.isFetchingDiscoveryProviders).toBe(false);

        next = reducer({ ...next, isFetchingDiscoveryProviders: true }, actions.listDiscoveryProvidersFailure({ error: 'err' }));
        expect(next.isFetchingDiscoveryProviders).toBe(false);
    });

    test('getDiscoveryProviderAttributesDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.getDiscoveryProviderAttributesDescriptors({ uuid: 'p-1', kind: 'test' }));
        expect(next.discoveryProviderAttributeDescriptors).toEqual([]);
        expect(next.isFetchingDiscoveryProviderAttributeDescriptors).toBe(true);

        const descriptors = [{ uuid: 'attr-1' } as any];
        next = reducer(
            next,
            actions.getDiscoveryProviderAttributesDescriptorsSuccess({ connectorUuid: 'p-1', attributeDescriptor: descriptors }),
        );
        expect(next.discoveryProviderAttributeDescriptors).toEqual(descriptors);
        expect(next.isFetchingDiscoveryProviderAttributeDescriptors).toBe(false);

        next = reducer(
            { ...next, isFetchingDiscoveryProviderAttributeDescriptors: true },
            actions.getDiscoveryProviderAttributeDescriptorsFailure({ connectorUuid: 'p-1', error: 'err' }),
        );
        expect(next.isFetchingDiscoveryProviderAttributeDescriptors).toBe(false);
    });

    test('getDiscoveryCertificates / success / failure', () => {
        let next = reducer(
            { ...initialState, discoveryCertificates: { certificates: [] } as any },
            actions.getDiscoveryCertificates({ discoveryUuid: 'd-1' } as any),
        );
        expect(next.discoveryCertificates).toBeUndefined();
        expect(next.isFetchingDiscoveryCertificates).toBe(true);

        const certs = { certificates: [{ uuid: 'c-1' }] } as any;
        next = reducer(next, actions.getDiscoveryCertificatesSuccess(certs));
        expect(next.discoveryCertificates).toEqual(certs);
        expect(next.isFetchingDiscoveryCertificates).toBe(false);

        next = reducer({ ...next, isFetchingDiscoveryCertificates: true }, actions.getDiscoveryCertificatesFailure({ error: 'err' }));
        expect(next.isFetchingDiscoveryCertificates).toBe(false);
    });

    test('listDiscoveries clears list', () => {
        const pre = { ...initialState, discoveries: [{ uuid: 'd-1' } as any] };
        const next = reducer(pre, actions.listDiscoveries({} as any));
        expect(next.discoveries).toEqual([]);
    });

    test('listDiscoveriesSuccess populates list', () => {
        const items = [{ uuid: 'd-1' } as any, { uuid: 'd-2' } as any];
        const next = reducer(initialState, actions.listDiscoveriesSuccess(items));
        expect(next.discoveries).toEqual(items);
    });

    test('getDiscoveryDetail / success (existing in list) / failure', () => {
        const pre = {
            ...initialState,
            discoveries: [{ uuid: 'd-1', name: 'old' } as any],
        };

        let next = reducer(pre, actions.getDiscoveryDetail({ uuid: 'd-1' }));
        expect(next.discovery).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        const detail = { uuid: 'd-1', name: 'new' } as any;
        next = reducer(next, actions.getDiscoveryDetailSuccess({ discovery: detail }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.discovery).toEqual(detail);
        expect(next.discoveries[0]).toEqual(detail);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getDiscoveryDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getDiscoveryDetailSuccess pushes new discovery when not in list', () => {
        const next = reducer(
            { ...initialState, discoveries: [] },
            actions.getDiscoveryDetailSuccess({ discovery: { uuid: 'd-99' } as any }),
        );
        expect(next.discoveries).toHaveLength(1);
        expect(next.discoveries[0].uuid).toBe('d-99');
    });

    test('createDiscovery / success / failure flags', () => {
        let next = reducer(initialState, actions.createDiscovery({ scheduled: false, request: {} as any } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createDiscoverySucceeded).toBe(false);

        next = reducer(next, actions.createDiscoverySuccess({ uuid: 'd-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createDiscoverySucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createDiscoveryFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createDiscoverySucceeded).toBe(false);
    });

    test('deleteDiscovery / success (in list + current) / failure', () => {
        const pre = {
            ...initialState,
            discoveries: [{ uuid: 'd-1' } as any, { uuid: 'd-2' } as any],
            discovery: { uuid: 'd-1' } as any,
        };

        let next = reducer(pre, actions.deleteDiscovery({ uuid: 'd-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteDiscoverySuccess({ uuid: 'd-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.discoveries).toHaveLength(1);
        expect(next.discoveries[0].uuid).toBe('d-2');
        expect(next.discovery).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteDiscoveryFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('deleteDiscoverySuccess does not clear discovery when uuid differs', () => {
        const pre = {
            ...initialState,
            discoveries: [{ uuid: 'd-1' } as any],
            discovery: { uuid: 'd-2' } as any,
        };
        const next = reducer(pre, actions.deleteDiscoverySuccess({ uuid: 'd-1' }));
        expect(next.discovery).toBeDefined();
    });

    test('bulkDeleteDiscovery / success removes listed uuids / failure', () => {
        const pre = {
            ...initialState,
            discoveries: [{ uuid: 'd-1' } as any, { uuid: 'd-2' } as any, { uuid: 'd-3' } as any],
            discovery: { uuid: 'd-1' } as any,
        };

        let next = reducer(pre, actions.bulkDeleteDiscovery({ uuids: ['d-1', 'd-2'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteDiscoverySuccess({ uuids: ['d-1', 'd-2'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.discoveries).toHaveLength(1);
        expect(next.discoveries[0].uuid).toBe('d-3');
        expect(next.discovery).toBeUndefined();

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteDiscoveryFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkDeleteDiscoverySuccess does not clear discovery when uuid not in deleted list', () => {
        const pre = {
            ...initialState,
            discoveries: [{ uuid: 'd-1' } as any],
            discovery: { uuid: 'd-2' } as any,
        };
        const next = reducer(pre, actions.bulkDeleteDiscoverySuccess({ uuids: ['d-1'] }));
        expect(next.discovery).toBeDefined();
    });

    test('initial state sets succeeded flags to false', () => {
        expect(initialState.createDiscoverySucceeded).toBe(false);
    });
});

describe('discoveries slice - v2 additions', () => {
    test('listDiscoveryResources / success / failure / clear', () => {
        let next = reducer(
            { ...initialState, discoveryResources: ['certificates'] as any },
            actions.listDiscoveryResources({ connectorUuid: 'c-1' }),
        );
        expect(next.discoveryResources).toBeUndefined();
        expect(next.isFetchingDiscoveryResources).toBe(true);

        next = reducer(next, actions.listDiscoveryResourcesSuccess({ resources: ['certificates', 'keys'] as any }));
        expect(next.discoveryResources).toEqual(['certificates', 'keys']);
        expect(next.isFetchingDiscoveryResources).toBe(false);

        next = reducer({ ...next, isFetchingDiscoveryResources: true }, actions.listDiscoveryResourcesFailure({ error: 'err' }));
        expect(next.isFetchingDiscoveryResources).toBe(false);

        next = reducer(next, actions.clearDiscoveryResources());
        expect(next.discoveryResources).toBeUndefined();
    });

    test('the v2 run-level relay fills the same descriptor slot as the v1 path', () => {
        const next = reducer(
            { ...initialState, discoveryProviderAttributeDescriptors: [{ uuid: 'stale' } as any] },
            actions.getDiscoveryInterfaceAttributesDescriptors({ connectorUuid: 'c-1' }),
        );
        expect(next.discoveryProviderAttributeDescriptors).toEqual([]);
        expect(next.isFetchingDiscoveryProviderAttributeDescriptors).toBe(true);
    });

    test('per-resource descriptors are keyed by resource and tracked in flight independently', () => {
        let next = reducer(
            initialState,
            actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-1', resource: 'keys' as any }),
        );
        next = reducer(next, actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-1', resource: 'certificates' as any }));
        expect(next.fetchingResourceAttributeDescriptors).toEqual(['keys', 'certificates']);

        next = reducer(
            next,
            actions.getDiscoveryResourceAttributesDescriptorsSuccess({
                connectorUuid: 'c-1',
                resource: 'keys' as any,
                attributeDescriptor: [{ uuid: 'k' } as any],
            }),
        );
        expect(next.discoveryProviderResourceAttributeDescriptors.keys).toEqual([{ uuid: 'k' }]);
        expect(next.fetchingResourceAttributeDescriptors).toEqual(['certificates']);

        next = reducer(
            next,
            actions.getDiscoveryResourceAttributesDescriptorsFailure({
                connectorUuid: 'c-1',
                resource: 'certificates' as any,
                error: 'err',
            }),
        );
        expect(next.fetchingResourceAttributeDescriptors).toEqual([]);
        expect(next.discoveryProviderResourceAttributeDescriptors.certificates).toBeUndefined();

        next = reducer(next, actions.clearDiscoveryResourceAttributeDescriptors({ resource: 'keys' as any }));
        expect(next.discoveryProviderResourceAttributeDescriptors).toEqual({});
    });

    test('a run-level answer for a connector that is no longer selected is ignored', () => {
        let next = reducer(initialState, actions.getDiscoveryInterfaceAttributesDescriptors({ connectorUuid: 'c-1' }));
        next = reducer(next, actions.getDiscoveryProviderAttributesDescriptors({ uuid: 'c-2', kind: 'IP-HostName' }));

        const stale = reducer(
            next,
            actions.getDiscoveryProviderAttributesDescriptorsSuccess({
                connectorUuid: 'c-1',
                attributeDescriptor: [{ uuid: 'old' } as any],
            }),
        );
        expect(stale.discoveryProviderAttributeDescriptors).toEqual([]);
        expect(stale.isFetchingDiscoveryProviderAttributeDescriptors).toBe(true);

        const current = reducer(
            stale,
            actions.getDiscoveryProviderAttributesDescriptorsSuccess({
                connectorUuid: 'c-2',
                attributeDescriptor: [{ uuid: 'new' } as any],
            }),
        );
        expect(current.discoveryProviderAttributeDescriptors).toEqual([{ uuid: 'new' }]);
        expect(current.isFetchingDiscoveryProviderAttributeDescriptors).toBe(false);
    });

    test('a per-resource answer for a connector that is no longer selected is ignored', () => {
        let next = reducer(
            initialState,
            actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-1', resource: 'keys' as any }),
        );
        next = reducer(next, actions.clearDiscoveryResourceAttributeDescriptors({}));
        next = reducer(next, actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-2', resource: 'keys' as any }));

        const stale = reducer(
            next,
            actions.getDiscoveryResourceAttributesDescriptorsSuccess({
                connectorUuid: 'c-1',
                resource: 'keys' as any,
                attributeDescriptor: [{ uuid: 'old' } as any],
            }),
        );
        expect(stale.discoveryProviderResourceAttributeDescriptors.keys).toBeUndefined();
        expect(stale.fetchingResourceAttributeDescriptors).toEqual(['keys']);
    });

    test('clearing every per-resource set also forgets what was in flight for the previous provider', () => {
        const pre = {
            ...initialState,
            discoveryProviderResourceAttributeDescriptors: { keys: [] },
            fetchingResourceAttributeDescriptors: ['certificates'],
        } as any;
        const next = reducer(pre, actions.clearDiscoveryResourceAttributeDescriptors({}));
        expect(next.fetchingResourceAttributeDescriptors).toEqual([]);
    });

    test('a detail refresh keeps the current run on screen while a first load does not', () => {
        const shown = { ...initialState, discovery: { uuid: 'd-1' } } as any;

        const refreshing = reducer(shown, actions.getDiscoveryDetail({ uuid: 'd-1', keepCurrent: true }));
        expect(refreshing.discovery).toEqual({ uuid: 'd-1' });
        expect(refreshing.isFetchingDetail).toBe(true);

        const loading = reducer(shown, actions.getDiscoveryDetail({ uuid: 'd-2' }));
        expect(loading.discovery).toBeUndefined();
    });

    test('clearing without a resource drops every per-resource set', () => {
        const pre = { ...initialState, discoveryProviderResourceAttributeDescriptors: { keys: [], certificates: [] } };
        expect(reducer(pre, actions.clearDiscoveryResourceAttributeDescriptors({})).discoveryProviderResourceAttributeDescriptors).toEqual(
            {},
        );
    });

    test('getDiscoveryItems / success / failure', () => {
        let next = reducer({ ...initialState, discoveryItems: { items: [] } as any }, actions.getDiscoveryItems({ uuid: 'd-1' }));
        expect(next.discoveryItems).toBeUndefined();
        expect(next.isFetchingDiscoveryItems).toBe(true);

        const page = { items: [{ uuid: 'i-1' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;
        next = reducer(next, actions.getDiscoveryItemsSuccess(page));
        expect(next.discoveryItems).toEqual(page);
        expect(next.isFetchingDiscoveryItems).toBe(false);

        next = reducer({ ...next, isFetchingDiscoveryItems: true }, actions.getDiscoveryItemsFailure({ error: 'err' }));
        expect(next.isFetchingDiscoveryItems).toBe(false);
    });

    test('getDiscoveryMessages / success / failure', () => {
        let next = reducer(initialState, actions.getDiscoveryMessages({ uuid: 'd-1' }));
        expect(next.isFetchingDiscoveryMessages).toBe(true);

        const page = { items: [{ code: 'X' }], totalItems: 1, pageNumber: 1, itemsPerPage: 10, totalPages: 1 } as any;
        next = reducer(next, actions.getDiscoveryMessagesSuccess(page));
        expect(next.discoveryMessages).toEqual(page);
        expect(next.isFetchingDiscoveryMessages).toBe(false);

        next = reducer({ ...next, isFetchingDiscoveryMessages: true }, actions.getDiscoveryMessagesFailure({ error: 'err' }));
        expect(next.isFetchingDiscoveryMessages).toBe(false);
    });

    test.each([
        ['stop', actions.stopDiscovery, actions.stopDiscoverySuccess, actions.stopDiscoveryFailure, 'isStopping'],
        ['resume', actions.resumeDiscovery, actions.resumeDiscoverySuccess, actions.resumeDiscoveryFailure, 'isResuming'],
        ['cancel', actions.cancelDiscovery, actions.cancelDiscoverySuccess, actions.cancelDiscoveryFailure, 'isCancelling'],
    ] as const)('%s lifecycle action toggles its flag and nothing else', (_name, start, success, failure, flag) => {
        let next = reducer(initialState, start({ uuid: 'd-1' }));
        expect(next[flag]).toBe(true);

        next = reducer(next, success({ uuid: 'd-1' }));
        expect(next[flag]).toBe(false);
        // The detail is re-read by the epic rather than patched here: a 204 carries no state.
        expect(next.discovery).toBeUndefined();

        next = reducer(reducer(initialState, start({ uuid: 'd-1' })), failure({ error: 'refused' }));
        expect(next[flag]).toBe(false);
    });

    test('new selectors read their slots', () => {
        const featureState = {
            ...initialState,
            discoveryResources: ['keys'],
            discoveryProviderResourceAttributeDescriptors: { keys: [] },
            fetchingResourceAttributeDescriptors: ['keys'],
            discoveryItems: { items: [] },
            discoveryMessages: { items: [] },
            isFetchingDiscoveryResources: true,
            isFetchingDiscoveryItems: true,
            isFetchingDiscoveryMessages: true,
            isStopping: true,
            isResuming: true,
            isCancelling: true,
        } as any;
        const state = { discoveries: featureState } as any;

        expect(selectors.discoveryResources(state)).toEqual(['keys']);
        expect(selectors.discoveryProviderResourceAttributeDescriptors(state)).toEqual({ keys: [] });
        expect(selectors.fetchingResourceAttributeDescriptors(state)).toEqual(['keys']);
        expect(selectors.discoveryItems(state)).toEqual({ items: [] });
        expect(selectors.discoveryMessages(state)).toEqual({ items: [] });
        expect(selectors.isFetchingDiscoveryResources(state)).toBe(true);
        expect(selectors.isFetchingDiscoveryItems(state)).toBe(true);
        expect(selectors.isFetchingDiscoveryMessages(state)).toBe(true);
        expect(selectors.isStopping(state)).toBe(true);
        expect(selectors.isResuming(state)).toBe(true);
        expect(selectors.isCancelling(state)).toBe(true);
    });
});

describe('discoveries selectors', () => {
    test('all selectors read correct values from store', () => {
        const featureState = {
            ...initialState,
            discovery: { uuid: 'd-1' },
            discoveries: [{ uuid: 'd-1' }, { uuid: 'd-2' }],
            discoveryProviders: [{ uuid: 'p-1' }],
            discoveryProviderAttributeDescriptors: [{ uuid: 'attr-1' }],
            discoveryCertificates: { certificates: [] },
            isFetchingDiscoveryProviders: true,
            isFetchingDiscoveryProviderAttributeDescriptors: true,
            isFetchingDiscoveryCertificates: true,
            isFetchingDetail: true,
            isCreating: true,
            createDiscoverySucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
        } as any;

        const state = { discoveries: featureState } as any;

        expect(selectors.discovery(state)).toEqual({ uuid: 'd-1' });
        expect(selectors.discoveries(state)).toHaveLength(2);
        expect(selectors.discoveryProviders(state)).toHaveLength(1);
        expect(selectors.discoveryProviderAttributeDescriptors(state)).toHaveLength(1);
        expect(selectors.discoveryCertificates(state)).toBeDefined();
        expect(selectors.isFetchingDiscoveryProviders(state)).toBe(true);
        expect(selectors.isFetchingDiscoveryProviderAttributeDescriptors(state)).toBe(true);
        expect(selectors.isFetchingDiscoveryCertificates(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createDiscoverySucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.state(state)).toBe(featureState);
    });
});
