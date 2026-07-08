import { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import AuthorityDetail from './index';
import { PlatformEnum, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    useParams: () => ({ id: 'auth-1' }),
    useNavigate: () => vi.fn(),
    Link: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('components/Container', async () => {
    const { containerMockModule } = await import('../../test-utils/mockModules');
    return containerMockModule();
});

vi.mock('components/Widget', async () => {
    const { widgetMockModule } = await import('../../test-utils/mockModules');
    return widgetMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('components/Breadcrumb', () => ({
    default: ({ items }: any) => <div>{items?.[1]?.label}</div>,
}));

vi.mock('components/Label', () => ({
    default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('components/DetailPageSkeleton', () => ({
    default: () => <div data-testid="skeleton">skeleton</div>,
}));

vi.mock('components/Attributes/AttributeViewer', () => ({
    default: () => <div data-testid="attributes">attributes</div>,
}));

vi.mock('components/Attributes/CustomAttributeWidget', () => ({
    default: () => <div data-testid="custom-attributes">custom-attributes</div>,
}));

vi.mock('utils/widget', () => ({
    getEditAndDeleteWidgetButtons: () => [],
    createWidgetDetailHeaders: () => [],
}));

const baseAuthority = {
    uuid: 'auth-1',
    name: 'Authority One',
    connectorUuid: 'conn-1',
    connectorName: 'Connector One',
    attributes: [],
    customAttributes: [],
};

function buildState(authority: any) {
    return {
        authorities: {
            authority,
            isFetchingDetail: false,
            isDeleting: false,
            deleteErrorMessage: '',
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Authorities]: { label: 'Authorities' },
                },
            },
        },
    };
}

describe('AuthorityDetail - connector interface row', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        useDispatchMock.mockReturnValue(vi.fn());
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.clearAllMocks();
    });

    it('shows the Connector Interface row for an NG authority bound to an interface', async () => {
        const state = buildState({
            ...baseAuthority,
            kind: undefined,
            connectorInterface: { uuid: 'iface-1', code: 'authority', version: 'v3' },
        });
        useSelectorMock.mockImplementation((selector: any) => selector(state));

        await act(async () => {
            root.render(<AuthorityDetail />);
        });

        const row = container.querySelector('[data-testid="row-connectorInterface"]');
        expect(row?.textContent).toContain('Connector Interface');
        expect(row?.textContent).toContain('Authority (v3)');
        expect(container.querySelector('[data-testid="row-kind"]')).toBeNull();
    });

    it('omits the Connector Interface row and shows Kind for a legacy authority', async () => {
        const state = buildState({ ...baseAuthority, kind: 'ejbca' });
        useSelectorMock.mockImplementation((selector: any) => selector(state));

        await act(async () => {
            root.render(<AuthorityDetail />);
        });

        expect(container.querySelector('[data-testid="row-connectorInterface"]')).toBeNull();
        const kindRow = container.querySelector('[data-testid="row-kind"]');
        expect(kindRow?.textContent).toContain('Kind');
        expect(kindRow?.textContent).toContain('ejbca');
    });
});
