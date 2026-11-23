import type { Slice } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { initialState as signingProfilesInitialState } from 'ducks/signing-profiles';
import { initialState as tspProfilesInitialState } from 'ducks/tsp-profiles';
import { Resource, SigningScheme, SigningWorkflowType } from 'types/openapi';
import SigningProfileDetail from './SigningProfileDetail';

const enabledProfile = {
    uuid: 'signing-profile-1',
    name: 'Signing profile one',
    version: 1,
    enabled: true,
    workflow: { type: SigningWorkflowType.Timestamping },
    signingScheme: { signingScheme: SigningScheme.Delegated },
    customAttributes: [],
};
const signingProfiles = { enabled: enabledProfile, disabled: { ...enabledProfile, enabled: false } };

// The test reducers carry neither slice, and a real reducer would put the page's own fetch over the preloaded profile.
const heldSlice = (name: string, state: unknown) => ({ name, reducer: (held: unknown = state) => held }) as unknown as Slice;

/** The signing profile detail page as the named permission scenario sees it. */
export default function SigningProfileDetailWithStore({
    scenario,
    variant = 'enabled',
}: Readonly<{ scenario: string; variant?: keyof typeof signingProfiles }>) {
    const signingProfile = signingProfiles[variant];
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.SigningProfiles,
            uuid: signingProfile.uuid,
            allowedActions: [],
            realSlices: [
                heldSlice('signingProfiles', { ...signingProfilesInitialState, signingProfile }),
                heldSlice('tspProfiles', tspProfilesInitialState),
            ],
            preloadedState: scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!, {
                resource: Resource.SigningProfiles,
                uuid: signingProfile.uuid,
            }),
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/signingprofiles/detail/${signingProfile.uuid}`]}>
                <Routes>
                    <Route path="/signingprofiles/detail/:id" element={<SigningProfileDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
