import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
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
    /** A permission scenario by name, whose profile and answer replace the two props above. */
    scenario?: string;
    /** Loads an RA profile that has no authority. */
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
    renewalSettings: {
        windowEnabled: false,
        windowStartPercent: 67,
        windowEndPercent: 80,
        useAuthorityRenewalInfo: false,
        authorityRenewalInfoSupported: true,
        autoRenewalEnabled: true,
        autoRenewalMaxAttempts: 7,
    },
} as unknown as RaProfileResponseModel;

export default function RaProfileDetailWithStore({
    allowedActions = Object.values(ResourceAction),
    resourceGrants,
    scenario,
    withoutAuthority = false,
}: Props) {
    const loaded = withoutAuthority ? { ...raProfile, authorityInstanceUuid: undefined } : raProfile;
    const [store] = useState(() => {
        const permissions = scenario
            ? scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!, {
                  resource: Resource.RaProfiles,
                  uuid: raProfile.uuid,
              })
            : {};
        return createObjectPermissionStore({
            resource: Resource.RaProfiles,
            uuid: raProfile.uuid,
            allowedActions,
            resourceGrants,
            realSlices: [acmeProfilesSlice, approvalProfilesSlice, cmpProfilesSlice, estProfilesSlice, scepProfilesSlice],
            preloadedState: {
                raprofiles: { ...raProfilesInitialState, ...testInitialState.raprofiles, raProfile: loaded },
                complianceProfiles: { ...complianceProfilesInitialState, ...testInitialState.complianceProfiles },
                ...permissions,
            },
        });
    });

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/raprofiles/detail/${raProfile.authorityInstanceUuid}/${raProfile.uuid}`]}>
                <Routes>
                    <Route path="/raprofiles/detail/:authorityId/:id" element={<RaProfileDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
