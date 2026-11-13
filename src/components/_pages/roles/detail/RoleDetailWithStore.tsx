import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { initialState as rolesInitialState } from 'ducks/roles';
import { Resource, type ResourceAction } from 'types/openapi';
import type { RoleDetailModel } from 'types/roles';
import { createMockStore } from 'utils/test-helpers';
import RoleDetail from './index';

type Props = Readonly<{
    /** The actions the user's profile grants on roles as a whole. */
    roleActions: ResourceAction[];
}>;

const role = { uuid: 'role-1', name: 'Operators', systemRole: false, users: [] } as unknown as RoleDetailModel;

export default function RoleDetailWithStore({ roleActions }: Props) {
    const [store] = useState(() =>
        createMockStore({
            auth: {
                profile: {
                    username: 'user',
                    permissions: {
                        allowedListings: [Resource.Roles],
                        allowedActions: [{ resource: Resource.Roles, actions: roleActions }],
                    },
                },
            },
            roles: { ...rolesInitialState, role },
        } as Parameters<typeof createMockStore>[0]),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/roles/detail/${role.uuid}`]}>
                <Routes>
                    <Route path="/roles/detail/:id" element={<RoleDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
