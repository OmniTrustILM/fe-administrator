import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { slice as cbomActuatorSlice } from 'ducks/cbomActuator';
import { testInitialState } from 'ducks/test-reducers';
import { slice as utilsActuatorSlice } from 'ducks/utilsActuator';
import { Resource, type ResourceAction } from 'types/openapi';
import PlatformSettingsDetail from './index';

type Props = Readonly<{
    /** The actions the user's profile grants on settings. */
    settingsActions: ResourceAction[];
}>;

export default function PlatformSettingsDetailWithStore({ settingsActions }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Settings,
            uuid: 'unused',
            allowedActions: [],
            realSlices: [utilsActuatorSlice, cbomActuatorSlice],
            preloadedState: {
                auth: {
                    ...testInitialState.auth,
                    profile: {
                        username: 'user',
                        permissions: {
                            allowedListings: [Resource.Settings],
                            allowedActions: [{ resource: Resource.Settings, actions: settingsActions }],
                        },
                    },
                },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/settings']}>
                <PlatformSettingsDetail />
            </MemoryRouter>
        </Provider>
    );
}
