import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';

import {
    cancelDiscovery,
    describeLifecycleRefusal,
    getDiscoveryInterfaceAttributesDescriptors,
    getDiscoveryResourceAttributesDescriptors,
    listDiscoveryProviders,
    listDiscoveryResources,
    resumeDiscovery,
    stopDiscovery,
} from './discoveries-epics';
import { slice } from './discoveries';
import { alertsSlice } from './alert-slice';
import { ConnectorInterface, Resource } from 'types/openapi';

vi.mock('./alerts', () => ({
    actions: {
        error: (message: string) => alertsSlice.actions.error(message),
        success: (message: string) => alertsSlice.actions.success(message),
        info: (message: string) => alertsSlice.actions.info(message),
    },
}));

vi.mock('../App', () => ({ store: { dispatch: vi.fn() } }));

type ApiClients = Record<string, Record<string, (args: any) => any>>;

function ajaxError(status: number, response: unknown): AjaxError {
    return Object.assign(Object.create(AjaxError.prototype), { status, message: `HTTP ${status}`, response });
}

async function runEpic(epic: any, action: any, apiClients: ApiClients, takeCount: number): Promise<any[]> {
    const state$ = of({}) as any;
    state$.value = {};
    const output$ = epic(of(action), state$, { apiClients });
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

const emptyPage = { items: [], totalItems: 0, pageNumber: 1, itemsPerPage: 1000, totalPages: 0 };

const legacyConnector = (uuid: string, name: string) => ({
    uuid,
    name,
    url: 'http://legacy',
    authType: 'none',
    status: 'connected',
    functionGroups: [{ functionGroupCode: 'discoveryProvider', kinds: ['IP-HostName'], endPoints: [] }],
});

const ngConnector = (uuid: string, name: string) => ({
    uuid,
    name,
    url: 'http://ng',
    status: 'connected',
    version: 'v2',
    functionGroups: [],
    interfaces: [{ uuid: `${uuid}-iface`, code: ConnectorInterface.Discovery, version: 'v2' }],
});

describe('listDiscoveryProviders', () => {
    test('offers both generations: the function-group list and the DISCOVERY-interface list', async () => {
        const listConnectorsV2 = vi.fn(() => of({ ...emptyPage, items: [ngConnector('ng-1', 'v2 scanner')], totalItems: 1 }));
        const emitted = await runEpic(
            listDiscoveryProviders,
            slice.actions.listDiscoveryProviders(),
            {
                connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy scanner')]) },
                connectorsV2: { listConnectorsV2 },
            },
            1,
        );

        expect(emitted[0].type).toBe(slice.actions.listDiscoveryProvidersSuccess.type);
        expect(emitted[0].payload.connectors.map((c: any) => c.uuid).sort()).toEqual(['legacy-1', 'ng-1']);

        const { searchRequestDto } = (listConnectorsV2.mock.calls[0] as unknown as [any])[0];
        expect(searchRequestDto.filters).toEqual([
            expect.objectContaining({ fieldIdentifier: 'CONNECTOR_INTERFACE', value: ConnectorInterface.Discovery }),
        ]);
    });

    test('a connector in both lists keeps the model that carries its interfaces', async () => {
        const emitted = await runEpic(
            listDiscoveryProviders,
            slice.actions.listDiscoveryProviders(),
            {
                connectors: { listConnectors: () => of([legacyConnector('shared', 'Both')]) },
                connectorsV2: { listConnectorsV2: () => of({ ...emptyPage, items: [ngConnector('shared', 'Both')], totalItems: 1 }) },
            },
            1,
        );

        const connectors = emitted[0].payload.connectors;
        expect(connectors).toHaveLength(1);
        expect(connectors[0].interfaces?.[0]?.code).toBe(ConnectorInterface.Discovery);
    });

    test('still offers legacy providers when the interface listing is unavailable (404)', async () => {
        const emitted = await runEpic(
            listDiscoveryProviders,
            slice.actions.listDiscoveryProviders(),
            {
                connectors: { listConnectors: () => of([legacyConnector('legacy-1', 'Legacy scanner')]) },
                connectorsV2: { listConnectorsV2: () => throwError(() => ajaxError(404, undefined)) },
            },
            1,
        );

        expect(emitted[0].type).toBe(slice.actions.listDiscoveryProvidersSuccess.type);
        expect(emitted[0].payload.connectors.map((c: any) => c.uuid)).toEqual(['legacy-1']);
    });
});

describe('describeLifecycleRefusal', () => {
    test('reads the array of strings a 422 carries', () => {
        const err = ajaxError(422, ['Run is no longer in progress.', 'Nothing to stop.']);

        expect(describeLifecycleRefusal(err, 'Failed to stop discovery')).toBe(
            'Failed to stop discovery: Run is no longer in progress. Nothing to stop.',
        );
    });

    test('falls back to the generic extraction for any other body', () => {
        const err = ajaxError(500, { message: 'boom' });

        expect(describeLifecycleRefusal(err, 'Failed to stop discovery')).toContain('boom');
    });
});

describe('lifecycle epics', () => {
    test('a stop that is accepted re-reads the detail, since the 204 carries no state', async () => {
        const emitted = await runEpic(
            stopDiscovery,
            slice.actions.stopDiscovery({ uuid: 'd-1' }),
            { discoveries: { stopDiscovery: () => of(undefined) } },
            3,
        );

        expect(emitted.map((a) => a.type)).toEqual([
            slice.actions.stopDiscoverySuccess.type,
            alertsSlice.actions.success.type,
            slice.actions.getDiscoveryDetail.type,
        ]);
        expect(emitted[2].payload).toEqual({ uuid: 'd-1' });
    });

    test('a refused stop surfaces the returned text and still re-reads the detail, because the button set is stale', async () => {
        const emitted = await runEpic(
            stopDiscovery,
            slice.actions.stopDiscovery({ uuid: 'd-1' }),
            {
                discoveries: {
                    stopDiscovery: () => throwError(() => ajaxError(422, ['The Discovery Provider is past its point of no return.'])),
                },
            },
            3,
        );

        expect(emitted.map((a) => a.type)).toEqual([
            slice.actions.stopDiscoveryFailure.type,
            alertsSlice.actions.error.type,
            slice.actions.getDiscoveryDetail.type,
        ]);
        expect(emitted[1].payload).toBe('Failed to stop discovery: The Discovery Provider is past its point of no return.');
    });

    test('resume and cancel follow the same shape', async () => {
        const resumed = await runEpic(
            resumeDiscovery,
            slice.actions.resumeDiscovery({ uuid: 'd-1' }),
            { discoveries: { resumeDiscovery: () => of(undefined) } },
            3,
        );
        expect(resumed[0].type).toBe(slice.actions.resumeDiscoverySuccess.type);
        expect(resumed[2].type).toBe(slice.actions.getDiscoveryDetail.type);

        const cancelled = await runEpic(
            cancelDiscovery,
            slice.actions.cancelDiscovery({ uuid: 'd-1' }),
            { discoveries: { cancelDiscovery: () => of(undefined) } },
            3,
        );
        expect(cancelled[0].type).toBe(slice.actions.cancelDiscoverySuccess.type);
        expect(cancelled[2].type).toBe(slice.actions.getDiscoveryDetail.type);
    });
});

describe('connector-keyed relays', () => {
    test('listDiscoveryResources unwraps the wire codes', async () => {
        const list = vi.fn(() => of([{ resource: Resource.Certificates }, { resource: Resource.Keys }]));
        const emitted = await runEpic(
            listDiscoveryResources,
            slice.actions.listDiscoveryResources({ connectorUuid: 'c-1' }),
            { discoveries: { listDiscoveryResources: list } },
            1,
        );

        expect(list).toHaveBeenCalledWith({ connectorUuid: 'c-1' });
        expect(emitted[0]).toEqual(slice.actions.listDiscoveryResourcesSuccess({ resources: [Resource.Certificates, Resource.Keys] }));
    });

    test('per-resource attribute definitions land keyed by the resource they were asked for', async () => {
        const getDiscoveryResourceAttributes = vi.fn(() => of([]));
        const emitted = await runEpic(
            getDiscoveryResourceAttributesDescriptors,
            slice.actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-1', resource: Resource.Keys }),
            { discoveries: { getDiscoveryResourceAttributes } },
            1,
        );

        expect(getDiscoveryResourceAttributes).toHaveBeenCalledWith({ connectorUuid: 'c-1', resource: Resource.Keys });
        expect(emitted[0].type).toBe(slice.actions.getDiscoveryResourceAttributesDescriptorsSuccess.type);
        expect(emitted[0].payload.resource).toBe(Resource.Keys);
    });

    test('a failed per-resource fetch releases that resource, and only that resource, from the in-flight set', async () => {
        const emitted = await runEpic(
            getDiscoveryResourceAttributesDescriptors,
            slice.actions.getDiscoveryResourceAttributesDescriptors({ connectorUuid: 'c-1', resource: Resource.Keys }),
            { discoveries: { getDiscoveryResourceAttributes: () => throwError(() => ajaxError(422, { message: 'not discoverable' })) } },
            1,
        );

        expect(emitted[0].type).toBe(slice.actions.getDiscoveryResourceAttributesDescriptorsFailure.type);
        expect(emitted[0].payload.resource).toBe(Resource.Keys);
    });

    test('the v2 run-level relay lands in the same descriptor slot the v1 path fills', async () => {
        const emitted = await runEpic(
            getDiscoveryInterfaceAttributesDescriptors,
            slice.actions.getDiscoveryInterfaceAttributesDescriptors({ connectorUuid: 'c-1' }),
            { discoveries: { getDiscoveryAttributes: () => of([]) } },
            1,
        );

        expect(emitted[0].type).toBe(slice.actions.getDiscoveryProviderAttributesDescriptorsSuccess.type);
    });
});
