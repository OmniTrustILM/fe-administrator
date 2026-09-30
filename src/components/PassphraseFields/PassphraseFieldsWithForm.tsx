import { FormProvider, useForm } from 'react-hook-form';

import PassphraseFields, { type PassphraseFormValues } from './index';

export type PassphraseFieldsWithFormProps = Readonly<{
    onSubmit: (values: PassphraseFormValues) => void;
}>;

/**
 * `PassphraseFields` only reads react-hook-form context, so Playwright CT needs a real `useForm` + `FormProvider`
 * around it, the same shape every real dialog gives it, plus a submit button to drive validation.
 *
 * `onChange` mode is what lets the password field's `deps` re-check the confirmation as it is typed, rather than
 * only once at submit.
 */
export function PassphraseFieldsWithForm({ onSubmit }: PassphraseFieldsWithFormProps) {
    const methods = useForm<PassphraseFormValues>({
        defaultValues: { passphrase: '', passphraseConfirmation: '' },
        mode: 'onChange',
    });

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
                <PassphraseFields />
                <button type="submit">Submit</button>
            </form>
        </FormProvider>
    );
}

export default PassphraseFieldsWithForm;
