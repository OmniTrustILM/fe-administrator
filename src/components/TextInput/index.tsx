import cn from 'classnames';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Label from 'components/Label';
import DatePicker from 'components/DatePicker';
import TextArea from 'components/TextArea';
import { inputBaseClassName } from './inputStyles';

export { inputBaseClassName } from './inputStyles';

type Props = {
    value?: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    type?: 'text' | 'textarea' | 'number' | 'email' | 'password' | 'date' | 'time' | 'datetime-local';
    invalid?: boolean;
    error?: string;
    label?: string;
    className?: string;
    required?: boolean;
    buttonRight?: ReactNode;
    dataTestId?: string;
};

function TextInput({
    value,
    onChange,
    onBlur,
    placeholder,
    disabled,
    id,
    type = 'text',
    invalid = false,
    error,
    label,
    className,
    required = false,
    buttonRight,
    dataTestId,
}: Readonly<Props>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const generatedId = useId();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const passwordToggleTargetId = type === 'password' ? id || `text-input-password-${generatedId.replaceAll(':', '')}` : null;

    // Disable autofill by making the field readOnly on mount, then removing it on focus
    useEffect(() => {
        if (inputRef.current && type !== 'password' && type !== 'date') {
            inputRef.current.setAttribute('readonly', 'readonly');
            const handleFocus = () => {
                if (inputRef.current) {
                    inputRef.current.removeAttribute('readonly');
                }
            };
            const input = inputRef.current;
            input.addEventListener('focus', handleFocus);
            return () => {
                input.removeEventListener('focus', handleFocus);
            };
        }
    }, [type]);

    const getAutoComplete = () => {
        if (type === 'password') {
            return 'new-password';
        }
        return 'off';
    };

    if (type === 'date') {
        return (
            <>
                {label && (
                    <Label htmlFor={id} required={required}>
                        {label}
                    </Label>
                )}
                <DatePicker
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    id={id}
                    invalid={invalid}
                    error={error}
                    className={className}
                    required={required}
                />
            </>
        );
    }

    if (type === 'textarea') {
        return (
            <>
                {label && (
                    <Label htmlFor={id} required={required}>
                        {label}
                    </Label>
                )}
                <TextArea
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    id={id}
                    invalid={invalid}
                    error={error}
                    className={className}
                    required={required}
                />
            </>
        );
    }

    const resolveType = () => {
        if (type !== 'password') return type;
        return passwordVisible ? 'text' : 'password';
    };
    const resolvedType = resolveType();

    return (
        <>
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            <div className="relative w-full">
                <input
                    ref={inputRef}
                    type={resolvedType}
                    className={cn(
                        inputBaseClassName,
                        {
                            'border-red-500 focus:border-red-500 focus:ring-red-500': invalid,
                        },
                        {
                            'bg-[#F8FAFC]': disabled,
                            'pr-10': !!buttonRight || type === 'password',
                        },
                        className,
                    )}
                    placeholder={placeholder}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    disabled={disabled}
                    id={passwordToggleTargetId ?? id}
                    autoComplete={getAutoComplete()}
                    data-form-type="other"
                    data-testid={dataTestId ?? (id ? `text-input-${id}` : 'text-input')}
                />
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setPasswordVisible((v) => !v)}
                        className="absolute inset-y-0 end-0 flex items-center z-10 p-3.5 text-gray-400 hover:text-gray-600 focus:outline-none disabled:pointer-events-none"
                        aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                    >
                        {passwordVisible ? (
                            <Eye className="size-4 shrink-0" aria-hidden />
                        ) : (
                            <EyeOff className="size-4 shrink-0" aria-hidden />
                        )}
                    </button>
                )}
                {buttonRight && (
                    <div className="absolute right-0 top-[50%] translate-y-[-50%] h-full flex items-center justify-center w-[40px] border-l border-gray-200">
                        {buttonRight}
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </>
    );
}

export default TextInput;
