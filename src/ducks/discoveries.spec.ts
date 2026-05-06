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
        next = reducer(next, actions.getDiscoveryProviderAttributesDescriptorsSuccess({ attributeDescriptor: descriptors }));
        expect(next.discoveryProviderAttributeDescriptors).toEqual(descriptors);
        expect(next.isFetchingDiscoveryProviderAttributeDescriptors).toBe(false);

        next = reducer(
            { ...next, isFetchingDiscoveryProviderAttributeDescriptors: true },
            actions.getDiscoveryProviderAttributeDescriptorsFailure({ error: 'err' }),
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
