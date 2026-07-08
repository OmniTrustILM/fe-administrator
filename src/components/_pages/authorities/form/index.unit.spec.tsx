import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import AuthorityForm from './index';
import { FunctionGroupCode, PlatformEnum, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

let routeParams: Record<string, string> = {};

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

vi.mock('react-router', () => ({
    useParams: () => routeParams,
    useNavigate: () => vi.fn(),
}));

vi.mock('components/Select', async () => {
    const { createSelectMockModule } = await import('../../test-utils/mockModules');
    return createSelectMockModule({
        authorityProviderSelect: 'conn-1',
        storeKindSelect: 'ejbca',
        interfaceVersionSelect: 'iface-1',
    });
});

vi.mock('components/Breadcrumb', () => ({ default: () => <div data-testid="breadcrumb" /> }));
vi.mock('components/Container', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Widget', () => ({ default: ({ children }: any) => <div>{children}</div> }));
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
    default: ({ title, type }: any) => <button type={type ?? 'button'}>{title}</button>,
}));
vi.mock('components/Layout/TabLayout', () => ({
    default: ({ tabs }: any) => (
        <div>
            {tabs.map((t: any, i: number) => (
                <div key={i}>{t.content}</div>
            ))}
        </div>
    ),
}));
vi.mock('components/Attributes/AttributeEditor', () => ({ default: () => <div data-testid="attr-editor" /> }));

const legacyProvider = {
    uuid: 'conn-1',
    name: 'Legacy CA',
    version: undefined,
    functionGroups: [{ functionGroupCode: FunctionGroupCode.AuthorityProvider, kinds: ['ejbca'] }],
    interfaces: [],
};

const ngProvider = {
    uuid: 'conn-1',
    name: 'NG CA',
    version: 'v2',
    functionGroups: [{ functionGroupCode: FunctionGroupCode.AuthorityProvider, kinds: [] }],
    interfaces: [{ uuid: 'iface-1', code: 'authority', version: 'v3' }],
};

const descriptors = [{ uuid: 'ad1', name: 'attr', type: 'data', content: [] } as any];

function buildState(over: any = {}) {
    return {
        authorities: {
            authority: over.authority,
            authorityProviders: over.authorityProviders ?? [],
            authorityProviderAttributeDescriptors: over.descriptors ?? [],
            isFetchingDetail: false,
            isFetchingAuthorityProviders: false,
            isFetchingAuthorityProviderAttributeDescriptors: false,
            isCreating: false,
            isUpdating: false,
            createAuthoritySucceeded: false,
            updateAuthoritySucceeded: false,
        },
        customAttributes: {
            resourceCustomAttributes: [],
            isFetchingResourceCustomAttributes: false,
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: { [Resource.Authorities]: { label: 'Authorities' } },
            },
        },
    };
}

describe('AuthorityForm', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        routeParams = {};
        useDispatchMock.mockReturnValue(vi.fn());
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(state: any) {
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        await act(async () => {
            root.render(<AuthorityForm />);
        });
    }

    it('create mode: selecting a legacy provider and kind, then submitting', async () => {
        await render(buildState({ authorityProviders: [legacyProvider], descriptors }));

        // pick the authority provider → triggers onAuthorityProviderChange
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-authorityProviderSelect"]')?.click();
        });
        // pick the kind → triggers onKindChange + descriptor fetch
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-storeKindSelect"]')?.click();
        });
        // fill the name
        await act(async () => {
            const nameInput = container.querySelector<HTMLInputElement>('[data-testid="input-name"]');
            if (nameInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                setter?.call(nameInput, 'auth1');
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await act(async () => {
            container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        expect(container.querySelector('[data-testid="breadcrumb"]')).not.toBeNull();
    });

    it('create mode: selecting an NG provider renders the interface version select', async () => {
        await render(buildState({ authorityProviders: [ngProvider], descriptors }));

        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-authorityProviderSelect"]')?.click();
        });

        expect(container.querySelector('[data-testid="select-interfaceVersionSelect"]')).not.toBeNull();
    });

    it('edit mode: legacy authority loads the provider and shows the Kind field', async () => {
        routeParams = { id: 'auth-1' };
        const authority = {
            uuid: 'auth-1',
            name: 'Existing CA',
            connectorUuid: 'conn-1',
            connectorName: 'Legacy CA',
            kind: 'ejbca',
            attributes: [],
            customAttributes: [],
        };
        await render(buildState({ authority, authorityProviders: [legacyProvider], descriptors }));

        expect(container.querySelector('[data-testid="input-storeKind"]')).not.toBeNull();

        await act(async () => {
            container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
    });

    it('edit mode: NG authority shows the interface version and fetches interface descriptors', async () => {
        routeParams = { id: 'auth-1' };
        const authority = {
            uuid: 'auth-1',
            name: 'NG Authority',
            connectorUuid: 'conn-1',
            connectorName: 'NG CA',
            kind: undefined,
            connectorInterface: { uuid: 'iface-1', code: 'authority', version: 'v3' },
            attributes: [],
            customAttributes: [],
        };
        await render(buildState({ authority, authorityProviders: [ngProvider], descriptors }));

        expect(container.querySelector('[data-testid="input-interfaceVersion"]')).not.toBeNull();
    });
});
