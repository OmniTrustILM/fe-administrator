import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { getInputStringFromIso8601String, getIso8601StringFromInputString } from 'utils/duration';
import cn from 'classnames';
import { inputBaseClassName } from 'components/TextInput/inputStyles';

interface Props {
    id?: string;
    label?: string;
    value?: string; // ISO 8601 duration string, e.g. "PT1H30M"
    onChange: (value: string) => void;
    onBlur?: () => void;
    required?: boolean;
    invalid?: boolean;
    error?: string;
    disabled?: boolean;
    placeholder?: string;
}

/**
 * A text input that displays durations in human-readable format (e.g. "1d 2h 30m 45s")
 * and converts to/from ISO 8601 duration strings (e.g. "P1DT2H30M45S") on blur.
 */
const DurationInput = ({ id, label, value, onChange, onBlur, required, invalid, error, disabled, placeholder }: Props) => {
    const [inputValue, setInputValue] = useState<string>(() => (value ? getInputStringFromIso8601String(value) : ''));

    // Sync display value when the external value changes (e.g. on form reset)
    useEffect(() => {
        setInputValue(value ? getInputStringFromIso8601String(value) : '');
    }, [value]);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    const handleBlur = useCallback(() => {
        const iso = getIso8601StringFromInputString(inputValue);
        // Only emit a non-trivial value; treat "PT0S" (from empty/invalid input) as empty
        const isEmpty = inputValue.trim() === '' || iso === 'PT0S';
        const parsed = isEmpty ? '' : iso;
        onChange(parsed);
        // Re-format the display value to canonical form
        setInputValue(parsed ? getInputStringFromIso8601String(parsed) : '');
        onBlur?.();
    }, [inputValue, onChange, onBlur]);

    return (
        <div className="flex flex-col gap-1">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                id={id}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                placeholder={placeholder ?? 'e.g. 1d 2h 30m 45s 500ms'}
                className={cn(
                    inputBaseClassName,
                    invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    disabled && 'bg-[#F8FAFC]',
                )}
            />
            {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
            <p className="text-xs text-gray-700">
                Format: days (d), hours (h), minutes (m), seconds (s), milliseconds (ms) — e.g. 1d 12h or 30m 15s 500ms
            </p>
        </div>
    );
};

export default DurationInput;
