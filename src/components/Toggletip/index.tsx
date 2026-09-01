import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';
import { Info, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
    content: ReactNode;
    ariaLabel?: string;
    /**
     * What the trigger button shows. Defaults to the info icon. A caller supplies this when the
     * affordance is part of the content itself — a `+N` overflow pill, for example — so the
     * trigger's hover, pinning and focus behaviour is not reimplemented alongside it.
     */
    triggerContent?: ReactNode;
    iconSize?: number;
    placement?: 'top' | 'bottom';
    triggerClassName?: string;
    contentClassName?: string;
    showClose?: boolean;
    dataTestId?: string;
};

const HOVER_OPEN_DELAY = 400;
const HOVER_CLOSE_DELAY = 150;

function Toggletip({
    content,
    ariaLabel = 'More information',
    triggerContent,
    iconSize = 16,
    placement = 'bottom',
    triggerClassName,
    contentClassName,
    showClose = true,
    dataTestId,
}: Readonly<Props>) {
    const [open, setOpen] = useState(false);
    const pinnedRef = useRef(false);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimers = useCallback(() => {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        openTimerRef.current = null;
        closeTimerRef.current = null;
    }, []);

    useEffect(() => () => clearTimers(), [clearTimers]);

    const handleOpenChange = useCallback(
        (next: boolean) => {
            clearTimers();
            pinnedRef.current = next;
            setOpen(next);
        },
        [clearTimers],
    );

    const hoverOpen = useCallback(() => {
        clearTimers();
        openTimerRef.current = setTimeout(() => setOpen(true), HOVER_OPEN_DELAY);
    }, [clearTimers]);

    const hoverClose = useCallback(() => {
        clearTimers();
        closeTimerRef.current = setTimeout(() => {
            if (!pinnedRef.current) setOpen(false);
        }, HOVER_CLOSE_DELAY);
    }, [clearTimers]);

    return (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    aria-label={ariaLabel}
                    className={cn(
                        'inline-flex items-center justify-center text-content-muted hover:text-content focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand rounded-full',
                        triggerClassName,
                    )}
                    data-testid={dataTestId ?? 'toggletip-trigger'}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (open && !pinnedRef.current) {
                            e.preventDefault();
                            pinnedRef.current = true;
                        }
                    }}
                    onMouseEnter={hoverOpen}
                    onMouseLeave={hoverClose}
                >
                    {triggerContent ?? <Info size={iconSize} className="block" aria-hidden />}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side={placement}
                    align="start"
                    sideOffset={8}
                    collisionPadding={8}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onMouseEnter={hoverOpen}
                    onMouseLeave={hoverClose}
                    className={cn(
                        'relative z-[100] flex max-h-[var(--radix-popover-content-available-height)] max-w-sm flex-col overflow-hidden rounded-lg border border-divider bg-surface-raised text-xs text-content shadow-lg',
                        contentClassName,
                    )}
                    data-testid={dataTestId ? `${dataTestId}-content` : 'toggletip-content'}
                >
                    <div
                        aria-live="polite"
                        className="min-h-0 overflow-y-auto break-words py-3 ps-3 pe-7 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-outline"
                    >
                        {content}
                    </div>
                    {showClose && (
                        <Popover.Close
                            aria-label="Close"
                            className="absolute top-2 end-2 inline-flex items-center justify-center rounded-full p-0.5 text-content-subtle hover:text-content-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            <X size={14} aria-hidden />
                        </Popover.Close>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

export default Toggletip;
