import type { ReactElement } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import { SigningRecordPersistenceMode } from 'types/openapi';
import { getFieldErrorMessage } from 'utils/validators-helper';
import { recordsSignatureAndDtbs, recordsSignedDocument, type SigningProfileFormValues } from './signingProfileFormValues';

// The generated enum carries neither labels nor descriptions, and Core does not publish it as a platform enum.
const persistenceModes: Record<SigningRecordPersistenceMode, { label: string; description: string }> = {
    [SigningRecordPersistenceMode.Immediate]: {
        label: 'Immediate',
        description: 'Persisted synchronously before responding — highest durability, highest latency.',
    },
    [SigningRecordPersistenceMode.DeferredDurable]: {
        label: 'Deferred Durable',
        description: 'Persisted durably but asynchronously — balanced latency and durability.',
    },
    [SigningRecordPersistenceMode.BestEffort]: {
        label: 'Best Effort',
        description: 'Persistence attempted without guarantees — lowest latency, may be lost.',
    },
};

const persistenceModeOptions = Object.values(SigningRecordPersistenceMode).map((mode) => ({
    value: mode,
    label: persistenceModes[mode].label,
}));

const validateRetentionDays = (value: string) => {
    const days = Number(value);
    return (value && Number.isInteger(days) && days >= 1) || 'Retention must be a whole number of at least 1 day';
};

type ToggleName = 'recordRequestMetadata' | 'recordSignature' | 'recordSignedDocument' | 'recordDtbs' | 'retentionIndefinite';

/** What each signing operation records, how long the record is retained and how durably it is persisted. */
export default function RecordPolicyFields(): ReactElement {
    const { control } = useFormContext<SigningProfileFormValues>();
    const workflowType = useWatch({ control, name: 'workflowType' });
    const recordingEnabled = useWatch({ control, name: 'recordingEnabled' });
    const retentionIndefinite = useWatch({ control, name: 'retentionIndefinite' });
    const persistenceMode = useWatch({ control, name: 'persistenceMode' });
    const signatureAndDtbs = recordsSignatureAndDtbs(workflowType);
    const signedDocument = recordsSignedDocument(workflowType);
    const sectionClassName = recordingEnabled ? '' : 'opacity-60';

    const recordingToggle = (name: ToggleName, label: string, allowed = true) => (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <Switch
                    id={name}
                    checked={field.value && allowed}
                    onChange={field.onChange}
                    disabled={!recordingEnabled || !allowed}
                    secondaryLabel={label}
                />
            )}
        />
    );

    return (
        <div className="space-y-4">
            <p className="text-sm text-content-muted">
                Configure what is captured for each signing operation, how long it is retained, and how durably it is persisted.
            </p>

            <div className="flex items-center mt-2">
                <Controller
                    name="recordingEnabled"
                    control={control}
                    render={({ field }) => (
                        <Switch id="recordingEnabled" checked={field.value} onChange={field.onChange} secondaryLabel="Recording Enabled" />
                    )}
                />
            </div>
            {!recordingEnabled && (
                <p className="text-xs text-content-subtle">No Signing Record is created for this profile while recording is disabled.</p>
            )}

            <div className={sectionClassName}>
                <p className="block text-sm font-medium text-content-muted mb-2">Captured Content</p>
                <div className="space-y-3">
                    {recordingToggle('recordRequestMetadata', 'Request metadata (algorithm, policy IDs, claimed signer)')}
                    {signatureAndDtbs && recordingToggle('recordSignature', 'Raw signature value')}
                    <div>
                        {recordingToggle('recordSignedDocument', 'Assembled signed document', signedDocument)}
                        {!signedDocument && (
                            <p className="ml-16 mt-1 text-xs text-content-subtle">
                                Only available for the Content Signing and Timestamping workflows.
                            </p>
                        )}
                    </div>
                    {signatureAndDtbs && recordingToggle('recordDtbs', 'Data-to-be-signed bytes')}
                </div>
            </div>

            <div className={sectionClassName}>
                <p className="block text-sm font-medium text-content-muted mb-2">Retention</p>
                {recordingToggle('retentionIndefinite', 'Retain indefinitely')}
                {recordingEnabled && !retentionIndefinite && (
                    <div className="mt-3">
                        <Controller
                            name="retentionDays"
                            control={control}
                            rules={{ required: 'Retention period is required', validate: validateRetentionDays }}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    {...field}
                                    id="retentionDays"
                                    type="number"
                                    label="Retention (days)"
                                    required
                                    placeholder="e.g. 365"
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                    </div>
                )}
            </div>

            <div className={sectionClassName}>
                <Controller
                    name="persistenceMode"
                    control={control}
                    render={({ field }) => (
                        <Select
                            id="persistenceMode"
                            label="Persistence Mode"
                            value={field.value}
                            onChange={field.onChange}
                            options={persistenceModeOptions}
                            isDisabled={!recordingEnabled}
                            isClearable={false}
                            placement="bottom"
                        />
                    )}
                />
                {persistenceMode && <p className="mt-1 text-xs text-content-subtle">{persistenceModes[persistenceMode].description}</p>}
            </div>
        </div>
    );
}
