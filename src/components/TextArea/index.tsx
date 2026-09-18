import cn from 'classnames';
import { useId } from 'react';
import { joinAriaIds } from 'utils/aria';
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
    /** Id of the error paragraph; derived from `id` when not given. It is named in `aria-describedby` while an error shows. */
    errorId?: string;
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
    errorId,
}: Readonly<Props>) {
    const generatedId = useId();
    const resolvedErrorId = errorId ?? `${id ?? `textarea-${generatedId.replaceAll(':', '')}`}-error`;
    return (
        <>
            {label && (
                <Label htmlFor={id} required={required}>
                    {label}
                </Label>
            )}
            <textarea
                className={cn(
                    'py-2.5 sm:py-3 px-4 block w-full border-outline rounded-lg text-sm text-content focus:border-brand focus:ring-brand disabled:opacity-50 disabled:pointer-events-none bg-surface-raised placeholder-content-hint',
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
                aria-describedby={joinAriaIds(ariaDescribedBy, error ? resolvedErrorId : undefined)}
            />
            {error && (
                <p id={resolvedErrorId} className="mt-1 text-sm text-danger">
                    {error}
                </p>
            )}
        </>
    );
}

export default TextArea;
