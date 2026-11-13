import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialState } from 'ducks/est-profiles';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';
import EstProfileDetail from './index';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));
vi.mock('react-router', () => ({ useParams: () => ({ id: 'est-1' }), Link: ({ children }: any) => <a href="/">{children}</a> }));
vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});
vi.mock('components/Widget', () => ({ default: ({ title, children }: any) => <div data-testid={`widget-${title}`}>{children}</div> }));
vi.mock('components/Dialog', () => ({ default: () => null }));
vi.mock('components/Breadcrumb', () => ({ default: () => <div data-testid="breadcrumb" /> }));
vi.mock('components/Container', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/DetailPageSkeleton', () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock('components/CommentPanel', () => ({ default: () => null }));
vi.mock('components/CopyUrlCell', () => ({ default: () => null }));
vi.mock('components/StatusBadge', () => ({ default: () => <span /> }));
vi.mock('components/Badge', () => ({ default: () => <span /> }));
vi.mock('components/Attributes/AttributeViewer', () => ({ default: () => null }));
vi.mock('components/Attributes/CustomAttributeWidget', () => ({ default: () => null }));
vi.mock('../form', () => ({ default: () => <div /> }));

const profile = {
    uuid: 'est-1',
    name: 'est',
    enabled: true,
    systemDefault: false,
    authenticationPolicy: 'RA_MTLS',
    allowRenewal: true,
    allowRekey: true,
    serverKeyGeneration: false,
    keyRecovery: false,
    issueWaitTimeout: 0,
    retryAfter: 7,
    serverKeyGenerationTimeout: 45,
};

describe('EstProfileDetail response timing', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        useDispatchMock.mockReturnValue(vi.fn());
        const state = {
            estProfiles: { ...initialState, estProfile: profile },
            users: { users: [] },
            certificateGroups: { certificateGroups: [] },
            enums: { platformEnums: {} },
        };
        useSelectorMock.mockImplementation((selector: any) => selector(state));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('shows the issue wait, Retry-After and key generation wait in seconds', async () => {
        await act(async () => {
            root.render(<EstProfileDetail />);
        });

        const widget = container.querySelector('[data-testid="widget-Response Timing"]');
        expect(widget).not.toBeNull();
        expect(widget?.querySelector('[data-testid="row-issueWaitTimeout"]')?.textContent).toBe('Issue Wait0 s');
        expect(widget?.querySelector('[data-testid="row-retryAfter"]')?.textContent).toBe('Retry-After7 s');
        expect(widget?.querySelector('[data-testid="row-serverKeyGenerationTimeout"]')?.textContent).toBe('Key Generation Wait45 s');
    });
});
