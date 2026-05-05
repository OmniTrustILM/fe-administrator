import cn from 'classnames';
import Label from 'components/Label';

type Props = Readonly<{
    value?: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    invalid?: boolean;
    error?: string;
    label?: string;
    className?: string;
    required?: boolean;
    rows?: number;
}>;

function TextArea({
    value,
    onChange,
    onBlur,
    placeholder,
    disabled,
    id,
    invalid = false,
    error,
    label,
    className,
    required = false,
    rows = 3,
}: Props) {
    return (
        <>
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            <textarea
                className={cn(
                    'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm text-[var(--dark-gray-color)] focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
                    {
                        'border-red-500 focus:border-red-500 focus:ring-red-500': invalid,
                    },
                    {
                        'bg-[#F8FAFC]': disabled,
                    },
                    className,
                )}
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled}
                id={id}
                rows={rows}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </>
    );
}

export default TextArea;
