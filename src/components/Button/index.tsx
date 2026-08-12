import cn from 'classnames';
import Tooltip from 'components/Tooltip';

export type ButtonVariant = 'solid' | 'outline' | 'transparent';

export type ButtonColor = 'primary' | 'danger' | 'secondary' | 'warning' | 'lightGray';
export type Props = {
    variant?: ButtonVariant;
    color?: ButtonColor;
    onClick?: (event: React.MouseEvent) => void;
    id?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    className?: string;
    title?: string;
    disabledTooltip?: string;
    type?: 'submit' | 'reset' | 'button';
    'data-testid'?: string;
    'aria-label'?: string;
};

const baseButton =
    'inline-flex items-center gap-x-2 text-sm font-medium rounded-lg disabled:opacity-35 disabled:pointer-events-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 border';

const buttonClasses = {
    solid: 'py-2.5 px-3.5',
    outline: 'py-2.5 px-3.5',
    transparent: 'p-2 border-transparent text-content',
};

const colorClasses = {
    solid: {
        primary: 'bg-brand-solid text-content-on-brand hover:bg-brand-solid-hover focus:bg-brand-solid-hover border-brand',
        danger: 'bg-danger-fill text-content-on-brand hover:bg-danger-fill-hover focus:bg-danger-fill-hover',
        secondary: 'bg-surface-inverse text-content-inverse hover:opacity-90 focus:opacity-90',
        warning: 'bg-warning-fill text-content-on-brand hover:bg-warning-fill-hover focus:bg-warning-fill-hover',
        lightGray: 'bg-surface-sunken text-content hover:bg-surface-hover focus:bg-surface-hover',
    },
    outline: {
        primary: 'border-brand text-brand hover:border-brand-hover hover:text-brand-hover focus:border-brand-hover focus:text-brand-hover',
        danger: 'border-danger text-danger hover:bg-danger-surface focus:bg-danger-surface',
        secondary: 'border-outline text-content hover:bg-surface-hover focus:bg-surface-hover',
        warning: 'border-warning text-warning hover:bg-warning-surface focus:bg-warning-surface',
        lightGray: 'border-transparent bg-surface-sunken text-content hover:bg-surface-hover focus:bg-surface-hover',
    },
    transparent: {
        primary: 'hover:bg-surface-hover',
        danger: 'text-danger hover:bg-danger-surface focus:bg-danger-surface',
        secondary: 'hover:bg-surface-hover focus:bg-surface-hover',
        warning: 'text-warning hover:bg-warning-surface focus:bg-warning-surface',
        lightGray: 'bg-surface-sunken text-content hover:bg-surface-hover focus:bg-surface-hover',
    },
};

function Button({
    children,
    onClick,
    className,
    id,
    variant = 'solid',
    disabled = false,
    color = 'primary',
    title,
    disabledTooltip,
    type = 'button',
    'data-testid': dataTestId,
    'aria-label': ariaLabel,
}: Readonly<Props>) {
    const buttonElement = (
        <button
            type={type}
            id={id}
            className={cn(baseButton, buttonClasses[variant], colorClasses[variant][color], className)}
            onClick={onClick}
            disabled={disabled}
            data-testid={dataTestId}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    );

    const tooltipContent = disabled && disabledTooltip ? disabledTooltip : title;
    if (tooltipContent) {
        return <Tooltip content={tooltipContent}>{buttonElement}</Tooltip>;
    }

    return buttonElement;
}

export default Button;
