import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { testReducers } from 'ducks/test-reducers';
import { createMockStore } from 'utils/test-helpers';
import SecretsList from './index';

type Props = Readonly<{
    preloadedState: Partial<ReturnType<typeof testReducers>>;
}>;

export default function SecretsListWithStore({ preloadedState }: Props) {
    return (
        <Provider store={createMockStore(preloadedState)}>
            <MemoryRouter initialEntries={['/secrets']}>
                <SecretsList />
            </MemoryRouter>
        </Provider>
    );
}
