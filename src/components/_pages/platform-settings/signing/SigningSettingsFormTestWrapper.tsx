import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions } from 'ducks/settings';
import type { testReducers } from 'ducks/test-reducers';
import type { PlatformSettingsFieldErrors } from 'utils/platform-settings';
import { useRecordingStore } from 'utils/test-helpers';

import { PlatformSettingsUpdateOutcomes, platformSettingsUpdateReducer } from '../PlatformSettingsUpdateTestHarness';
import SigningSettings from './SigningSettings';
import SigningSettingsForm from './SigningSettingsForm';

export type SigningSettingsFormTestWrapperProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
    /** What Core refuses when the test ends the update with a refusal. */
    fieldErrors?: PlatformSettingsFieldErrors;
    /** Renders the read-only settings view beside the form, as the settings page does behind its edit dialog. */
    withReadOnlyView?: boolean;
}>;

export function SigningSettingsFormTestWrapper({
    onCancel,
    onSuccess,
    preloadedState,
    fieldErrors,
    withReadOnlyView = false,
}: SigningSettingsFormTestWrapperProps) {
    const { store, dispatched } = useRecordingStore(preloadedState, actions.updatePlatformSettings, platformSettingsUpdateReducer);
    const updates = dispatched.map(({ payload }) => payload);

    return (
        <Provider store={store}>
            {withReadOnlyView && (
                <MemoryRouter>
                    <SigningSettings platformSettings={preloadedState?.settings?.platformSettings} />
                </MemoryRouter>
            )}
            <SigningSettingsForm onCancel={onCancel} onSuccess={onSuccess} />
            <output data-testid="update-platform-settings">{JSON.stringify(updates)}</output>
            <PlatformSettingsUpdateOutcomes fieldErrors={fieldErrors} />
        </Provider>
    );
}

export default SigningSettingsFormTestWrapper;
