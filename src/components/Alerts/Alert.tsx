import cn from 'classnames';
import { type AnimationEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Check, ChevronDown, ChevronUp, CircleAlert, CircleCheck, Copy, Info, X } from 'lucide-react';

import { actions } from 'ducks/alerts';
import type { MessageModel } from 'types/alerts';

import { AUTO_DISMISS_MS, COPY_CONFIRMATION_MS, EXIT_ANIMATION_MS, PROGRESS_ANIMATION_NAME } from './constants';

// Success and info toasts carry no ARIA role: their announcements come from the persistent
// live region in the stack container, so a role here would only cause double announcements.
const severityConfig = {
    success: {
        icon: CircleCheck,
        role: undefined,
        autoDismiss: true,
        iconClassName: 'text-success',
        accentClassName: 'border-l-success-solid',
        progressClassName: 'bg-success-solid',
    },
    danger: {
        icon: CircleAlert,
        role: 'alert',
        autoDismiss: false,
        iconClassName: 'text-danger',
        accentClassName: 'border-l-danger-solid',
        progressClassName: 'bg-danger-solid',
    },
    info: {
        icon: Info,
        role: undefined,
        autoDismiss: true,
        iconClassName: 'text-info',
        accentClassName: 'border-l-info-solid',
        progressClassName: 'bg-info-solid',
    },
} as const;

const actionButtonClassName = 'flex items-center gap-1 text-xs font-medium text-content-muted hover:text-content';

type Props = {
    alert: MessageModel;
    autoDismissMs?: number;
};

function Alert({ alert, autoDismissMs = AUTO_DISMISS_MS }: Readonly<Props>) {
    const dispatch = useDispatch();
    const config = severityConfig[alert.color];
    const SeverityIcon = config.icon;

    const [isExpanded, setIsExpanded] = useState(false);
    const [wasExpanded, setWasExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    const isHiding = Boolean(alert.isHiding);
    const autoDismissEnabled = config.autoDismiss && !wasExpanded && !isHiding;

    const beginDismiss = useCallback(() => {
        dispatch(actions.hide(alert.id));
        setTimeout(() => dispatch(actions.dismiss(alert.id)), EXIT_ANIMATION_MS);
    }, [dispatch, alert.id]);

    const handleProgressEnd = useCallback(
        (event: AnimationEvent<HTMLDivElement>) => {
            if (event.animationName === PROGRESS_ANIMATION_NAME) beginDismiss();
        },
        [beginDismiss],
    );

    const measureOverflow = useCallback(() => {
        const element = contentRef.current;
        if (!element) return;
        setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    }, []);

    // Re-measure on resize and after web fonts settle — both can change how many lines the message needs.
    useEffect(() => {
        if (isExpanded) return;
        measureOverflow();

        let disposed = false;
        window.addEventListener('resize', measureOverflow);
        document.fonts?.ready.then(() => {
            if (!disposed) measureOverflow();
        });
        return () => {
            disposed = true;
            window.removeEventListener('resize', measureOverflow);
        };
    }, [isExpanded, measureOverflow]);

    useEffect(() => {
        if (!isCopied) return;
        const timeout = setTimeout(() => setIsCopied(false), COPY_CONFIRMATION_MS);
        return () => clearTimeout(timeout);
    }, [isCopied]);

    const toggleExpanded = useCallback(() => {
        setIsExpanded((expanded) => !expanded);
        setWasExpanded(true);
    }, []);

    const copyMessage = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(alert.message);
            setIsCopied(true);
        } catch {
            setIsCopied(false);
        }
    }, [alert.message]);

    return (
        <div
            className={cn('grid transition-all duration-200 motion-reduce:transition-opacity', {
                'grid-rows-[0fr] opacity-0 pointer-events-none': isHiding,
                'grid-rows-[1fr] opacity-100': !isHiding,
            })}
        >
            <div className={cn('min-h-0', { 'overflow-hidden': isHiding })}>
                <div
                    role={config.role}
                    data-testid={`alert-${alert.id}`}
                    className={cn(
                        'group pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-l-4 p-3 text-sm shadow-lg',
                        'bg-surface-raised border-divider text-content',
                        'animate-[toast-in_200ms_ease-out] motion-reduce:animate-[toast-fade-in_200ms_ease-out]',
                        config.accentClassName,
                    )}
                >
                    <SeverityIcon size={16} className={cn('mt-0.5 shrink-0', config.iconClassName)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <div
                            ref={contentRef}
                            className={cn('break-words whitespace-pre-line', isExpanded ? 'max-h-[50vh] overflow-y-auto' : 'line-clamp-4')}
                        >
                            {alert.message.trimEnd()}
                        </div>
                        {(isOverflowing || isExpanded) && (
                            <div className="mt-2 flex items-center gap-4">
                                <button type="button" className={actionButtonClassName} onClick={toggleExpanded}>
                                    {isExpanded ? 'Show less' : 'Show more'}
                                    {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                                </button>
                                {alert.color === 'danger' && isExpanded && (
                                    <button type="button" className={actionButtonClassName} onClick={copyMessage}>
                                        {isCopied ? 'Copied' : 'Copy'}
                                        {isCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Dismiss"
                        className={cn(
                            '-my-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-md',
                            'text-content-muted hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2',
                        )}
                        onClick={beginDismiss}
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                    {autoDismissEnabled && (
                        <div
                            data-testid={`alert-progress-${alert.id}`}
                            aria-hidden="true"
                            className={cn(
                                'absolute bottom-0 left-0 h-[3px]',
                                'group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]',
                                config.progressClassName,
                            )}
                            style={{
                                animationName: PROGRESS_ANIMATION_NAME,
                                animationDuration: `${autoDismissMs}ms`,
                                animationTimingFunction: 'linear',
                                animationFillMode: 'forwards',
                            }}
                            onAnimationEnd={handleProgressEnd}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default Alert;
