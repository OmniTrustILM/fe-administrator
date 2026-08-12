import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import Alerts from './index';
import { alertsSlice } from 'ducks/alert-slice';

export type AlertsWithStoreProps = {
    preloadedState?: NonNullable<Parameters<typeof createMockStore>[0]>;
    autoDismissMs?: number;
};

const defaultPreloadedState: Parameters<typeof createMockStore>[0] = {
    [alertsSlice.name]: {
        messages: [],
        msgId: 0,
    },
};

function AlertsWithStore({ preloadedState, autoDismissMs }: Readonly<AlertsWithStoreProps>) {
    const store = createMockStore(preloadedState ?? defaultPreloadedState);
    return (
        <Provider store={store}>
            <Alerts autoDismissMs={autoDismissMs} />
        </Provider>
    );
}
export default AlertsWithStore;
