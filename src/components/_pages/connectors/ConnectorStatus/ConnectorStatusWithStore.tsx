import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import InventoryStatusBadge from './index';
import { ConnectorStatus, PlatformEnum } from 'types/openapi';

const connectorStatusLabels: Record<string, { label: string }> = {
    [ConnectorStatus.Connected]: { label: 'Connected' },
    [ConnectorStatus.Failed]: { label: 'Failed' },
    [ConnectorStatus.Offline]: { label: 'Offline' },
    [ConnectorStatus.WaitingForApproval]: { label: 'Waiting for approval' },
};

const preloadedState: Parameters<typeof createMockStore>[0] = {
    enums: {
        platformEnums: {
            [PlatformEnum.ConnectorStatus]: connectorStatusLabels,
        },
    },
};

export type ConnectorStatusWithStoreProps = Readonly<React.ComponentProps<typeof InventoryStatusBadge>>;

export default function ConnectorStatusWithStore(props: ConnectorStatusWithStoreProps) {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <InventoryStatusBadge {...props} />
            </MemoryRouter>
        </Provider>
    );
}
