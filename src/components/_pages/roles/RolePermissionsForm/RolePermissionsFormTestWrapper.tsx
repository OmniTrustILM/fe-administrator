import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';

import { testInitialState } from 'ducks/test-reducers';
import type { AuthResourceModel } from 'types/auth';
import { Resource } from 'types/openapi';
import type { RoleDetailModel, SubjectPermissionsModel } from 'types/roles';
import { useRecordingStore } from 'utils/test-helpers';

import RolePermissionsForm from './index';

export type RolePermissionsFormTestWrapperProps = Readonly<{
    permissions: SubjectPermissionsModel;
}>;

const raProfilesResource: AuthResourceModel = {
    uuid: 'resource-ra-profiles',
    name: Resource.RaProfiles,
    displayName: 'RA Profiles',
    listObjectsEndpoint: '/v1/raProfiles/objects',
    objectAccess: true,
    actions: [
        { uuid: 'action-list', name: 'list', displayName: 'List' },
        { uuid: 'action-detail', name: 'detail', displayName: 'Detail' },
        { uuid: 'action-members', name: 'members', displayName: 'Members' },
    ],
};

const raProfileObjects = [
    { uuid: 'ra-1', name: 'RA One' },
    { uuid: 'ra-2', name: 'RA Two' },
];

export function RolePermissionsFormTestWrapper({ permissions }: RolePermissionsFormTestWrapperProps) {
    const state = useMemo(
        () => ({
            auth: { ...testInitialState.auth, resources: [raProfilesResource], objects: raProfileObjects },
            roles: {
                ...testInitialState.roles,
                role: { uuid: 'role-1', name: 'Operators', systemRole: false } as RoleDetailModel,
                rolePermissions: { uuid: 'role-1', permissions },
            },
        }),
        [permissions],
    );
    const { store, dispatched } = useRecordingStore(state, 'roles/updatePermissions');

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/roles/permissions/role-1']}>
                <Routes>
                    <Route path="/roles/permissions/:id" element={<RolePermissionsForm />} />
                </Routes>
                <div data-testid="dispatched">{JSON.stringify(dispatched)}</div>
            </MemoryRouter>
        </Provider>
    );
}

export default RolePermissionsFormTestWrapper;
