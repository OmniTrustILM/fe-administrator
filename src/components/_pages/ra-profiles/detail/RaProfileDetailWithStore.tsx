import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { slice as acmeProfilesSlice } from 'ducks/acme-profiles';
import { slice as approvalProfilesSlice } from 'ducks/approval-profiles';
import { slice as cmpProfilesSlice } from 'ducks/cmp-profiles';
import { initialState as complianceProfilesInitialState } from 'ducks/compliance-profiles';
import { slice as estProfilesSlice } from 'ducks/est-profiles';
import { initialState as raProfilesInitialState } from 'ducks/ra-profiles';
import { slice as scepProfilesSlice } from 'ducks/scep-profiles';
import { testInitialState } from 'ducks/test-reducers';
import { Resource, ResourceAction } from 'types/openapi';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import RaProfileDetail from './index';

type Props = Readonly<{
    /** What the allowed-actions endpoint answered for the RA profile; every action when omitted. */
    allowedActions?: ResourceAction[];
    /** Actions the user holds on whole resources; none when omitted. */
    resourceGrants?: { resource: Resource; actions: ResourceAction[] }[];
    /** Resources the user holds object access on; none when omitted. */
    objectAccess?: Resource[];
    /** Opens a profile that has no authority, under the route's `unknown` segment. */
    withoutAuthority?: boolean;
}>;

const raProfile = {
    uuid: 'ra-profile-1',
    name: 'Issuing RA profile',
    enabled: true,
    authorityInstanceUuid: 'authority-1',
    authorityInstanceName: 'Authority',
    attributes: [],
    certificateValidationSettings: { usePlatformSettings: true },
} as unknown as RaProfileResponseModel;

export default function RaProfileDetailWithStore({
    allowedActions = Object.values(ResourceAction),
    resourceGrants,
    objectAccess,
    withoutAuthority,
}: Props) {
    const profile = withoutAuthority ? { ...raProfile, authorityInstanceUuid: undefined, authorityInstanceName: undefined } : raProfile;
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.RaProfiles,
            uuid: raProfile.uuid,
            allowedActions,
            resourceGrants,
            objectAccess,
            realSlices: [acmeProfilesSlice, approvalProfilesSlice, cmpProfilesSlice, estProfilesSlice, scepProfilesSlice],
            preloadedState: {
                raprofiles: { ...raProfilesInitialState, ...testInitialState.raprofiles, raProfile: profile },
                complianceProfiles: { ...complianceProfilesInitialState, ...testInitialState.complianceProfiles },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/raprofiles/detail/${profile.authorityInstanceUuid ?? 'unknown'}/${profile.uuid}`]}>
                <Routes>
                    <Route path="/raprofiles/detail/:authorityId/:id" element={<RaProfileDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
