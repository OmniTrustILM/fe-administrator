import { Controller, useFormContext, useWatch } from 'react-hook-form';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import {
    RENEWAL_INFO_RETRY_AFTER_MAX,
    RENEWAL_INFO_RETRY_AFTER_MIN,
    renewalInfoRetryAfterRules,
    type AcmeRenewalInfoFormValues,
} from 'utils/acme-renewal-info';
import { getFieldErrorMessage } from 'utils/validators-helper';

type Props = Readonly<{
    disabled?: boolean;
}>;

export default function AcmeRenewalInfoFields({ disabled = false }: Props) {
    const { control } = useFormContext<AcmeRenewalInfoFormValues>();
    const enabled = useWatch({ control, name: 'renewalInfoEnabled' });

    return (
        <div className="space-y-4">
            <Controller
                name="renewalInfoEnabled"
                control={control}
                render={({ field }) => (
                    <Switch
                        id="renewalInfoEnabled"
                        checked={field.value}
                        onChange={field.onChange}
                        disabled={disabled}
                        label="Enable renewal information"
                    />
                )}
            />
            <Controller
                name="renewalInfoRetryAfter"
                control={control}
                rules={renewalInfoRetryAfterRules}
                render={({ field, fieldState }) => (
                    <TextInput
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        onBlur={field.onBlur}
                        id="renewalInfoRetryAfter"
                        type="number"
                        label="Renewal information retry-after (In seconds)"
                        disabled={disabled || !enabled}
                        invalid={fieldState.error && fieldState.isTouched}
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />
            <p className="text-sm text-content-subtle">
                How long clients wait before asking again, between {RENEWAL_INFO_RETRY_AFTER_MIN} and {RENEWAL_INFO_RETRY_AFTER_MAX}{' '}
                seconds.
            </p>
        </div>
    );
}
