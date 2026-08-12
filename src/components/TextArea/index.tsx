import cn from 'classnames';
import Label from 'components/Label';

type Props = {
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
    /** Id of an element describing the field (typically an error paragraph) — announced by screen readers. */
    ariaDescribedBy?: string;
};

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
    ariaDescribedBy,
}: Readonly<Props>) {
    return (
        <>
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            <textarea
                className={cn(
                    'py-2.5 sm:py-3 px-4 block w-full border-outline rounded-lg text-sm text-content focus:border-brand focus:ring-brand disabled:opacity-50 disabled:pointer-events-none bg-surface-raised placeholder-content-subtle',
                    {
                        'border-danger focus:border-danger focus:ring-danger': invalid,
                    },
                    {
                        'bg-surface': disabled,
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
                aria-invalid={invalid || undefined}
                aria-describedby={ariaDescribedBy}
            />
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </>
    );
}

export default TextArea;
