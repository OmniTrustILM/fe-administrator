import { Provider } from 'react-redux';

import type { testReducers } from 'ducks/test-reducers';
import { useRecordingStore } from 'utils/test-helpers';

import CertificateSettingsForm from './CertificateSettingsForm';

export type CertificateSettingsFormTestWrapperProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
    preloadedState?: Partial<ReturnType<typeof testReducers>>;
}>;

/**
 * Playwright CT cannot carry a live Redux store instance created in the test file across the
 * Node/browser boundary — a store built there and passed in as a prop mounts fine (Provider
 * renders), but the first `useSelector` read inside the tree sees an undefined snapshot and
 * throws. Building the store inside the mounted component (as done here) avoids that entirely.
 * See CertificateFormTestWrapper.tsx for the established precedent.
 */
export function CertificateSettingsFormTestWrapper({ onCancel, onSuccess, preloadedState }: CertificateSettingsFormTestWrapperProps) {
    const { store, dispatched } = useRecordingStore(preloadedState, 'settings/updatePlatformSettings');

    return (
        <Provider store={store}>
            <CertificateSettingsForm onCancel={onCancel} onSuccess={onSuccess} />
            <output data-testid="update-platform-settings">{JSON.stringify(dispatched.map(({ payload }) => payload))}</output>
        </Provider>
    );
}

export default CertificateSettingsFormTestWrapper;
