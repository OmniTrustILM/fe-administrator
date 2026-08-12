import cn from 'classnames';

export type BadgeColor = 'gray' | 'secondary' | 'success' | 'primary' | 'danger' | 'warning' | 'info' | 'transparent';
export type BadgeFill = 'solid' | 'surface';

type Props = {
    color?: BadgeColor;
    /** 'surface' (default) is the tinted-background/plain-text treatment, and the only one safe for a badge
     *  that carries text: the `-solid` status fills are tuned as vivid indicator colours, so white on them
     *  falls as low as 1.92:1 (dark warning). 'solid' is that vivid fill, and is reserved for icon-only
     *  indicators such as StatusCircle, where WCAG's 3:1 non-text threshold applies instead of 4.5:1.
     *  Only the four status colours have both treatments; the rest render the same either way. */
    fill?: BadgeFill;
    onClick?: () => void;
    onRemove?: () => void;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    title?: string;
    size?: 'small' | 'medium' | 'large';
    dataTestId?: string;
    id?: string;
};

function Badge({
    color = 'secondary',
    fill = 'surface',
    onClick,
    onRemove,
    children,
    style,
    className,
    title,
    size = 'small',
    dataTestId,
    id,
}: Readonly<Props>) {
    const colorClasses = {
        gray: 'bg-surface-inverse text-content-inverse',
        // Inset ring rather than a border: surface-sunken is only ~1.1:1 against the surface-raised
        // cards and table bodies badges sit on, so without a boundary the chrome disappears and
        // status badges render as bare text. outline is the token guaranteed at 3:1 against
        // surface-raised in both themes (see theme-tokens.spec.ts), and an inset ring draws inside
        // the element, so no badge changes size.
        secondary: 'bg-surface-sunken text-content inset-ring-1 inset-ring-outline',
        success: fill === 'solid' ? 'bg-success-solid text-content-on-brand' : 'bg-success-surface text-success',
        primary: 'bg-brand-solid text-content-on-brand',
        danger: fill === 'solid' ? 'bg-danger-solid text-content-on-brand' : 'bg-danger-surface text-danger',
        warning: fill === 'solid' ? 'bg-warning-solid text-content-on-brand' : 'bg-warning-surface text-warning',
        info: fill === 'solid' ? 'bg-info-solid text-content-on-brand' : 'bg-info-surface text-info',
        transparent: 'bg-surface-raised text-content-muted',
    };
    const handleKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    const sharedClassName = cn(
        'table-badge inline-flex items-center justify-center gap-x-1.5 rounded-md font-medium min-w-[24px]',
        colorClasses[color],
        {
            'cursor-pointer': !!onClick,
            'text-xs py-0.5 px-1.5': size === 'small',
            'text-xs py-1.5 px-2.5': size === 'medium',
            'text-sm py-2 px-3': size === 'large',
        },
        className,
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                onKeyDown={handleKeyDown}
                data-testid={dataTestId || 'badge'}
                className={sharedClassName}
                style={style}
                title={title}
                id={id}
            >
                {children}
                {onRemove && (
                    <button
                        type="button"
                        className="shrink-0 size-4 inline-flex items-center justify-center rounded-full hover:bg-surface-hover focus:outline-hidden focus:bg-surface-hover focus:text-content-subtle"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <span className="sr-only">Remove badge</span>
                        <svg
                            className="shrink-0 size-3"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                    </button>
                )}
            </button>
        );
    }

    return (
        <span data-testid={dataTestId || 'badge'} className={sharedClassName} style={style} title={title} id={id}>
            {children}
            {onRemove && (
                <button
                    type="button"
                    className="shrink-0 size-4 inline-flex items-center justify-center rounded-full hover:bg-surface-hover focus:outline-hidden focus:bg-surface-hover focus:text-content-subtle"
                    onClick={onRemove}
                >
                    <span className="sr-only">Remove badge</span>
                    <svg
                        className="shrink-0 size-3"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            )}
        </span>
    );
}

export default Badge;
