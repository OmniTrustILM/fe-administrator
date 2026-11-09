import type { MouseEvent } from 'react';
import { useDispatch } from 'react-redux';

import settingsReducer, { actions } from 'ducks/settings';
import type { PlatformSettingsFieldErrors } from 'utils/platform-settings';
import { overlaySliceReducer } from 'utils/test-helpers';

/** The test reducers with the real settings reducer for the platform update. A harness needs it to end an update a form started. */
export const platformSettingsUpdateReducer = overlaySliceReducer('settings', settingsReducer, [
    actions.updatePlatformSettings,
    actions.updatePlatformSettingsSuccess,
    actions.updatePlatformSettingsFailure,
]);

type Props = Readonly<{
    /** What Core refuses on the simulated refusal, keyed by update-body path. */
    fieldErrors?: PlatformSettingsFieldErrors;
}>;

/** The form meets the outcome with its field still focused, as after a save with Enter. */
const keepFocusInTheForm = (event: MouseEvent) => event.preventDefault();

/** Ends the update in flight with one of the settings slice's outcomes: saved, refused on a field, or failed. */
export function PlatformSettingsUpdateOutcomes({ fieldErrors }: Props) {
    const dispatch = useDispatch();

    return (
        <>
            <button
                type="button"
                data-testid="simulate-update-success"
                onMouseDown={keepFocusInTheForm}
                onClick={() => dispatch(actions.updatePlatformSettingsSuccess({}))}
            >
                Simulate success
            </button>
            <button
                type="button"
                data-testid="simulate-update-refusal"
                onMouseDown={keepFocusInTheForm}
                onClick={() => dispatch(actions.updatePlatformSettingsFailure({ error: 'Refused', fieldErrors }))}
            >
                Simulate refusal
            </button>
            <button
                type="button"
                data-testid="simulate-update-failure"
                onMouseDown={keepFocusInTheForm}
                onClick={() => dispatch(actions.updatePlatformSettingsFailure({ error: 'Failed to update platform settings' }))}
            >
                Simulate failure
            </button>
        </>
    );
}
