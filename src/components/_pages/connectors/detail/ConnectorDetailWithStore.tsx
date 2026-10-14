import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ConnectorResponseModel, HealthModel } from 'types/connectors';
import { createMockStore } from 'utils/test-helpers';
import ConnectorDetail from './index';

export type ConnectorDetailWithStoreProps = Readonly<{
    connector: ConnectorResponseModel;
    health?: HealthModel;
}>;

export default function ConnectorDetailWithStore({ connector, health }: ConnectorDetailWithStoreProps) {
    const [store] = useState(() =>
        createMockStore({ connectors: { callbackData: {}, isRunningCallback: {}, connector, connectorHealth: health } }),
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
