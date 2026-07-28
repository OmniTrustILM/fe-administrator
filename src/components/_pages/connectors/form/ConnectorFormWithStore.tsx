import { useEffect, useState, type ComponentProps } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import type { ConnectInfoDto } from 'types/openapi';
import ConnectorForm from './index';

export type ConnectorFormWithStoreProps = Readonly<
    ComponentProps<typeof ConnectorForm> & {
        connectInfo?: ConnectInfoDto[];
    }
>;

export default function ConnectorFormWithStore({ connectInfo, ...props }: ConnectorFormWithStoreProps) {
    const [store] = useState(() =>
        createMockStore({
            connectors: {
                callbackData: {},
                isRunningCallback: {},
            },
        }),
    );

    useEffect(() => {
        if (!connectInfo) return;
        store.dispatch({ type: 'connectors/connectConnectorSuccess', payload: { connectionDetails: [], connectInfo } });
    }, [store, connectInfo]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ConnectorForm {...props} />
            </MemoryRouter>
        </Provider>
    );
}
