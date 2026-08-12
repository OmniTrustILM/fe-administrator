import cn from 'classnames';
import Label from 'components/Label';

type Props = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    placeholder?: string;
    id?: string;
    label?: string;
    disabled?: boolean;
    dataTestId?: string;
};

function Checkbox({ checked, onChange, id, label, disabled = false, dataTestId }: Readonly<Props>) {
    return (
        <div className="flex items-center h-5" data-testid={dataTestId ? `${dataTestId}-wrapper` : undefined}>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                data-testid={dataTestId ?? 'checkbox'}
                className="border-outline rounded-sm bg-surface-raised text-brand-solid focus:ring-brand"
                disabled={disabled}
            />
            <Label htmlFor={id} className={cn('ml-2 !mb-0', { 'sr-only': !label, 'cursor-pointer': !disabled, 'opacity-60': disabled })}>
                {label || 'Checkbox'}
            </Label>
        </div>
    );
}

export default Checkbox;
