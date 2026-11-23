import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { initialState as signingProfilesInitialState, type State as SigningProfilesState } from 'ducks/signing-profiles';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { SigningScheme, SigningWorkflowType } from 'types/openapi';
import SigningProfilesList from './SigningProfilesList';

type HarnessState = ReturnType<typeof testReducers> & { signingProfiles: SigningProfilesState };

const signingProfiles: SigningProfilesState = {
    ...signingProfilesInitialState,
    signingProfiles: [
        {
            uuid: 'signing-profile-1',
            name: 'Signing profile one',
            version: 1,
            enabled: true,
            signingWorkflowType: SigningWorkflowType.Timestamping,
            signingScheme: SigningScheme.Delegated,
            enabledProtocols: [],
        },
    ],
};

// The test reducers carry no signing-profiles slice, so it is held as preloaded.
const reducer = (state: HarnessState | undefined, action: UnknownAction): HarnessState => {
    const { signingProfiles: held, ...rest } = state ?? ({} as HarnessState);
    return { ...testReducers(rest as ReturnType<typeof testReducers>, action), signingProfiles: held ?? signingProfiles };
};

/** The signing profile inventory with one profile, as the named permission scenario sees it. */
export default function SigningProfilesListWithStore({ scenario }: Readonly<{ scenario: string }>) {
    const [store] = useState(() =>
        configureStore({
            reducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
            preloadedState: {
                ...testInitialState,
                ...scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!),
                signingProfiles,
            } as HarnessState,
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/signingprofiles']}>
                <SigningProfilesList />
            </MemoryRouter>
        </Provider>
    );
}
