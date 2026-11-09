import CertificateSettingsForm from 'components/_pages/platform-settings/certificates/CertificateSettingsForm';
import SigningSettingsForm from 'components/_pages/platform-settings/signing/SigningSettingsForm';
import UtilsSettingsForm from 'components/_pages/platform-settings/utils/UtilsSettingsForm';
import Callout from 'components/Callout';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';

import { selectors } from 'ducks/settings';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRunOnFinish } from 'utils/common-hooks';

type PlatformSettingsFormProps = Readonly<{
    onCancel?: () => void;
    onSuccess?: () => void;
}>;

export default function PlatformSettingsForm({ onCancel, onSuccess }: PlatformSettingsFormProps) {
    const isFetchingPlatform = useSelector(selectors.isFetchingPlatform);
    const isUpdatingPlatform = useSelector(selectors.isUpdatingPlatform);
    const updateSucceeded = useSelector(selectors.updatePlatformSettingsSucceeded);
    const updateError = useSelector(selectors.platformSettingsUpdateError);

    // The slice keeps the last error after the dialog closes, so the form shows only an update it saw finish.
    const [finishedUpdateError, setFinishedUpdateError] = useState<string>();
    const keepFinishedUpdateError = useCallback(
        () => setFinishedUpdateError(updateSucceeded ? undefined : updateError),
        [updateSucceeded, updateError],
    );
    useRunOnFinish(isUpdatingPlatform, keepFinishedUpdateError);

    const isBusy = useMemo(() => isFetchingPlatform || isUpdatingPlatform, [isFetchingPlatform, isUpdatingPlatform]);

    return (
        <Widget noBorder busy={isBusy}>
            {/* The open dialog hides the page's toasts from screen readers, so it announces the failure itself. */}
            {finishedUpdateError && !isUpdatingPlatform && (
                <Callout severity="danger" role="alert" className="mb-4" dataTestId="platform-settings-update-error">
                    {finishedUpdateError}
                </Callout>
            )}
            <TabLayout
                noBorder
                tabs={[
                    {
                        title: 'Utils',
                        content: <UtilsSettingsForm onCancel={onCancel} onSuccess={onSuccess} />,
                    },
                    {
                        title: 'Certificates',
                        content: <CertificateSettingsForm onCancel={onCancel} onSuccess={onSuccess} />,
                    },
                    {
                        title: 'Signing',
                        content: <SigningSettingsForm onCancel={onCancel} onSuccess={onSuccess} />,
                    },
                ]}
            />
        </Widget>
    );
}
