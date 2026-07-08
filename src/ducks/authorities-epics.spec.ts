import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';

import { getAuthorityInstanceAttributesDescriptors, listAuthorityProviders } from './authorities-epics';
import { slice } from './authorities';
import { actions as appRedirectActions } from './app-redirect';
import { alertsSlice } from './alert-slice';
import { ConnectorInterface, FunctionGroupCode } from 'types/openapi';

vi.mock('./alerts', () => ({
    actions: {
        error: (message: string) => alertsSlice.actions.error(message),
        success: (message: string) => alertsSlice.actions.success(message),
        info: (message: string) => alertsSlice.actions.info(message),
    },
}));

type EpicDeps = {
    apiClients: {
        connectors: {
            listConnectors: (args: any) => any;
        };
        connectorsV2: {
            listConnectorsV2: (args: any) => any;
        };
        authorities: {
            listAuthorityInstanceAttributes: (args: any) => any;
        };
    };
};

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 1000, totalPages: 0 };

function ajaxError(status: number): AjaxError {
    return Object.assign(Object.create(AjaxError.prototype), { status, message: `HTTP ${status}` });
}

function createDeps(overrides: Partial<EpicDeps['apiClients']> = {}): EpicDeps {
    return {
        apiClients: {
            connectors: {
                listConnectors: () => of([]),
                ...overrides.connectors,
            },
            connectorsV2: {
                listConnectorsV2: () => of(emptyPage),
                ...overrides.connectorsV2,
            },
            authorities: {
                listAuthorityInstanceAttributes: () => of([]),
                ...overrides.authorities,
            },
        },
    };
}

async function runEpic(epic: any, action: any, depsOverrides: Partial<EpicDeps['apiClients']> = {}, takeCount = 1): Promise<any[]> {
    const deps = createDeps(depsOverrides);
    const state$ = of({}) as any;
    state$.value = {};
    const output$ = epic(of(action), state$, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

const legacyConnector = (uuid: string, name: string) => ({
    uuid,
    name,
    url: 'http://legacy',
    authType: 'none',
    status: 'connected',
    functionGroups: [],
});

const ngConnector = (uuid: string, name: string) => ({
    uuid,
    name,
    url: 'http://ng',
    status: 'connected',
    version: 'v2',
    functionGroups: [],
    interfaces: [{ uuid: `${uuid}-iface`, code: ConnectorInterface.Authority, version: 'v3' }],
});

describe('authorities epics - listAuthorityProviders', () => {
    test('merges legacy (function group) and NG (interface) connectors', async () => {
        const emitted = await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy CA')]) },
            connectorsV2: { listConnectorsV2: () => of({ ...emptyPage, items: [ngConnector('ng-1', 'NG CA')], totalItems: 1 }) },
        });

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersSuccess.type);
        const connectors = emitted[0].payload.connectors;
        expect(connectors.map((c: any) => c.uuid).sort()).toEqual(['legacy-1', 'ng-1']);
    });

    test('queries the NG list filtered by the Authority connector interface', async () => {
        const listConnectorsV2 = vi.fn((_args: any) => of(emptyPage));
        await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: { listConnectors: () => of([]) },
            connectorsV2: { listConnectorsV2 },
        });

        const { searchRequestDto } = listConnectorsV2.mock.calls[0][0] as any;
        expect(searchRequestDto.filters).toEqual([
            expect.objectContaining({ fieldIdentifier: 'CONNECTOR_INTERFACE', value: ConnectorInterface.Authority }),
        ]);
    });

    test('dedupes by uuid, preferring the NG model that carries interfaces', async () => {
        const emitted = await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: { listConnectors: () => of([legacyConnector('shared', 'Shared CA')]) },
            connectorsV2: { listConnectorsV2: () => of({ ...emptyPage, items: [ngConnector('shared', 'Shared CA')], totalItems: 1 }) },
        });

        const connectors = emitted[0].payload.connectors;
        expect(connectors).toHaveLength(1);
        expect(connectors[0].interfaces).toHaveLength(1);
        expect(connectors[0].interfaces[0].code).toBe(ConnectorInterface.Authority);
    });

    test('still returns legacy connectors when the NG interface query is unavailable (404)', async () => {
        const emitted = await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy CA')]) },
            connectorsV2: { listConnectorsV2: () => throwError(() => ajaxError(404)) },
        });

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersSuccess.type);
        expect(emitted[0].payload.connectors.map((c: any) => c.uuid)).toEqual(['legacy-1']);
    });

    test('surfaces failure when the NG interface query fails with a non-404 error', async () => {
        const emitted = await runEpic(
            listAuthorityProviders,
            slice.actions.listAuthorityProviders(),
            {
                connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy CA')]) },
                connectorsV2: { listConnectorsV2: () => throwError(() => ajaxError(500)) },
            },
            2,
        );

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('keeps providers when the deprecated function group is unavailable (404)', async () => {
        const emitted = await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: {
                listConnectors: (args: any) =>
                    args.functionGroup === FunctionGroupCode.LegacyAuthorityProvider
                        ? throwError(() => ajaxError(404))
                        : of([legacyConnector('legacy-1', 'Legacy CA')]),
            },
        });

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersSuccess.type);
        expect(emitted[0].payload.connectors.map((c: any) => c.uuid)).toEqual(['legacy-1']);
    });

    test('surfaces failure when the deprecated function group fails with a non-404 error', async () => {
        const emitted = await runEpic(
            listAuthorityProviders,
            slice.actions.listAuthorityProviders(),
            {
                connectors: {
                    listConnectors: (args: any) =>
                        args.functionGroup === FunctionGroupCode.LegacyAuthorityProvider
                            ? throwError(() => ajaxError(500))
                            : of([legacyConnector('legacy-1', 'Legacy CA')]),
                },
            },
            2,
        );

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('surfaces failure when the NG interface query fails with a non-AjaxError', async () => {
        const emitted = await runEpic(
            listAuthorityProviders,
            slice.actions.listAuthorityProviders(),
            {
                connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy CA')]) },
                connectorsV2: { listConnectorsV2: () => throwError(() => new Error('network down')) },
            },
            2,
        );

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('emits failure and fetchError when the legacy query fails', async () => {
        const emitted = await runEpic(
            listAuthorityProviders,
            slice.actions.listAuthorityProviders(),
            { connectors: { listConnectors: () => throwError(() => new Error('list failed')) } },
            2,
        );

        expect(emitted[0].type).toBe(slice.actions.listAuthorityProvidersFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test('queries and merges both AuthorityProvider and LegacyAuthorityProvider function groups', async () => {
        const queried: string[] = [];
        const emitted = await runEpic(listAuthorityProviders, slice.actions.listAuthorityProviders(), {
            connectors: {
                listConnectors: (args: any) => {
                    queried.push(args.functionGroup);
                    return of(
                        args.functionGroup === FunctionGroupCode.LegacyAuthorityProvider
                            ? [legacyConnector('legacy-old', 'Legacy Old CA')]
                            : [legacyConnector('legacy-1', 'Legacy CA')],
                    );
                },
            },
        });

        expect(queried.sort()).toEqual([FunctionGroupCode.AuthorityProvider, FunctionGroupCode.LegacyAuthorityProvider].sort());
        expect(emitted[0].payload.connectors.map((c: any) => c.uuid).sort()).toEqual(['legacy-1', 'legacy-old']);
    });
});

describe('authorities epics - getAuthorityInstanceAttributesDescriptors (NG/v3)', () => {
    test('lists attributes by connectorUuid + interfaceUuid and emits success', async () => {
        const listAuthorityInstanceAttributes = vi.fn((_args: any) => of([]));
        const emitted = await runEpic(
            getAuthorityInstanceAttributesDescriptors,
            slice.actions.getAuthorityInstanceAttributesDescriptors({ connectorUuid: 'conn-1', interfaceUuid: 'iface-1' }),
            { authorities: { listAuthorityInstanceAttributes } },
        );

        expect(listAuthorityInstanceAttributes.mock.calls[0][0]).toEqual({ connectorUuid: 'conn-1', interfaceUuid: 'iface-1' });
        expect(emitted[0].type).toBe(slice.actions.getAuthorityProviderAttributesDescriptorsSuccess.type);
        expect(emitted[0].payload.attributeDescriptor).toEqual([]);
    });

    test('emits failure + fetchError when the listing fails', async () => {
        const emitted = await runEpic(
            getAuthorityInstanceAttributesDescriptors,
            slice.actions.getAuthorityInstanceAttributesDescriptors({ connectorUuid: 'conn-1', interfaceUuid: 'iface-1' }),
            { authorities: { listAuthorityInstanceAttributes: () => throwError(() => new Error('boom')) } },
            2,
        );

        expect(emitted[0].type).toBe(slice.actions.getAuthorityProviderAttributeDescriptorsFailure.type);
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });
});
