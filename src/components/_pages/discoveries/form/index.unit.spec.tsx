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
let interfaceChoice = 'iface-2';

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
                onChange(
                    { discoveryProviderSelect: 'conn-1', storeKindSelect: 'IP-HostName', interfaceSelect: interfaceChoice }[id as string],
                );
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
vi.mock('components/ProgressButton', () => ({
    default: ({ title, type, disabled }: any) => (
        <button type={type ?? 'button'} disabled={disabled}>
            {title}
        </button>
    ),
}));
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
// The editor stub keeps the one piece of form state the real editor owns besides its values: the deletion marker it
// registers under deletedAttributes_<id>. A provider or resource change must clear it along with the values.
vi.mock('components/Attributes/AttributeEditor', async () => {
    const { useFormContext } = await import('react-hook-form');
    return {
        default: ({ id, interfaceUuid, kind }: any) => {
            const { setValue, watch } = useFormContext();
            const deletedKey = `deletedAttributes_${id}`;
            const deleted = watch(deletedKey);
            return (
                <div
                    data-testid={`attr-editor-${id}`}
                    data-interface={interfaceUuid ?? ''}
                    data-kind={kind ?? ''}
                    data-deleted={deleted ? 'yes' : 'no'}
                >
                    <button type="button" data-testid={`delete-in-${id}`} onClick={() => setValue(deletedKey, ['attr'])}>
                        delete an attribute
                    </button>
                </div>
            );
        },
    };
});
vi.mock('components/TriggerEditorWidget', () => ({ default: () => <div data-testid="trigger-editor" /> }));
vi.mock('components/CronBuilder', () => ({ default: () => <div /> }));
vi.mock('components/CronScheduleHint', () => ({ default: () => <div /> }));

const v1Provider = {
    uuid: 'conn-1',
    name: 'Legacy scanner',
    functionGroups: [{ functionGroupCode: FunctionGroupCode.DiscoveryProvider, kinds: ['IP-HostName'] }],
    interfaces: [],
};

// A v2 provider registers a DISCOVERY interface and no function group, so it has no kinds to offer.
const singleInterfaceProvider = {
    uuid: 'conn-1',
    name: 'v2 scanner',
    functionGroups: [],
    interfaces: [{ uuid: 'iface-1', code: ConnectorInterface.Discovery, version: 'v2' }],
};

const multiInterfaceProvider = {
    ...singleInterfaceProvider,
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
            fetchingResourceAttributeDescriptors: over.fetchingResourceAttributeDescriptors ?? [],
            resourceAttributeDescriptorErrors: over.resourceAttributeDescriptorErrors ?? {},
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
        interfaceChoice = 'iface-2';
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

    const dispatched = (type: string) => dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === type);

    describe('a v1 Discovery Provider renders the form exactly as before', () => {
        it('asks for a kind, shows neither interface nor resource fields, and fetches kind-scoped attributes', async () => {
            await render(buildState({ discoveryProviders: [v1Provider], descriptors }));

            await click('select-discoveryProviderSelect');
            expect(container.querySelector('[data-testid="select-storeKindSelect"]')).not.toBeNull();
            await click('select-storeKindSelect');

            expect(container.querySelector('[data-testid="select-interfaceSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="select-resourcesSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="trigger-editor"]')).not.toBeNull();
            const kindScoped = dispatched('discoveries/getDiscoveryProviderAttributesDescriptors');
            expect(kindScoped.length).toBeGreaterThan(0);
            for (const a of kindScoped) expect(a.payload).toEqual({ uuid: 'conn-1', kind: 'IP-HostName' });
            expect(dispatched('discoveries/listDiscoveryResources')).toHaveLength(0);
            expect(dispatched('discoveries/getDiscoveryInterfaceAttributesDescriptors')).toHaveLength(0);
            expect(container.querySelector('[data-testid="attr-editor-discovery"]')?.getAttribute('data-kind')).toBe('IP-HostName');
        });

        it('submits the kind and nothing of the v2 shape', async () => {
            await render(buildState({ discoveryProviders: [v1Provider], descriptors }));

            await click('select-discoveryProviderSelect');
            await click('select-storeKindSelect');
            await typeName('nightly');
            await submit();

            const request = createdRequest();
            expect(request).toBeDefined();
            expect(request.kind).toBe('IP-HostName');
            expect(request.interfaceUuid).toBeUndefined();
            expect(request.resources).toBeUndefined();
            expect(request.resourceAttributes).toBeUndefined();
        });
    });

    describe('a v2 Discovery Provider', () => {
        it('has no kind: the field is not offered and none is sent', async () => {
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');
            expect(container.querySelector('[data-testid="select-storeKindSelect"]')).toBeNull();

            await click('select-resourcesSelect');
            await typeName('scan');
            await submit();

            const request = createdRequest();
            expect(request).toBeDefined();
            expect(request.kind).toBeUndefined();
            expect(dispatched('discoveries/getDiscoveryProviderAttributesDescriptors')).toHaveLength(0);
        });

        it('binds a single-interface connector silently and shows no interface field', async () => {
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');

            expect(container.querySelector('[data-testid="select-interfaceSelect"]')).toBeNull();
            expect(container.querySelector('[data-testid="select-resourcesSelect"]')).not.toBeNull();
            expect(dispatched('discoveries/listDiscoveryResources').map((a) => a.payload)).toEqual([{ connectorUuid: 'conn-1' }]);

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

            await click('select-resourcesSelect');
            await typeName('scan');
            await submit();
            expect(createdRequest()).toBeUndefined();

            await click('select-interfaceSelect');
            await submit();
            expect(createdRequest()?.interfaceUuid).toBe('iface-2');
        });

        it('fetches the run-level attributes through the connector relay once the interface is bound, and hands it to the editor', async () => {
            await render(buildState({ discoveryProviders: [singleInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');

            expect(dispatched('discoveries/getDiscoveryInterfaceAttributesDescriptors').map((a) => a.payload)).toEqual([
                { connectorUuid: 'conn-1' },
            ]);
            const editor = container.querySelector('[data-testid="attr-editor-discovery"]');
            expect(editor?.getAttribute('data-interface')).toBe('iface-1');
            expect(editor?.getAttribute('data-kind')).toBe('');
        });

        it('waits for the interface choice before fetching run-level attributes on a multi-interface connector', async () => {
            await render(buildState({ discoveryProviders: [multiInterfaceProvider], descriptors }));

            await click('select-discoveryProviderSelect');
            expect(dispatched('discoveries/getDiscoveryInterfaceAttributesDescriptors')).toHaveLength(0);
            expect(container.querySelector('[data-testid="attr-editor-discovery"]')).toBeNull();

            await click('select-interfaceSelect');
            expect(dispatched('discoveries/getDiscoveryInterfaceAttributesDescriptors')).toHaveLength(1);
            expect(container.querySelector('[data-testid="attr-editor-discovery"]')?.getAttribute('data-interface')).toBe('iface-2');
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
            await click('select-resourcesSelect');

            expect(container.querySelector('[data-testid="resource-attributes-certificates"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="resource-attributes-keys"]')).not.toBeNull();
            expect(container.querySelector('[data-testid="resource-attributes-keys"]')?.textContent).toContain('no attributes of its own');
            expect(dispatched('discoveries/getDiscoveryResourceAttributesDescriptors').map((a) => a.payload)).toEqual([
                { connectorUuid: 'conn-1', resource: Resource.Certificates },
                { connectorUuid: 'conn-1', resource: Resource.Keys },
            ]);

            await typeName('scan');
            await submit();

            const request = createdRequest();
            expect(request.resources).toEqual([Resource.Certificates, Resource.Keys]);
            expect(Object.keys(request.resourceAttributes)).toEqual([Resource.Certificates, Resource.Keys]);
        });

        it("forgets an editor's deletion state when its resource is dropped, so a re-added resource starts clean", async () => {
            await render(
                buildState({
                    discoveryProviders: [singleInterfaceProvider],
                    descriptors,
                    resourceDescriptors: { [Resource.Certificates]: [] },
                }),
            );
            await click('select-discoveryProviderSelect');
            await click('select-resourcesSelect');
            const editor = () => container.querySelector('[data-testid="attr-editor-discovery-certificates"]');
            expect(editor()).not.toBeNull();

            await click('delete-in-discovery-certificates');
            expect(editor()?.getAttribute('data-deleted')).toBe('yes');

            multiSelection = [];
            await click('select-resourcesSelect');
            expect(editor()).toBeNull();

            multiSelection = [{ value: Resource.Certificates, label: 'Certificates' }];
            await click('select-resourcesSelect');
            expect(editor()?.getAttribute('data-deleted')).toBe('no');
        });

        it("waits for a resource's definitions before the run can be created, and says so in the tab", async () => {
            await render(
                buildState({
                    discoveryProviders: [singleInterfaceProvider],
                    descriptors,
                    fetchingResourceAttributeDescriptors: [Resource.Certificates],
                }),
            );
            await click('select-discoveryProviderSelect');
            await click('select-resourcesSelect');
            await typeName('scan');

            expect(container.querySelector('[data-testid="resource-attributes-certificates"]')?.textContent).toContain(
                'Loading attributes',
            );
            expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
        });

        it("keeps the run uncreatable when a resource's definitions failed to load, and says which way it went", async () => {
            await render(
                buildState({
                    discoveryProviders: [singleInterfaceProvider],
                    descriptors,
                    resourceAttributeDescriptorErrors: { [Resource.Certificates]: 'Connector unreachable' },
                }),
            );
            await click('select-discoveryProviderSelect');
            await click('select-resourcesSelect');
            await typeName('scan');

            // A failed relay used to read as "still loading" while Create went live, so a run could be submitted with
            // none of the resource's attributes.
            const tab = container.querySelector('[data-testid="resource-attributes-certificates"]');
            expect(tab?.textContent).toContain('Connector unreachable');
            expect(tab?.textContent).not.toContain('Loading attributes');
            expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
        });

        it("drops the previous interface's attribute state when the interface changes", async () => {
            await render(
                buildState({
                    discoveryProviders: [multiInterfaceProvider],
                    descriptors,
                    resourceDescriptors: { [Resource.Certificates]: descriptors },
                }),
            );
            await click('select-discoveryProviderSelect');
            await click('select-interfaceSelect');
            await click('select-resourcesSelect');
            await click('delete-in-discovery-certificates');
            const resourceEditor = () => container.querySelector('[data-testid="attr-editor-discovery-certificates"]');
            expect(resourceEditor()?.getAttribute('data-deleted')).toBe('yes');

            interfaceChoice = 'iface-1';
            await click('select-interfaceSelect');

            // Every schema on screen belongs to the interface that published it, so none of it survives the switch.
            expect(resourceEditor()?.getAttribute('data-deleted')).toBe('no');
            expect(dispatched('discoveries/clearDiscoveryResourceAttributeDescriptors').length).toBeGreaterThan(0);
            expect(dispatched('discoveries/getDiscoveryResourceAttributesDescriptors').length).toBeGreaterThan(1);
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
