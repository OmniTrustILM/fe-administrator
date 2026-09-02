import { BehaviorSubject, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';
import { ConnectorInterface, ConnectorVersion, FunctionGroupCode } from 'types/openapi';
import { actions as appRedirectActions } from './app-redirect';
import {
    getTokenActivationAttributesDescriptors,
    getTokenProfileAttributesDescriptors,
    getTokenProviderAttributesDescriptors,
    ensureTokenProviderAttributesDescriptors,
    ensureTokenProviders,
    listTokenProviders,
    ensureTokenDetail,
} from './tokens-epics';
import { actions as tokenActions, getTokenAttributesQueryKey } from './tokens';

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 1000, totalPages: 0 };

function ajaxError(status: number): AjaxError {
    return Object.assign(Object.create(AjaxError.prototype), { status, message: `HTTP ${status}` });
}

function createDeps(overrides: Record<string, Record<string, unknown>> = {}) {
    return {
        apiClients: {
            connectors: {
                listConnectors: () => of([]),
                getAttributes: vi.fn(() => of([])),
                ...overrides.connectors,
            },
            connectorsV2: {
                listConnectorsV2: () => of(emptyPage),
                ...overrides.connectorsV2,
            },
            tokenInstances: {
                listTokenProfileAttributes: () => of([]),
                listTokenInstanceActivationAttributes: () => of([]),
                ...overrides.tokenInstances,
            },
            tokenInstanceAttributes: {
                listTokenAttributes: () => of([]),
                ...overrides.tokenInstanceAttributes,
            },
        },
    };
}

async function runEpic(
    epic: unknown,
    actions: unknown,
    overrides: Record<string, Record<string, unknown>> = {},
    count = 1,
    state: unknown = { tokens: { tokenProviderAttributeDescriptorsByQueryKey: {}, tokenDetailsByUuid: {} } },
) {
    const state$ = of(state) as typeof of & { value: unknown };
    state$.value = state;
    const output$ = (epic as CallableFunction)(of(...(Array.isArray(actions) ? actions : [actions])), state$, createDeps(overrides));
    return firstValueFrom(output$.pipe(take(count), toArray()));
}

describe('token attribute epics', () => {
    test('getTokenProviderAttributesDescriptors_usesTokenInstanceApi_withLegacyKind', async () => {
        // given
        const connectorUuid = 'legacy-connector';
        const kind = 'PKCS11';
        const listTokenAttributes = vi.fn(() => of([]));
        const oldConnectorGetAttributes = vi.fn(() => of([]));

        // when
        const emitted = await runEpic(
            ensureTokenProviderAttributesDescriptors,
            tokenActions.ensureTokenProviderAttributesDescriptors({ connectorUuid, kind }),
            {
                connectors: { getAttributes: oldConnectorGetAttributes },
                tokenInstanceAttributes: { listTokenAttributes },
            },
        );

        // then
        expect(listTokenAttributes).toHaveBeenCalledWith({ connectorUuid, kind });
        expect(oldConnectorGetAttributes).not.toHaveBeenCalled();
        expect(emitted[0]).toEqual(
            tokenActions.getTokenProviderAttributesDescriptorsSuccess({
                queryKey: getTokenAttributesQueryKey({ connectorUuid, kind }),
                attributeDescriptor: [],
            }),
        );
    });

    test('getTokenProviderAttributesDescriptors_omitsKind_forV2Connector', async () => {
        // given
        const connectorUuid = 'v2-connector';
        const listTokenAttributes = vi.fn(() => of([]));

        // when
        await runEpic(ensureTokenProviderAttributesDescriptors, tokenActions.ensureTokenProviderAttributesDescriptors({ connectorUuid }), {
            tokenInstanceAttributes: { listTokenAttributes },
        });

        // then
        expect(listTokenAttributes).toHaveBeenCalledWith({ connectorUuid });
        expect(listTokenAttributes.mock.calls[0][0]).not.toHaveProperty('kind');
    });

    test('getTokenProviderAttributesDescriptors_refetches_whenLegacyKindChanges', async () => {
        // given
        const connectorUuid = 'legacy-connector';
        const firstKind = 'PKCS11';
        const secondKind = 'SOFT';
        const listTokenAttributes = vi.fn(() => of([]));

        // when
        await runEpic(
            getTokenProviderAttributesDescriptors,
            [
                tokenActions.getTokenProviderAttributesDescriptors({ connectorUuid, kind: firstKind }),
                tokenActions.getTokenProviderAttributesDescriptors({ connectorUuid, kind: secondKind }),
            ],
            { tokenInstanceAttributes: { listTokenAttributes } },
            2,
        );

        // then
        expect(listTokenAttributes.mock.calls).toEqual([[{ connectorUuid, kind: firstKind }], [{ connectorUuid, kind: secondKind }]]);
    });

    test.each([400, 404, 501])('getTokenProviderAttributesDescriptors_preservesFetchErrorHandling_forHttp%s', async (status) => {
        // given
        const connectorUuid = 'failing-connector';
        const error = ajaxError(status);

        // when
        const emitted = await runEpic(
            getTokenProviderAttributesDescriptors,
            tokenActions.getTokenProviderAttributesDescriptors({ connectorUuid }),
            { tokenInstanceAttributes: { listTokenAttributes: () => throwError(() => error) } },
            2,
        );

        // then
        expect(emitted[0].type).toBe(tokenActions.getTokenProviderAttributeDescriptorsFailure.type);
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({ error, message: 'Failed to get Cryptography Provider Attribute Descriptor list' }),
        );
    });

    test('getTokenProviderAttributesDescriptors_preservesFetchErrorHandling_forConnectorCommunicationFailure', async () => {
        // given
        const connectorUuid = 'offline-connector';
        const error = new Error('connector communication failed');

        // when
        const emitted = await runEpic(
            getTokenProviderAttributesDescriptors,
            tokenActions.getTokenProviderAttributesDescriptors({ connectorUuid }),
            { tokenInstanceAttributes: { listTokenAttributes: () => throwError(() => error) } },
            2,
        );

        // then
        expect(emitted[0].type).toBe(tokenActions.getTokenProviderAttributeDescriptorsFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('getTokenProviderAttributesDescriptors_clearsLoading_whenClientThrowsSynchronously', async () => {
        // given
        const connectorUuid = 'connector-with-stale-client';
        const staleClientError = new TypeError('listTokenAttributes is not a function');
        const expectedErrorMessage = 'Failed to get Cryptography Provider Attribute Descriptor list. listTokenAttributes is not a function';
        const listTokenAttributes = () => {
            throw staleClientError;
        };

        // when
        const emitted = await runEpic(
            getTokenProviderAttributesDescriptors,
            tokenActions.getTokenProviderAttributesDescriptors({ connectorUuid }),
            { tokenInstanceAttributes: { listTokenAttributes } },
            2,
        );

        // then
        expect(emitted[0]).toEqual(
            tokenActions.getTokenProviderAttributeDescriptorsFailure({
                queryKey: getTokenAttributesQueryKey({ connectorUuid }),
                error: expectedErrorMessage,
            }),
        );
        expect(emitted[1]).toEqual(
            appRedirectActions.fetchError({
                error: staleClientError,
                message: 'Failed to get Cryptography Provider Attribute Descriptor list',
            }),
        );
    });

    test('tokenProfileAndActivationAttributes_keepTheirExistingApiMethods', async () => {
        // given
        const tokenUuid = 'token-1';
        const listTokenProfileAttributes = vi.fn(() => of([]));
        const listTokenInstanceActivationAttributes = vi.fn(() => of([]));

        // when
        await runEpic(getTokenProfileAttributesDescriptors, tokenActions.getTokenProfileAttributesDescriptors({ tokenUuid }), {
            tokenInstances: { listTokenProfileAttributes },
        });
        await runEpic(getTokenActivationAttributesDescriptors, tokenActions.listActivationAttributeDescriptors({ uuid: tokenUuid }), {
            tokenInstances: { listTokenInstanceActivationAttributes },
        });

        // then
        expect(listTokenProfileAttributes).toHaveBeenCalledWith({ uuid: tokenUuid });
        expect(listTokenInstanceActivationAttributes).toHaveBeenCalledWith({ uuid: tokenUuid });
    });
});

describe('token provider listing epic', () => {
    test('listTokenProviders_includesV2CryptographyInterfaceConnectors', async () => {
        // given
        const legacyConnector = {
            uuid: 'legacy-connector',
            name: 'Legacy',
            url: 'http://legacy',
            authType: 'none',
            status: 'connected',
            functionGroups: [],
        };
        const v2Connector = {
            uuid: 'v2-connector',
            name: 'V2',
            url: 'http://v2',
            status: 'connected',
            version: ConnectorVersion.V2,
            functionGroups: [],
            interfaces: [{ uuid: 'crypto-interface', code: ConnectorInterface.Cryptography, version: 'v1' }],
        };
        const listConnectors = vi.fn(() => of([legacyConnector]));
        const listConnectorsV2 = vi.fn(() => of({ ...emptyPage, items: [v2Connector], totalItems: 1 }));

        // when
        const emitted = await runEpic(listTokenProviders, tokenActions.listTokenProviders(), {
            connectors: { listConnectors },
            connectorsV2: { listConnectorsV2 },
        });

        // then
        expect(emitted[0].payload.connectors.map((connector: { uuid: string }) => connector.uuid)).toEqual([
            'legacy-connector',
            'v2-connector',
        ]);
        expect(emitted[0].payload.connectors[1].version).toBe(ConnectorVersion.V2);
        expect(listConnectors).toHaveBeenCalledWith({ functionGroup: FunctionGroupCode.CryptographyProvider });
        expect(listConnectorsV2.mock.calls[0][0].searchRequestDto.filters).toEqual([
            expect.objectContaining({ fieldIdentifier: 'CONNECTOR_INTERFACE', value: ConnectorInterface.Cryptography }),
        ]);
    });

    test('listTokenProviders_fallsBackToLegacyConnectors_whenV2EndpointIsUnavailable', async () => {
        // given
        const legacyConnector = {
            uuid: 'legacy-connector',
            name: 'Legacy',
            url: 'http://legacy',
            authType: 'none',
            status: 'connected',
            functionGroups: [],
        };

        // when
        const emitted = await runEpic(listTokenProviders, tokenActions.listTokenProviders(), {
            connectors: { listConnectors: () => of([legacyConnector]) },
            connectorsV2: { listConnectorsV2: () => throwError(() => ajaxError(404)) },
        });

        // then
        expect(emitted[0]).toEqual(
            tokenActions.listTokenProvidersSuccess({
                connectors: [expect.objectContaining({ uuid: legacyConnector.uuid })],
            }),
        );
    });

    test('ensureTokenProviders_deduplicatesStrictModeEquivalentRequests_andCallsEachCatalogueEndpointOnce', () => {
        // given
        const legacyResponse = new Subject<never[]>();
        const v2Response = new Subject<typeof emptyPage>();
        const listConnectors = vi.fn(() => legacyResponse);
        const listConnectorsV2 = vi.fn(() => v2Response);
        const actions$ = new Subject<ReturnType<typeof tokenActions.ensureTokenProviders>>();
        const state$ = new BehaviorSubject({
            tokens: { tokenProviders: undefined, tokenProviderAttributeDescriptorsByQueryKey: {}, tokenDetailsByUuid: {} },
        });
        const subscription = ensureTokenProviders(
            actions$ as any,
            state$ as any,
            createDeps({ connectors: { listConnectors }, connectorsV2: { listConnectorsV2 } }) as any,
        ).subscribe();

        // when
        actions$.next(tokenActions.ensureTokenProviders());
        actions$.next(tokenActions.ensureTokenProviders());

        // then
        expect(listConnectors).toHaveBeenCalledTimes(1);
        expect(listConnectorsV2).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
    });

    test('ensureTokenDetail_deduplicatesInFlightRequestByUuid', () => {
        // given
        const tokenUuid = 'token-in-flight';
        const response = new Subject<never>();
        const getTokenInstance = vi.fn(() => response);
        const actions$ = new Subject<ReturnType<typeof tokenActions.ensureTokenDetail>>();
        const state$ = new BehaviorSubject({
            tokens: { tokenDetailsByUuid: {}, tokenProviderAttributeDescriptorsByQueryKey: {} },
        });
        const subscription = ensureTokenDetail(
            actions$ as any,
            state$ as any,
            createDeps({ tokenInstances: { getTokenInstance } }) as any,
        ).subscribe();

        // when
        actions$.next(tokenActions.ensureTokenDetail({ uuid: tokenUuid }));
        actions$.next(tokenActions.ensureTokenDetail({ uuid: tokenUuid }));

        // then
        expect(getTokenInstance).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
    });

    test('ensureTokenProviderAttributesDescriptors_joinsInFlightRequest_andReusesCachedSchema', () => {
        // given
        const connectorUuid = 'cached-connector';
        const queryKey = getTokenAttributesQueryKey({ connectorUuid });
        const response = new Subject<never[]>();
        const listTokenAttributes = vi.fn(() => response);
        const actions$ = new Subject<ReturnType<typeof tokenActions.ensureTokenProviderAttributesDescriptors>>();
        const state$ = new BehaviorSubject({
            tokens: { tokenProviderAttributeDescriptorsByQueryKey: {}, tokenDetailsByUuid: {} },
        });
        const subscription = ensureTokenProviderAttributesDescriptors(
            actions$ as any,
            state$ as any,
            createDeps({ tokenInstanceAttributes: { listTokenAttributes } }) as any,
        ).subscribe();

        // when
        actions$.next(tokenActions.ensureTokenProviderAttributesDescriptors({ connectorUuid }));
        actions$.next(tokenActions.ensureTokenProviderAttributesDescriptors({ connectorUuid }));
        state$.next({
            tokens: { tokenProviderAttributeDescriptorsByQueryKey: { [queryKey]: [] }, tokenDetailsByUuid: {} },
        });
        response.next([]);
        response.complete();
        actions$.next(tokenActions.ensureTokenProviderAttributesDescriptors({ connectorUuid }));

        // then
        expect(listTokenAttributes).toHaveBeenCalledTimes(1);
        subscription.unsubscribe();
    });
});
