import cn from 'classnames';
import type { ReactNode } from 'react';

export type TooltipPlacement = 'bottom';

type Props = {
    content: string | ReactNode;
    placement?: TooltipPlacement;
    children: ReactNode;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    disabled?: boolean;
};

function Tooltip({
    content,
    placement = 'bottom',
    children,
    className,
    triggerClassName,
    contentClassName,
    disabled = false,
}: Readonly<Props>) {
    const getArrowClasses = () => {
        const baseClasses = 'absolute w-0 h-0 border-4';
        if (placement === 'bottom') {
            return cn(
                baseClasses,
                'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
                'border-b-[var(--tooltip-background-color)] border-r-transparent border-t-transparent border-l-transparent',
                'dark:border-b-neutral-700',
            );
        } else {
            return '';
        }
    };

    return (
        <div className={cn('group relative inline-block', disabled && 'pointer-events-none', className)}>
            <span className={cn(triggerClassName)}>{children}</span>
            <span
                className={cn(
                    'absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 py-1 px-2 bg-[var(--tooltip-background-color)] text-xs font-medium text-white rounded-md shadow-2xs dark:bg-neutral-700 whitespace-nowrap pointer-events-none',
                    'opacity-0 transition-opacity delay-0 group-hover:opacity-100 group-hover:delay-[400ms] group-focus-within:opacity-100 group-focus-within:delay-[400ms]',
                    contentClassName,
                )}
                role="tooltip"
            >
                {content}
                <span className={getArrowClasses()} aria-hidden="true" />
            </span>
        </div>
    );
}

export default Tooltip;
