import { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { actions as customAttributesActions } from 'ducks/customAttributes';
import { testInitialState } from 'ducks/test-reducers';
import type { RoleResponseModel, UserDetailModel } from 'types/auth';
import { useRecordingStore } from 'utils/test-helpers';
import UserForm from './index';

export type UserFormWithStoreProps = Readonly<{
    roles: RoleResponseModel[];
    user?: UserDetailModel;
}>;

export function UserFormWithStore({ roles, user }: UserFormWithStoreProps) {
    const state = useMemo(
        () => ({
            roles: { ...testInitialState.roles, roles, isFetchingList: false },
            users: { ...testInitialState.users, user },
            certificates: { ...testInitialState.certificates, certificates: [] },
        }),
        [roles, user],
    );
    const { store, dispatched } = useRecordingStore(state, 'users/');

    useEffect(() => {
        store.dispatch(customAttributesActions.listResourceCustomAttributesSuccess([]));
    }, [store]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <UserForm userId={user?.uuid} />
            </MemoryRouter>
            <output data-testid="user-actions">{JSON.stringify(dispatched)}</output>
        </Provider>
    );
}

export default UserFormWithStore;
