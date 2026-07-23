import RadioRow from 'components/RadioRow';
import { externalCsrValidationModeDescription, externalCsrValidationModeLabel } from 'utils/raProfileValidation';

type Props = Readonly<{
    strict: boolean;
    onChange: (strict: boolean) => void;
    disabled?: boolean;
}>;

export default function ExternalCsrValidationRadio({ strict, onChange, disabled }: Props) {
    return (
        <>
            <RadioRow checked={strict} onSelect={() => onChange(true)} disabled={disabled}>
                <span className="font-medium text-[var(--dark-gray-color)] dark:text-white" data-testid="request-validation-strict">
                    {externalCsrValidationModeLabel(true)}
                </span>
                <span className="text-gray-500 dark:text-neutral-400">{externalCsrValidationModeDescription(true)}</span>
            </RadioRow>
            <RadioRow checked={!strict} onSelect={() => onChange(false)} disabled={disabled}>
                <span className="font-medium text-[var(--dark-gray-color)] dark:text-white" data-testid="request-validation-lenient">
                    {externalCsrValidationModeLabel(false)}
                </span>
                <span className="text-gray-500 dark:text-neutral-400">{externalCsrValidationModeDescription(false)}</span>
            </RadioRow>
        </>
    );
}
