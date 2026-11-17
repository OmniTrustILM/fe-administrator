import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { testInitialState, type testReducers } from 'ducks/test-reducers';
import type { SecretDto } from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import SecretsList from './index';

type Props = Readonly<{
    preloadedState: Partial<ReturnType<typeof testReducers>>;
    seededSecrets?: SecretDto[];
}>;

export default function SecretsListWithStore({ preloadedState, seededSecrets }: Props) {
    const state = seededSecrets
        ? { ...preloadedState, secrets: { ...testInitialState.secrets, secrets: seededSecrets } as typeof testInitialState.secrets }
        : preloadedState;

    return (
        <Provider store={createMockStore(state)}>
            <MemoryRouter initialEntries={['/secrets']}>
                <SecretsList />
            </MemoryRouter>
        </Provider>
    );
}
