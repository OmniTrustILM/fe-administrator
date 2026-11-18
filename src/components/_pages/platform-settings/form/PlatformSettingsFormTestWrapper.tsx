import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions } from 'ducks/settings';
import type { testReducers } from 'ducks/test-reducers';
import { useRecordingStore } from 'utils/test-helpers';

import { PlatformSettingsUpdateOutcomes, platformSettingsUpdateReducer } from '../PlatformSettingsUpdateTestHarness';
import PlatformSettingsForm from '.';

export type PlatformSettingsFormTestWrapperProps = Readonly<{
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    failureMessage?: string;
}>;

export function PlatformSettingsFormTestWrapper({ preloadedState, failureMessage }: PlatformSettingsFormTestWrapperProps) {
    const { store } = useRecordingStore(preloadedState, actions.updatePlatformSettings, platformSettingsUpdateReducer);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <PlatformSettingsForm />
            </MemoryRouter>
            <PlatformSettingsUpdateOutcomes failureMessage={failureMessage} />
        </Provider>
    );
}

export default PlatformSettingsFormTestWrapper;
