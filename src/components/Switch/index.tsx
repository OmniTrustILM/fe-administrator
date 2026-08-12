import cn from 'classnames';
import { X, Check } from 'lucide-react';
import Label from 'components/Label';

type Props = {
    checked: boolean | undefined;
    onChange: (checked: boolean) => void;
    placeholder?: string;
    id: string;
    label?: string;
    secondaryLabel?: string;
    disabled?: boolean;
    className?: string;
    labelClassName?: string;
    dataTestId?: string;
    /** Id of an element describing the control (typically an error paragraph) — announced by screen readers. */
    ariaDescribedBy?: string;
    ariaInvalid?: boolean;
};

function Switch({
    checked,
    onChange,
    id,
    label,
    secondaryLabel,
    disabled = false,
    className,
    labelClassName,
    dataTestId,
    ariaDescribedBy,
    ariaInvalid,
}: Readonly<Props>) {
    return (
        <div className={cn('flex items-center gap-x-3', className)} data-testid={dataTestId ?? `switch-${id}`}>
            {label && (
                <Label htmlFor={id} className={cn('text-sm !mb-0', labelClassName)}>
                    {label}
                </Label>
            )}
            <div className="flex items-center">
                <Label
                    htmlFor={id}
                    className={cn(
                        'relative inline-block w-13 h-7 !block !text-base !font-medium !mb-0 !text-left',
                        disabled ? 'cursor-default' : 'cursor-pointer',
                    )}
                >
                    <input
                        type="checkbox"
                        id={id}
                        className="peer sr-only"
                        checked={checked}
                        onChange={(e) => {
                            if (disabled) return;
                            onChange(e.target.checked);
                        }}
                        disabled={disabled}
                        aria-invalid={ariaInvalid || undefined}
                        aria-describedby={ariaDescribedBy}
                        data-testid={dataTestId ? `${dataTestId}-input` : `switch-${id}-input`}
                    />
                    <span className="absolute inset-0 bg-surface-active rounded-full transition-colors duration-200 ease-in-out peer-checked:bg-brand-solid peer-disabled:opacity-50 peer-disabled:pointer-events-none"></span>
                    <span className="absolute top-1/2 start-0.5 -translate-y-1/2 size-6 bg-content-inverse rounded-full shadow-xs transition-transform duration-200 ease-in-out peer-checked:translate-x-full"></span>
                    <span className="absolute top-1/2 start-1 -translate-y-1/2 flex justify-center items-center size-5 text-content-subtle peer-checked:text-content-on-brand transition-colors duration-200">
                        <X size={12} strokeWidth={2.5} />
                    </span>
                    <span className="absolute top-1/2 end-1 -translate-y-1/2 flex justify-center items-center size-5 text-content-subtle peer-checked:text-brand-solid transition-colors duration-200">
                        <Check size={12} strokeWidth={2.5} />
                    </span>
                </Label>
            </div>
            {secondaryLabel && (
                <Label htmlFor={id} className="text-sm !mb-0">
                    {secondaryLabel}
                </Label>
            )}
        </div>
    );
}

export default Switch;
