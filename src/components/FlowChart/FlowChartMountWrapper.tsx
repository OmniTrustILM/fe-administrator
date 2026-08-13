import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import FlowChart, { type FlowChartProps } from './index';
import { createMockStore } from 'utils/test-helpers';
import { testInitialState } from 'ducks/test-reducers';

type StoreType = ReturnType<typeof createMockStore>;

type Props = {
    flowChartProps: FlowChartProps;
    initialStoreState?: typeof testInitialState;
    onStoreReady?: (store: StoreType) => void;
};

export default function FlowChartMountWrapper({ flowChartProps, initialStoreState, onStoreReady }: Readonly<Props>) {
    const store = React.useMemo(() => createMockStore(initialStoreState ?? testInitialState), [initialStoreState]);

    React.useEffect(() => {
        onStoreReady?.(store);
    }, [store, onStoreReady]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ThemeProvider>
                    <FlowChart {...flowChartProps} />
                </ThemeProvider>
            </MemoryRouter>
        </Provider>
    );
}
