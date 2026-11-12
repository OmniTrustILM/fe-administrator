import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { initialState as acmeProfilesInitialState, slice as acmeProfilesSlice } from 'ducks/acme-profiles';
import type { AcmeProfileResponseModel } from 'types/acme-profiles';
import { Resource, ResourceAction } from 'types/openapi';
import AcmeProfileDetail from './index';

type Props = Readonly<{
    /** What the allowed-actions endpoint answered for the ACME profile; every action when omitted. */
    allowedActions?: ResourceAction[];
}>;

const acmeProfile = { uuid: 'acme-profile-1', name: 'ACME profile', enabled: true } as unknown as AcmeProfileResponseModel;

export default function AcmeProfileDetailWithStore({ allowedActions = Object.values(ResourceAction) }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.AcmeProfiles,
            uuid: acmeProfile.uuid,
            allowedActions,
            realSlices: [acmeProfilesSlice],
            preloadedState: { acmeProfiles: { ...acmeProfilesInitialState, acmeProfile } },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/acmeprofiles/detail/${acmeProfile.uuid}`]}>
                <Routes>
                    <Route path="/acmeprofiles/detail/:id" element={<AcmeProfileDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
