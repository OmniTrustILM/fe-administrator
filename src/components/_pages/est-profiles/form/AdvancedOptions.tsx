import Button from 'components/Button';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
    defaultResponseTimingValues,
    type EstProfileFormErrors,
    type EstProfileFormValues,
    RESPONSE_TIMING_FIELDS,
    type ResponseTimingField,
    responseTimingSummary,
} from 'utils/est-profile';

type Props = Readonly<{
    errors: EstProfileFormErrors;
    serverKeyGeneration: boolean;
    initiallyExpanded: boolean;
}>;

type TimingInputProps = Readonly<{
    name: ResponseTimingField;
    label: string;
    help: string;
    error?: string;
}>;

function TimingInput({ name, label, help, error }: TimingInputProps) {
    const { control } = useFormContext<EstProfileFormValues>();
    return (
        <div className="space-y-1">
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <TextInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        id={name}
                        type="text"
                        inputMode="numeric"
                        label={label}
                        required
                        invalid={!!error}
                        error={error}
                        buttonRight={<span className="text-sm text-content-subtle">s</span>}
                    />
                )}
            />
            <p className="text-sm text-content-subtle">{help}</p>
        </div>
    );
}

export default function AdvancedOptions({ errors, serverKeyGeneration, initiallyExpanded }: Props) {
    const { control, setValue } = useFormContext<EstProfileFormValues>();
    const [issueWaitTimeout, retryAfter, serverKeyGenerationTimeout] = useWatch({ control, name: [...RESPONSE_TIMING_FIELDS] });
    const [expanded, setExpanded] = useState(initiallyExpanded);
    const hasTimingError = RESPONSE_TIMING_FIELDS.some((field) => !!errors[field]);

    useEffect(() => {
        if (hasTimingError) setExpanded(true);
    }, [hasTimingError]);

    const restoreDefaults = () => {
        for (const [field, value] of Object.entries(defaultResponseTimingValues())) {
            setValue(field as ResponseTimingField, value, { shouldDirty: true, shouldValidate: true });
        }
    };

    const toggle = (
        <Button
            variant="transparent"
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="est-advanced-options"
            aria-label={expanded ? 'Hide advanced options' : 'Show advanced options'}
            data-testid="advanced-options-toggle"
        >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
    );

    return (
        <Widget title="Advanced Options" noBorder widgetExtraTopNode={toggle} dataTestId="advanced-options">
            {expanded ? (
                <div id="est-advanced-options" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h6 className="text-sm font-semibold">Response Timing</h6>
                        <button
                            type="button"
                            className="text-sm text-brand hover:text-brand-hover hover:underline"
                            onClick={restoreDefaults}
                        >
                            Restore defaults
                        </button>
                    </div>
                    <TimingInput
                        name="issueWaitTimeout"
                        label="Issue wait"
                        help="How long enroll and reenroll wait for the certificate before answering 202; 0 answers at once."
                        error={errors.issueWaitTimeout}
                    />
                    <TimingInput
                        name="retryAfter"
                        label="Retry-After"
                        help="Seconds a client is told to wait after a 202; raise it for CAs that issue slowly."
                        error={errors.retryAfter}
                    />
                    {/* An invalid value stays visible, as it would otherwise block the form unseen. */}
                    {(serverKeyGeneration || !!errors.serverKeyGenerationTimeout) && (
                        <TimingInput
                            name="serverKeyGenerationTimeout"
                            label="Key generation wait"
                            help="How long server key generation waits for the certificate."
                            error={errors.serverKeyGenerationTimeout}
                        />
                    )}
                    <p className="text-sm text-content-subtle">
                        Waits hold the HTTP request open, so keep them below the timeout of the gateway in front of the platform (60 s by
                        default).
                    </p>
                </div>
            ) : (
                <p className="text-sm text-content-subtle" data-testid="response-timing-summary">
                    {responseTimingSummary({ issueWaitTimeout, retryAfter, serverKeyGenerationTimeout })}
                </p>
            )}
        </Widget>
    );
}
