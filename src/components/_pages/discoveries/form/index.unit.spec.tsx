import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import DiscoveryForm from './index';
import { ConnectorInterface, FunctionGroupCode, PlatformEnum, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

// A click on a mocked select picks the value registered for its id; the multi-select picks the resources listed.
let multiSelection: { value: string; label: string }[] = [{ value: Resource.Certificates, label: 'Certificates' }];

vi.mock('components/Select', () => ({
    default: ({ id, onChange, isMulti }: any) => (
        <button
            type="button"
            data-testid={`select-${id}`}
            onClick={() => {
                if (isMulti) {
                    onChange(multiSelection);
                    return;
                }
                onChange({ discoveryProviderSelect: 'conn-1', storeKindSelect: 'IP-HostName', interfaceSelect: 'iface-2' }[id as string]);
            }}
        >
            select
        </button>
    ),
}));

vi.mock('components/Widget', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Container', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Label', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Switch', () => ({ default: () => <input type="checkbox" /> }));
vi.mock('components/TextInput', () => ({
    default: ({ id, value, onChange }: any) => (
        <input data-testid={`input-${id}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    ),
}));
vi.mock('components/Button', () => ({
    default: ({ children, onClick, type }: any) => (
        <button type={type ?? 'button'} onClick={onClick}>
            {children}
        </button>
    ),
}));
vi.mock('components/ProgressButton', () => ({ default: ({ title, type }: any) => <button type={type ?? 'button'}>{title}</button> }));
vi.mock('components/Layout/TabLayout', () => ({
    default: ({ tabs }: any) => (
        <div>
            {tabs.map((t: any) => (
                <section key={t.tabKey ?? t.title} data-testid={`tab-${t.tabKey ?? t.title}`}>
                    {t.content}
                </section>
            ))}
        </div>
    ),
}));
vi.mock('components/Attributes/AttributeEditor', () => ({
    default: ({ id, interfaceUuid, kind }: any) => (
        <div data-testid={`attr-editor-${id}`} data-interface={interfaceUuid ?? ''} data-kind={kind ?? ''} />
    ),
}));
vi.mock('components/TriggerEditorWidget', () => ({ default: () => <div data-testid="trigger-editor" /> }));
vi.mock('components/CronBuilder', () => ({ default: () => <div /> }));
vi.mock('components/CronScheduleHint', () => ({ default: () => <div /> }));

const v1Provider = {
    uuid: 'conn-1',
    name: 'Legacy scanner',
    functionGroups: [{ functionGroupCode: FunctionGroupCode.DiscoveryProvider, kinds: ['IP-HostName'] }],
    interfaces: [],
};

const singleInterfaceProvider = {
    ...v1Provider,
    name: 'v2 scanner',
    interfaces: [{ uuid: 'iface-1', code: ConnectorInterface.Discovery, version: 'v2' }],
};

const multiInterfaceProvider = {
    ...v1Provider,
    name: 'v2 scanner with two interfaces',
    interfaces: [
        { uuid: 'iface-1', code: ConnectorInterface.Discovery, version: 'v2' },
        { uuid: 'iface-2', code: ConnectorInterface.Discovery, version: 'v3' },
        { uuid: 'iface-x', code: ConnectorInterface.Health, version: 'v1' },
    ],
};

const descriptors = [{ uuid: 'ad1', name: 'attr', type: 'data', content: [] } as any];

function buildState(over: any = {}) {
    return {
        discoveries: {
            discoveryProviders: over.discoveryProviders ?? [],
            discoveryProviderAttributeDescriptors: over.descriptors ?? [],
            discoveryProviderResourceAttributeDescriptors: over.resourceDescriptors ?? {},
            fetchingResourceAttributeDescriptors: [],
            discoveryResources: over.discoveryResources ?? [Resource.Certificates, Resource.Keys],
            isFetchingDetail: false,
            isFetchingDiscoveryProviders: false,
            isFetchingDiscoveryProviderAttributeDescriptors: false,
            isFetchingDiscoveryResources: false,
            isCreating: false,
        },
        customAttributes: {
            resourceCustomAttributes: [],
            isFetchingResourceCustomAttributes: false,
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Certificates]: { label: 'Certificates' },
                    [Resource.Keys]: { label: 'Keys' },
                },
            },
        },
    };
}

describe('DiscoveryForm', () => {
    let container: HTMLDivElement;
    let root: Root;
    const dispatch = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        dispatch.mockReset();
        useDispatchMock.mockReturnValue(dispatch);
        multiSelection = [{ value: Resource.Certificates, label: 'Certificates' }];
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(state: any) {
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        await act(async () => {
            root.render(<DiscoveryForm />);
        });
    }

    const click = async (testId: string) => {
        await act(async () => {
            container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
        });
    };

    const typeName = async (name: string) => {
        await act(async () => {
            const input = container.querySelector<HTMLInputElement>('[data-testid="input-name"]');
            const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set;
            if (input) {
                setter?.call(input, name);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    };

    const submit = async () => {
        await act(async () => {
            container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
    };

    const createdRequest = () =>
        dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'discoveries/createDiscovery')?.payload.request;

    describe('a v1 Discovery Provider renders the form exactly as before', () => {
        it('shows neither interface nor resource fields and fetches kind-scoped attributes', async () => {
            await render(buildState({ discoveryProviders: [v1Provider], descriptors }));

            await click('select-discoveryProviderSelect');
            await click('select-storeKindSelect');

            expect(container.querySelector('[data-testid="select-interfaceSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="select-resourcesSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="trigger-editor"]')).not.toBeNull();
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'discoveries/getDiscoveryProviderAttributesDescriptors',
                    payload: { uuid: 'conn-1', kind: 'IP-HostName' },
                }),
            );
            expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'discoveries/listDiscoveryResources' }));
            expect(container.querySelector('[data-testid="attr-editor-discovery"]')?.getAttribute('data-kind')).toBe('IP-HostName');
        });

        it('submits without interfaceUuid, resources or resourceAttributes', async () => {
            await render(buildState({ discoveryProviders: [v1Provider], descriptors }));

            await click('select-discoveryProviderSelect');
            await click('select-storeKindSelect');
            await typeName('nightly');
            await submit();

            const request = createdRequest();
            expect(request).toBeDefined();
            expect(request.interfaceUuid).toBeUndefined();
            expect(request.resources).toBeUndefined();
            expect(request.resourceAttributes).toBeUndefined();
            expect(request.kind).toBe('IP-HostName');
        });
    });

    describe('interface selection', () => {
        it('binds a single-interface connector silently and shows no interface field', async () => {
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');

            expect(container.querySelector('[data-testid="select-interfaceSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="select-resourcesSelect"]')).not.toBeNull();
            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'discoveries/listDiscoveryResources', payload: { connectorUuid: 'conn-1' } }),
            );

            await click('select-storeKindSelect');
            await click('select-resourcesSelect');
            await typeName('scan');
            await submit();

            const request = createdRequest();
            expect(request.interfaceUuid).toBe('iface-1');
            expect(request.resources).toEqual([Resource.Certificates]);
        });

        it('requires a choice when the connector exposes more than one DISCOVERY interface', async () => {
            await render(buildState({ discoveryProviders: [multiInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');
            expect(container.querySelector('[data-testid="select-interfaceSelect"]')).not.toBeNull();

            await click('select-storeKindSelect');
            await click('select-resourcesSelect');
            await typeName('scan');
            await submit();
            // Nothing is sent while the interface is unchosen: the field is required.
            expect(createdRequest()).toBeUndefined();

            await click('select-interfaceSelect');
            await submit();
            expect(createdRequest()?.interfaceUuid).toBe('iface-2');
        });

        it('fetches the v2 run-level attributes through the connector relay and hands the interface to the editor', async () => {
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');
            await click('select-storeKindSelect');

            expect(dispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'discoveries/getDiscoveryInterfaceAttributesDescriptors',
                    payload: { connectorUuid: 'conn-1' },
                }),
            );
            expect(dispatch).not.toHaveBeenCalledWith(
                expect.objectContaining({ type: 'discoveries/getDiscoveryProviderAttributesDescriptors' }),
            );
            const editor = container.querySelector('[data-testid="attr-editor-discovery"]');
            expect(editor?.getAttribute('data-interface')).toBe('iface-1');
            expect(editor?.getAttribute('data-kind')).toBe('');
        });
    });

    describe('resources', () => {
        it('adds a tab and fetches definitions for each selected resource, keyed by wire code on submit', async () => {
            multiSelection = [
                { value: Resource.Certificates, label: 'Certificates' },
                { value: Resource.Keys, label: 'Keys' },
            ];
            await render(
                buildState({
                    discoveryProviders: [singleInterfaceProvider],
                    descriptors,
                    resourceDescriptors: { [Resource.Certificates]: [], [Resource.Keys]: [] },
                }),
            );

            await click('select-discoveryProviderSelect');
            await click('select-storeKindSelect');
            await click('select-resourcesSelect');

            expect(container.querySelector('[data-testid="resource-attributes-certificates"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="resource-attributes-keys"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="resource-attributes-keys"]')?.textContent).toContain('no attributes of its own');
            for (const resource of [Resource.Certificates, Resource.Keys]) {
                expect(dispatch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'discoveries/getDiscoveryResourceAttributesDescriptors',
                        payload: { connectorUuid: 'conn-1', resource },
                    }),
                );
            }

            await typeName('scan');
            await submit();

            const request = createdRequest();
            expect(request.resources).toEqual([Resource.Certificates, Resource.Keys]);
            expect(Object.keys(request.resourceAttributes)).toEqual([Resource.Certificates, Resource.Keys]);
        });

        it('offers the certificate triggers only when certificates are targeted', async () => {
            multiSelection = [{ value: Resource.Keys, label: 'Keys' }];
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');
            expect(container.querySelector('[data-testid="trigger-editor"]')).toBeNull();

            multiSelection = [{ value: Resource.Certificates, label: 'Certificates' }];
            await click('select-resourcesSelect');
            expect(container.querySelector('[data-testid="trigger-editor"]')).not.toBeNull();
        });
    });
});
