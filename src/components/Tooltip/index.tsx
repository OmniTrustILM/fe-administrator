import cn from 'classnames';
import { type ReactNode, useEffect } from 'react';

// export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TooltipPlacement = 'bottom';

type Props = Readonly<{
    content: string | ReactNode;
    placement?: TooltipPlacement;
    children: ReactNode;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    disabled?: boolean;
}>;

function Tooltip({ content, placement = 'bottom', children, className, triggerClassName, contentClassName, disabled = false }: Props) {
    useEffect(() => {
        (window as any).HSTooltip?.autoInit();
    }, []);

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
        <div className={cn('hs-tooltip [--placement:bottom] inline-block', disabled && 'pointer-events-none')}>
            {children}
            <span
                className={cn(
                    'hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-[var(--tooltip-background-color)] text-xs font-medium text-white rounded-md shadow-2xs dark:bg-neutral-700 border-[var(--tooltip-background-color)]',
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
