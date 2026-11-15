import { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { actions as customAttributesActions } from 'ducks/customAttributes';
import { actions as usersActions } from 'ducks/users';
import { testInitialState } from 'ducks/test-reducers';
import type { CustomAttributeModel } from 'types/attributes';
import type { RoleResponseModel, UserDetailModel } from 'types/auth';
import { useRecordingStore } from 'utils/test-helpers';
import UserForm from './index';

export type UserFormWithStoreProps = Readonly<{
    roles: RoleResponseModel[];
    user?: UserDetailModel;
    customAttributes?: CustomAttributeModel[];
    withCreateFailure?: boolean;
}>;

export function UserFormWithStore({ roles, user, customAttributes = [], withCreateFailure = false }: UserFormWithStoreProps) {
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
        store.dispatch(customAttributesActions.listResourceCustomAttributesSuccess(customAttributes));
    }, [store, customAttributes]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <UserForm userId={user?.uuid} />
            </MemoryRouter>
            <output data-testid="user-actions">{JSON.stringify(dispatched)}</output>
            {withCreateFailure && (
                <button type="button" onClick={() => store.dispatch(usersActions.createFailure({ error: 'boom' }))}>
                    Fail create
                </button>
            )}
        </Provider>
    );
}

export default UserFormWithStore;
