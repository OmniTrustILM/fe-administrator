import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import type { ConnectInfoDto } from 'types/openapi';
import ConnectorForm from './index';

export type ConnectorFormWithStoreProps = Readonly<
    React.ComponentProps<typeof ConnectorForm> & {
        connectInfo?: ConnectInfoDto[];
    }
>;

export default function ConnectorFormWithStore({ connectInfo, ...props }: ConnectorFormWithStoreProps) {
    const store = createMockStore({
        connectors: {
            callbackData: {},
            isRunningCallback: {},
            connectInfo,
        },
    });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ConnectorForm {...props} />
            </MemoryRouter>
        </Provider>
    );
}
