import { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { actions as customAttributesActions } from 'ducks/customAttributes';
import { testInitialState } from 'ducks/test-reducers';
import type { CustomAttributeModel } from 'types/attributes';
import type { RoleDetailModel } from 'types/roles';
import { useRecordingStore } from 'utils/test-helpers';
import RoleForm from './index';

export type RoleFormWithStoreProps = Readonly<{
    initialRoute?: string;
    /** Route pattern the form renders under. An `:id` in it selects edit mode. */
    routePath?: string;
    /** Role held in the store, such as the last viewed one. */
    role?: RoleDetailModel;
    customAttributes?: CustomAttributeModel[];
}>;

export function RoleFormWithStore({ initialRoute = '/roles', routePath = '/roles', role, customAttributes = [] }: RoleFormWithStoreProps) {
    const state = useMemo(() => ({ roles: { ...testInitialState.roles, role } }), [role]);
    const { store, dispatched } = useRecordingStore(state, 'roles/');

    useEffect(() => {
        store.dispatch(customAttributesActions.listResourceCustomAttributesSuccess(customAttributes));
    }, [store, customAttributes]);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path={routePath} element={<RoleForm onCancel={() => {}} />} />
                </Routes>
            </MemoryRouter>
            <output data-testid="role-actions">{JSON.stringify(dispatched)}</output>
        </Provider>
    );
}

export default RoleFormWithStore;
