import TextInput from 'components/TextInput';

import {
    type Control,
    type ControllerFieldState,
    Controller,
    type ErrorOption,
    type FieldPathByValue,
    type FieldValues,
} from 'react-hook-form';
import { composeValidators, validateMaximum, validateMinimum, validateWholeNumber } from 'utils/validators';
import { getFieldErrorMessage } from 'utils/validators-helper';
import { describeTunable, type IntegerTunable } from './tunables';

const CORE_REFUSAL = 'coreRefusal';

/** Core's refusal of a saved value, set on its field with `setError`. */
export const coreRefusal = (message: string): ErrorOption => ({ type: CORE_REFUSAL, message });

/** Core's refusal shows at once. A value saved with Enter reaches Core before its field is ever left. */
const shownFieldError = (fieldState: ControllerFieldState) =>
    fieldState.error?.type === CORE_REFUSAL ? fieldState.error.message : getFieldErrorMessage(fieldState);

type TunableFieldProps<T extends FieldValues> = Readonly<{
    control: Control<T>;
    tunable: IntegerTunable<FieldPathByValue<T, string | undefined>>;
}>;

const TunableField = <T extends FieldValues>({ control, tunable }: TunableFieldProps<T>) => (
    <Controller
        name={tunable.name}
        control={control}
        rules={{ validate: composeValidators(validateWholeNumber(), validateMinimum(tunable.min), validateMaximum(tunable.max)) }}
        render={({ field, fieldState }) => {
            const error = shownFieldError(fieldState);
            return (
                <div>
                    <TextInput
                        {...field}
                        id={tunable.name}
                        type="text"
                        inputMode="numeric"
                        label={`${tunable.label} (${tunable.unit})`}
                        placeholder={String(tunable.defaultValue)}
                        invalid={error !== undefined}
                        error={error}
                        ariaDescribedBy={`${tunable.name}-help`}
                    />
                    <p id={`${tunable.name}-help`} className="text-sm text-content-subtle mt-2">
                        {tunable.help} Clear to return to the platform default ({describeTunable(tunable, tunable.defaultValue)}).
                    </p>
                </div>
            );
        }}
    />
);

export default TunableField;
