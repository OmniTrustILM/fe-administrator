import { Provider } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import PlatformInfoDialogLink from './index';
import { slice as infoSlice } from 'ducks/info';
import { useMemo } from 'react';

export const defaultPlatformInfo = {
    app: { name: 'Core', version: '2.16.4-SNAPSHOT' },
    db: { system: 'PostgreSQL', version: '15.6' },
};

const defaultPreloadedState = {
    [infoSlice.name]: {
        platformInfo: defaultPlatformInfo,
        isFetching: false,
    },
};

export type PlatformInfoDialogButtonWithStoreProps = {
    preloadedState?: Parameters<typeof createMockStore>[0];
    initiallyOpen?: boolean;
    forceOpen?: boolean;
};

export default function PlatformInfoDialogButtonWithStore({
    preloadedState,
    initiallyOpen = false,
    forceOpen,
}: Readonly<PlatformInfoDialogButtonWithStoreProps>) {
    const store = useMemo(() => createMockStore(preloadedState ?? defaultPreloadedState), [preloadedState]);

    return (
        <Provider store={store}>
            <PlatformInfoDialogLink initiallyOpen={initiallyOpen} forceOpen={forceOpen} />
        </Provider>
    );
}
