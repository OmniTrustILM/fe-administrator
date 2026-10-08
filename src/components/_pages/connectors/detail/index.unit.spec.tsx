import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import ConnectorDetail from './index';
import { HealthStatus, PlatformEnum, Resource } from 'types/openapi';
import type { HealthModel } from 'types/connectors';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    useParams: () => ({ id: 'conn-1' }),
    Link: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('components/Badge', () => ({
    default: ({ color, children }: { color?: string; children?: React.ReactNode }) => (
        <span data-testid="badge" data-color={color}>
            {children}
        </span>
    ),
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
    default: () => <div />,
}));

function buildState(health: HealthModel) {
    return {
        connectors: {
            connectorHealth: health,
            isFetchingDetail: false,
            deleteErrorMessage: '',
        },
        enums: {
            platformEnums: {
                [PlatformEnum.Resource]: {
                    [Resource.Connectors]: { label: 'Connectors' },
                },
            },
        },
    };
}

function badgeColor(container: HTMLElement, rowId: string) {
    return container.querySelector(`[data-testid="row-${rowId}"] [data-testid="badge"]`)?.getAttribute('data-color');
}

describe('ConnectorDetail health table', () => {
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

    it.each([
        [HealthStatus.Up, 'success'],
        [HealthStatus.Degraded, 'warning'],
        [HealthStatus.Down, 'danger'],
        [HealthStatus.OutOfService, 'danger'],
        [HealthStatus.Unknown, 'transparent'],
    ])('shows a %s status as a %s badge on the overall and component rows', async (status, color) => {
        const state = buildState({ status, parts: { profile: { status } } });
        useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) => selector(state));

        await act(async () => {
            root.render(<ConnectorDetail />);
        });

        expect(badgeColor(container, 'overallHealth')).toBe(color);
        expect(badgeColor(container, 'profile')).toBe(color);
    });
});
