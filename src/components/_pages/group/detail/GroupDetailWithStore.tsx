import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { initialState as certificateGroupsInitialState } from 'ducks/certificateGroups';
import type { CertificateGroupResponseModel } from 'types/certificateGroups';
import { Resource, ResourceAction } from 'types/openapi';
import GroupDetail from './index';

type Props = Readonly<{
    /** What the allowed-actions endpoint answered for the group; every action when omitted. */
    allowedActions?: ResourceAction[];
}>;

const group: CertificateGroupResponseModel = { uuid: 'group-1', name: 'Platform operations', description: 'Ops group' };

export default function GroupDetailWithStore({ allowedActions = Object.values(ResourceAction) }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Groups,
            uuid: group.uuid,
            allowedActions,
            preloadedState: { certificateGroups: { ...certificateGroupsInitialState, certificateGroup: group } },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/groups/detail/${group.uuid}`]}>
                <Routes>
                    <Route path="/groups/detail/:id" element={<GroupDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
