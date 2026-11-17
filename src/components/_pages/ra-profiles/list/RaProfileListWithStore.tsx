import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { PERMISSION_SCENARIOS, scenarioState } from 'components/_pages/test-utils/permissionScenarios';
import { initialState as raProfilesInitialState } from 'ducks/ra-profiles';
import { testInitialState } from 'ducks/test-reducers';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import { createMockStore } from 'utils/test-helpers';
import RaProfileList from './index';

const raProfile = {
    uuid: 'ra-profile-1',
    name: 'RA profile one',
    enabled: true,
    authorityInstanceUuid: 'authority-1',
    authorityInstanceName: 'Authority',
} as unknown as RaProfileResponseModel;

/**
 * The RA profile inventory with its one profile selected, as the named permission scenario sees it. The selection is
 * preloaded because the test reducer does not record it.
 */
export default function RaProfileListWithStore({ scenario }: Readonly<{ scenario: string }>) {
    const [store] = useState(() =>
        createMockStore({
            ...scenarioState(PERMISSION_SCENARIOS.find((candidate) => candidate.name === scenario)!),
            raprofiles: {
                ...raProfilesInitialState,
                ...testInitialState.raprofiles,
                raProfiles: [raProfile],
                checkedRows: [raProfile.uuid],
            },
        } as never),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/raprofiles']}>
                <RaProfileList />
            </MemoryRouter>
        </Provider>
    );
}
