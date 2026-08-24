import { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import UserDetail from './index';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    useParams: () => ({ id: 'user-1' }),
    Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
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

vi.mock('components/Badge', async () => {
    const { badgeMockModule } = await import('../../test-utils/mockModules');
    return badgeMockModule();
});

vi.mock('components/StatusBadge', () => ({
    default: ({ enabled }: { enabled?: boolean }) => <span>{enabled ? 'Enabled' : 'Disabled'}</span>,
}));

vi.mock('components/Breadcrumb', () => ({
    default: () => <div>breadcrumb</div>,
}));

vi.mock('components/DetailPageSkeleton', () => ({
    default: () => <div data-testid="skeleton">skeleton</div>,
}));

vi.mock('components/Attributes/CustomAttributeWidget', () => ({
    default: () => <div data-testid="custom-attributes">custom-attributes</div>,
}));

vi.mock('utils/widget', () => ({
    createWidgetDetailHeaders: () => [],
}));

const baseUser = {
    uuid: 'user-1',
    username: 'jsmith',
    enabled: true,
    systemUser: false,
    groups: [],
    roles: [],
    customAttributes: [],
};

const certificate = {
    uuid: 'cert-1',
    subjectDn: 'CN=jsmith',
    issuerDn: 'CN=Test CA',
    serialNumber: 'abc123',
};

function buildState({ user, certificateDetail }: { user: unknown; certificateDetail?: unknown }) {
    return {
        users: {
            user,
            isFetchingDetail: false,
            isFetchingRoles: false,
            isDisabling: false,
            isEnabling: false,
            isUpdating: false,
            updateUserSucceeded: false,
        },
        customAttributes: {
            isFetchingResourceCustomAttributes: false,
            isUpdatingContent: false,
        },
        certificates: {
            certificateDetail,
            isFetchingDetail: false,
        },
        auth: {
            profile: { uuid: 'admin-1' },
        },
    };
}

describe('UserDetail - user certificate details', () => {
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

    async function render(state: unknown) {
        useSelectorMock.mockImplementation((selector: (s: unknown) => unknown) => selector(state));

        await act(async () => {
            root.render(<UserDetail />);
        });
    }

    it('shows an empty state when the user has no associated certificate', async () => {
        await render(buildState({ user: baseUser }));

        const notice = container.querySelector('[data-testid="user-no-certificate"]');
        expect(notice?.textContent).toContain('No certificate is associated with this user');
        expect(container.textContent).not.toContain('Certificate information not available');
    });

    it('shows the certificate attributes when the user has an associated certificate', async () => {
        await render(buildState({ user: { ...baseUser, certificate: { uuid: 'cert-1' } }, certificateDetail: certificate }));

        expect(container.querySelector('[data-testid="user-no-certificate"]')).toBeNull();
        expect(container.querySelector('[data-testid="row-subjectDN"]')?.textContent).toContain('CN=jsmith');
    });

    it('does not show the empty state before the user detail has been loaded', async () => {
        await render(buildState({ user: undefined }));

        expect(container.querySelector('[data-testid="user-no-certificate"]')).toBeNull();
    });

    it('does not show the empty state while the associated certificate has not been loaded yet', async () => {
        await render(buildState({ user: { ...baseUser, certificate: { uuid: 'cert-1' } }, certificateDetail: undefined }));

        expect(container.querySelector('[data-testid="user-no-certificate"]')).toBeNull();
        expect(container.textContent).toContain('Certificate information not available');
    });
});
