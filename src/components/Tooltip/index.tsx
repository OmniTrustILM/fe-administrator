import * as RadixTooltip from '@radix-ui/react-tooltip';
import cn from 'classnames';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

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
    if (disabled) {
        return (
            <span className={cn('relative inline-block pointer-events-none', className)}>
                <span className={cn(triggerClassName)}>{children}</span>
            </span>
        );
    }
    const triggerChild = isValidElement(children) ? (
        cloneElement(children as ReactElement<{ className?: string }>, {
            className: cn((children.props as { className?: string }).className, triggerClassName),
        })
    ) : (
        <span className={cn(triggerClassName)}>{children}</span>
    );

    return (
        <RadixTooltip.Provider delayDuration={400}>
            <RadixTooltip.Root>
                <span className={cn('relative inline-block', className)}>
                    <RadixTooltip.Trigger asChild>{triggerChild}</RadixTooltip.Trigger>
                    <RadixTooltip.Portal>
                        <RadixTooltip.Content
                            side={placement}
                            sideOffset={8}
                            className={cn(
                                'z-10 py-1 px-2 bg-[var(--tooltip-background-color)] text-xs font-medium text-white rounded-md shadow-2xs dark:bg-neutral-700 whitespace-nowrap',
                                contentClassName,
                            )}
                        >
                            {content}
                            <RadixTooltip.Arrow className="fill-[var(--tooltip-background-color)] dark:fill-neutral-700" />
                        </RadixTooltip.Content>
                    </RadixTooltip.Portal>
                </span>
            </RadixTooltip.Root>
        </RadixTooltip.Provider>
    );
}

export default Tooltip;
