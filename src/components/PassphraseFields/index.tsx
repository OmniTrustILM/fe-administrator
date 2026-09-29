import { Controller, useFormContext } from 'react-hook-form';
import TextInput from 'components/TextInput';
import { passphraseProblem } from 'utils/passphrase';

export type PassphraseFormValues = { passphrase: string; passphraseConfirmation: string };

export default function PassphraseFields() {
    const { control, getValues } = useFormContext<PassphraseFormValues>();
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
                name="passphrase"
                control={control}
                // react-hook-form reads deps off the field that changed, so this is what re-checks the confirmation
                // as the password is typed; deps on the confirmation field itself would only re-check on its own change.
                rules={{ deps: ['passphraseConfirmation'], validate: (value) => passphraseProblem(value ?? '') ?? true }}
                render={({ field, fieldState }) => (
                    <div>
                        <TextInput
                            id="passphrase"
                            type="password"
                            label="Password"
                            required
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={!!fieldState.error}
                            error={fieldState.error?.message}
                        />
                    </div>
                )}
            />
            <Controller
                name="passphraseConfirmation"
                control={control}
                rules={{ validate: (value) => value === getValues('passphrase') || 'The passwords do not match' }}
                render={({ field, fieldState }) => (
                    <div>
                        <TextInput
                            id="passphraseConfirmation"
                            type="password"
                            label="Confirm password"
                            required
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            invalid={!!fieldState.error}
                            error={fieldState.error?.message}
                        />
                    </div>
                )}
            />
        </div>
    );
}
