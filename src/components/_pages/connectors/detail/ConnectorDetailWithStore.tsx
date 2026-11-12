import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ConnectorResponseModel, HealthModel } from 'types/connectors';
import { Resource, ResourceAction } from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import ConnectorDetail from './index';

export type ConnectorDetailWithStoreProps = Readonly<{
    connector: ConnectorResponseModel;
    health?: HealthModel;
    /** What the allowed-actions endpoint answered for the connector; every action when omitted. */
    allowedActions?: ResourceAction[];
}>;

export default function ConnectorDetailWithStore({
    connector,
    health,
    allowedActions = Object.values(ResourceAction),
}: ConnectorDetailWithStoreProps) {
    const [store] = useState(() =>
        createMockStore({
            auth: { profile: { username: 'user', permissions: { allowedListings: [Resource.Connectors], allowedActions: [] } } },
            resource: {
                resourcesList: [],
                isFetchingResourcesList: false,
                objectAllowedActions: { [`${Resource.Connectors}/${connector.uuid}`]: { status: 'loaded', allowedActions } },
            },
            connectors: { callbackData: {}, isRunningCallback: {}, connector, connectorHealth: health },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/connectors/detail/${connector.uuid}`]}>
                <Routes>
                    <Route path="/connectors/detail/:id" element={<ConnectorDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
