import { describe, expect, test } from 'vitest';
import { TokenInstanceStatus } from 'types/openapi';

import reducer, { actions, getTokenAttributesQueryKey, initialState, selectors } from './tokens';

describe('tokens slice', () => {
    test('getTokenAttributesQueryKey_normalizesKind', () => {
        // given
        const connectorUuid = 'c-1';

        // when
        const trimmedKindKey = getTokenAttributesQueryKey({ connectorUuid, kind: '  TOKEN  ' });
        const normalizedKindKey = getTokenAttributesQueryKey({ connectorUuid, kind: 'TOKEN' });
        const blankKindKey = getTokenAttributesQueryKey({ connectorUuid, kind: '   ' });
        const omittedKindKey = getTokenAttributesQueryKey({ connectorUuid });

        // then
        expect(trimmedKindKey).toBe(normalizedKindKey);
        expect(blankKindKey).toBe(omittedKindKey);
    });

    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            token: { uuid: 't-1' } as any,
            tokens: [{ uuid: 't-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['t-1', 't-2'] }));
        expect(next.checkedRows).toEqual(['t-1', 't-2']);
    });

    test('clearDeleteErrorMessages', () => {
        const next = reducer({ ...initialState, deleteErrorMessage: 'err' }, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBe('');
    });

    test('clearTokenProviderAttributeDescriptors', () => {
        // given
        const activeQueryKey = getTokenAttributesQueryKey({ connectorUuid: 'c-1', kind: 'TOKEN' });

        // when
        const next = reducer(
            {
                ...initialState,
                tokenProviderAttributeDescriptors: [{ uuid: 'd-1' } as any],
                tokenProviderAttributesQueryKey: activeQueryKey,
                isFetchingTokenProviderAttributeDescriptors: true,
            },
            actions.clearTokenProviderAttributeDescriptors(),
        );

        // then
        expect(next.tokenProviderAttributeDescriptors).toEqual([]);
        expect(next.tokenProviderAttributesQueryKey).toBeUndefined();
        expect(next.isFetchingTokenProviderAttributeDescriptors).toBe(false);
    });

    test('clearActivationAttributesDescriptors', () => {
        const next = reducer(
            { ...initialState, activationAttributeDescriptors: [{ uuid: 'd-1' } as any] },
            actions.clearActivationAttributesDescriptors(),
        );
        expect(next.activationAttributeDescriptors).toBeUndefined();
    });

    test('clearTokenProfileAttributesDescriptors', () => {
        const next = reducer(
            { ...initialState, tokenProfileAttributeDescriptors: [{ uuid: 'd-1' } as any] },
            actions.clearTokenProfileAttributesDescriptors(),
        );
        expect(next.tokenProfileAttributeDescriptors).toEqual([]);
    });

    test('listTokenProviders / success / failure', () => {
        let next = reducer(initialState, actions.listTokenProviders());
        expect(next.isFetchingTokenProviders).toBe(true);

        const connectors = [{ uuid: 'c-1' }] as any[];
        next = reducer(next, actions.listTokenProvidersSuccess({ connectors }));
        expect(next.isFetchingTokenProviders).toBe(false);
        expect(next.tokenProviders).toEqual(connectors);

        next = reducer({ ...next, isFetchingTokenProviders: true }, actions.listTokenProvidersFailure({ error: 'err' }));
        expect(next.isFetchingTokenProviders).toBe(false);
    });

    test('ensureTokenProviders_reusesLoadedCatalogue', () => {
        // given
        const cachedProviders = [{ uuid: 'cached-provider' }] as any[];
        const loadedState = { ...initialState, tokenProviders: cachedProviders };

        // when
        const next = reducer(loadedState, actions.ensureTokenProviders());

        // then
        expect(next.tokenProviders).toBe(cachedProviders);
        expect(next.isFetchingTokenProviders).toBe(false);
    });

    test('getTokenProviderAttributesDescriptors / success / failure', () => {
        // given
        const query = { connectorUuid: 'c-1', kind: 'TOKEN' };
        const queryKey = getTokenAttributesQueryKey(query);
        const descriptors = [{ uuid: 'd-1' }] as any[];

        // when
        let next = reducer(initialState, actions.getTokenProviderAttributesDescriptors(query));
        next = reducer(next, actions.getTokenProviderAttributesDescriptorsSuccess({ queryKey, attributeDescriptor: descriptors }));

        // then
        expect(next.tokenProviderAttributesQueryKey).toBe(queryKey);
        expect(next.isFetchingTokenProviderAttributeDescriptors).toBe(false);
        expect(next.tokenProviderAttributeDescriptors).toEqual(descriptors);

        // when
        next = reducer(
            { ...next, isFetchingTokenProviderAttributeDescriptors: true },
            actions.getTokenProviderAttributeDescriptorsFailure({ queryKey, error: 'err' }),
        );

        // then
        expect(next.isFetchingTokenProviderAttributeDescriptors).toBe(false);
    });

    test('getTokenProviderAttributesDescriptors ignores stale success and failure actions', () => {
        // given
        const previousQueryKey = getTokenAttributesQueryKey({ connectorUuid: 'c-1', kind: 'FIRST' });
        const currentQuery = { connectorUuid: 'c-1', kind: 'SECOND' };
        const currentQueryKey = getTokenAttributesQueryKey(currentQuery);
        const staleDescriptors = [{ uuid: 'stale' }] as any[];

        // when
        let next = reducer(initialState, actions.getTokenProviderAttributesDescriptors(currentQuery));
        next = reducer(
            next,
            actions.getTokenProviderAttributesDescriptorsSuccess({
                queryKey: previousQueryKey,
                attributeDescriptor: staleDescriptors,
            }),
        );
        next = reducer(next, actions.getTokenProviderAttributeDescriptorsFailure({ queryKey: previousQueryKey, error: 'stale' }));

        // then
        expect(next.tokenProviderAttributesQueryKey).toBe(currentQueryKey);
        expect(next.isFetchingTokenProviderAttributeDescriptors).toBe(true);
        expect(next.tokenProviderAttributeDescriptors).toEqual([]);
        expect(next.tokenProviderAttributeDescriptorsByQueryKey[previousQueryKey]).toEqual(staleDescriptors);
    });

    test('ensureTokenProviderAttributesDescriptors_reusesSchemaByNormalizedQueryKey', () => {
        // given
        const cachedQuery = { connectorUuid: 'connector-1', kind: 'PKCS11' };
        const cachedQueryKey = getTokenAttributesQueryKey(cachedQuery);
        const cachedDescriptors = [{ uuid: 'cached-descriptor' }] as any[];
        const loadedState = {
            ...initialState,
            tokenProviderAttributeDescriptorsByQueryKey: { [cachedQueryKey]: cachedDescriptors },
        };

        // when
        const next = reducer(
            loadedState,
            actions.ensureTokenProviderAttributesDescriptors({ connectorUuid: cachedQuery.connectorUuid, kind: '  PKCS11  ' }),
        );

        // then
        expect(next.tokenProviderAttributeDescriptors).toEqual(cachedDescriptors);
        expect(next.isFetchingTokenProviderAttributeDescriptors).toBe(false);
        expect(selectors.hasTokenProviderAttributeDescriptors({ tokens: next } as any)).toBe(true);
    });

    test('connectorMutation_invalidatesProviderCatalogueAndSchemas', () => {
        // given
        const queryKey = getTokenAttributesQueryKey({ connectorUuid: 'connector-1' });
        const loadedState = {
            ...initialState,
            tokenProviders: [{ uuid: 'connector-1' }] as any[],
            tokenProviderAttributeDescriptors: [{ uuid: 'descriptor-1' }] as any[],
            tokenProviderAttributeDescriptorsByQueryKey: { [queryKey]: [{ uuid: 'descriptor-1' }] as any[] },
            tokenProviderAttributesQueryKey: queryKey,
        };

        // when
        const next = reducer(loadedState, { type: 'connectors/reconnectConnectorSuccess', payload: { uuid: 'connector-1' } });

        // then
        expect(next.tokenProviders).toBeUndefined();
        expect(next.tokenProviderAttributeDescriptorsByQueryKey).toEqual({});
        expect(next.tokenProviderAttributeDescriptors).toEqual([]);
    });

    test('getTokenProfileAttributesDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.getTokenProfileAttributesDescriptors({ tokenUuid: 't-1' }));
        expect(next.isFetchingTokenProfileAttributesDescriptors).toBe(true);

        const descriptors = [{ uuid: 'd-1' }] as any[];
        next = reducer(next, actions.getTokenProfileAttributesDescriptorsSuccess({ tokenUuid: 't-1', attributesDescriptors: descriptors }));
        expect(next.isFetchingTokenProfileAttributesDescriptors).toBe(false);
        expect(next.tokenProfileAttributeDescriptors).toEqual(descriptors);

        next = reducer(
            { ...next, isFetchingTokenProfileAttributesDescriptors: true },
            actions.getTokenProfileAttributesDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingTokenProfileAttributesDescriptors).toBe(false);
    });

    test('listTokens / success / failure', () => {
        let next = reducer(initialState, actions.listTokens());
        expect(next.isFetchingList).toBe(true);
        expect(next.tokens).toEqual([]);

        const tokenList = [{ uuid: 't-1' }, { uuid: 't-2' }] as any[];
        next = reducer(next, actions.listTokensSuccess({ tokenList }));
        expect(next.isFetchingList).toBe(false);
        expect(next.tokens).toEqual(tokenList);

        next = reducer({ ...next, isFetchingList: true }, actions.listTokensFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getTokenDetail / success / failure', () => {
        let next = reducer(initialState, actions.getTokenDetail({ uuid: 't-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.token).toBeUndefined();

        const token = { uuid: 't-1', name: 'Token 1' } as any;
        next = reducer(next, actions.getTokenDetailSuccess({ token }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.token).toEqual(token);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getTokenDetailFailure({ uuid: token.uuid, error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('ensureTokenDetail_reusesCachedDetail_andIgnoresStaleResponse', () => {
        // given
        const cachedToken = { uuid: 'cached-token', name: 'Cached token' } as any;
        const staleToken = { uuid: 'stale-token', name: 'Stale token' } as any;
        const loadedState = { ...initialState, tokenDetailsByUuid: { [cachedToken.uuid]: cachedToken } };

        // when
        let next = reducer(loadedState, actions.ensureTokenDetail({ uuid: cachedToken.uuid }));
        next = reducer(next, actions.getTokenDetailSuccess({ token: staleToken }));

        // then
        expect(next.token).toEqual(cachedToken);
        expect(next.isFetchingDetail).toBe(false);
        expect(next.tokenDetailsByUuid[staleToken.uuid]).toEqual(staleToken);
    });

    test('getTokenDetail keeps token when refetching the same uuid', () => {
        const loaded = { ...initialState, token: { uuid: 't-1' } as any };
        const next = reducer(loaded, actions.getTokenDetail({ uuid: 't-1' }));
        expect(next.token?.uuid).toBe('t-1');
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getTokenDetail clears token when uuid differs', () => {
        const loaded = { ...initialState, token: { uuid: 't-1' } as any };
        const next = reducer(loaded, actions.getTokenDetail({ uuid: 't-2' }));
        expect(next.token).toBeUndefined();
    });

    test('createToken / success / failure', () => {
        let next = reducer(initialState, actions.createToken({ name: 'T1' } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createTokenSucceeded).toBe(false);

        next = reducer(next, actions.createTokenSuccess({ uuid: 't-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createTokenSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createTokenFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createTokenSucceeded).toBe(false);
    });

    test('updateToken / success / failure', () => {
        let next = reducer(
            { ...initialState, tokenDetailsByUuid: { 't-1': { uuid: 't-1', name: 'Before update' } as any } },
            actions.updateToken({ uuid: 't-1', updateToken: {} as any }),
        );
        expect(next.isUpdating).toBe(true);
        expect(next.updateTokenSucceeded).toBe(false);

        const token = { uuid: 't-1', name: 'Updated' } as any;
        next = reducer(next, actions.updateTokenSuccess({ token }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateTokenSucceeded).toBe(true);
        expect(next.token).toEqual(token);
        expect(next.tokenDetailsByUuid['t-1']).toBeUndefined();

        next = reducer({ ...next, isUpdating: true }, actions.updateTokenFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateTokenSucceeded).toBe(false);
    });

    test('listActivationAttributeDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.listActivationAttributeDescriptors({ uuid: 't-1' }));
        expect(next.isFetchingActivationAttributeDescriptors).toBe(true);

        const descriptors = [{ uuid: 'd-1' }] as any[];
        next = reducer(next, actions.listActivationAttributesDescriptorsSuccess({ uuid: 't-1', attributesDescriptors: descriptors }));
        expect(next.isFetchingActivationAttributeDescriptors).toBe(false);
        expect(next.activationAttributeDescriptors).toEqual(descriptors);

        next = reducer(
            { ...next, isFetchingActivationAttributeDescriptors: true },
            actions.listActivationAttributesFailure({ error: 'err' }),
        );
        expect(next.isFetchingActivationAttributeDescriptors).toBe(false);
    });

    test('activateToken / success / failure', () => {
        const tokenUuid = 't-1';
        const cachedToken = { uuid: tokenUuid, status: { status: TokenInstanceStatus.Deactivated } } as any;
        let next = reducer(
            { ...initialState, tokenDetailsByUuid: { [tokenUuid]: cachedToken } },
            actions.activateToken({ uuid: tokenUuid, request: [] }),
        );
        expect(next.isActivating).toBe(true);

        next = reducer(next, actions.activateTokenSuccess({ uuid: tokenUuid }));
        expect(next.isActivating).toBe(false);
        expect(next.tokenDetailsByUuid[tokenUuid].status.status).toBe(TokenInstanceStatus.Activated);

        next = reducer({ ...next, isActivating: true }, actions.activateTokenFailure({ error: 'err' }));
        expect(next.isActivating).toBe(false);
    });

    test('deactivateToken / success / failure', () => {
        const tokenUuid = 't-1';
        const cachedToken = { uuid: tokenUuid, status: { status: TokenInstanceStatus.Activated } } as any;
        let next = reducer(
            { ...initialState, tokenDetailsByUuid: { [tokenUuid]: cachedToken } },
            actions.deactivateToken({ uuid: tokenUuid }),
        );
        expect(next.isDeactivating).toBe(true);

        next = reducer(next, actions.deactivateTokenSuccess({ uuid: tokenUuid }));
        expect(next.isDeactivating).toBe(false);
        expect(next.tokenDetailsByUuid[tokenUuid].status.status).toBe(TokenInstanceStatus.Deactivated);

        next = reducer({ ...next, isDeactivating: true }, actions.deactivateTokenFailure({ error: 'err' }));
        expect(next.isDeactivating).toBe(false);
    });

    test('reloadToken / success / failure', () => {
        const tokenUuid = 't-1';
        let next = reducer(initialState, actions.reloadToken({ uuid: tokenUuid }));
        expect(next.isReloading).toBe(true);

        const token = { uuid: tokenUuid, name: 'Token 1' } as any;
        next = reducer(next, actions.reloadSuccess({ token }));
        expect(next.isReloading).toBe(false);
        expect(next.token).toEqual(token);
        expect(next.tokenDetailsByUuid[tokenUuid]).toEqual(token);

        next = reducer({ ...next, isReloading: true }, actions.reloadFailure({ error: 'err' }));
        expect(next.isReloading).toBe(false);
    });

    test('deleteToken / success removes from list / failure sets error', () => {
        const items = [{ uuid: 't-1' } as any, { uuid: 't-2' } as any];
        const token = { uuid: 't-1' } as any;

        let next = reducer({ ...initialState, tokens: items, token }, actions.deleteToken({ uuid: 't-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteTokenSuccess({ uuid: 't-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.tokens).toEqual([{ uuid: 't-2' }]);
        expect(next.token).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteTokenFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('bulkDeleteToken / success removes items / failure', () => {
        const items = [{ uuid: 't-1' } as any, { uuid: 't-2' } as any];

        let next = reducer({ ...initialState, tokens: items }, actions.bulkDeleteToken({ uuids: ['t-1'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteTokenSuccess({ uuids: ['t-1'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.tokens).toEqual([{ uuid: 't-2' }]);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteTokenFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });
});

describe('tokens selectors', () => {
    test('selectors read values from tokens state', () => {
        const token = { uuid: 't-1' } as any;
        const providers = [{ uuid: 'c-1' }] as any[];
        const attrs = [{ uuid: 'a-1' }] as any[];
        const featureState = {
            ...initialState,
            token,
            tokens: [token],
            tokenProviders: providers,
            tokenProviderAttributeDescriptors: attrs,
            tokenProfileAttributeDescriptors: attrs,
            checkedRows: ['t-1'],
            deleteErrorMessage: 'err',
            isFetchingTokenProviders: true,
            isFetchingTokenProviderAttributeDescriptors: true,
            isFetchingTokenProfileAttributesDescriptors: true,
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createTokenSucceeded: true,
            isUpdating: true,
            updateTokenSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isActivating: true,
            isDeactivating: true,
            isReloading: true,
        };

        const state = { tokens: featureState } as any;

        expect(selectors.token(state)).toEqual(token);
        expect(selectors.tokens(state)).toEqual([token]);
        expect(selectors.tokenProviders(state)).toEqual(providers);
        expect(selectors.tokenProviderAttributeDescriptors(state)).toEqual(attrs);
        expect(selectors.tokenProfileAttributeDescriptors(state)).toEqual(attrs);
        expect(selectors.checkedRows(state)).toEqual(['t-1']);
        expect(selectors.deleteErrorMessage(state)).toBe('err');
        expect(selectors.isFetchingTokenProviders(state)).toBe(true);
        expect(selectors.isFetchingTokenProviderAttributeDescriptors(state)).toBe(true);
        expect(selectors.isFetchingTokenProfileAttributesDescriptors(state)).toBe(true);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createTokenSucceeded(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateTokenSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isActivating(state)).toBe(true);
        expect(selectors.isDeactivating(state)).toBe(true);
        expect(selectors.isReloading(state)).toBe(true);
    });
});
