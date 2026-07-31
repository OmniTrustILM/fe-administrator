import cn from 'classnames';
import DOMPurify from 'dompurify';
import { type AnimationEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Check, ChevronDown, ChevronUp, CircleAlert, CircleCheck, Copy, Info, X } from 'lucide-react';

import { actions } from 'ducks/alerts';
import type { MessageModel } from 'types/alerts';

import { AUTO_DISMISS_MS, COPY_CONFIRMATION_MS, EXIT_ANIMATION_MS, PROGRESS_ANIMATION_NAME } from './constants';

// Backend-provided messages may carry simple formatting, but nothing in the app produces
// richer markup — so only basic text formatting survives sanitization. Style tags, forms,
// images, links and all attributes are stripped to prevent UI injection via API errors.
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'span'],
    ALLOWED_ATTR: [],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
};

const severityConfig = {
    success: {
        icon: CircleCheck,
        role: 'status',
        autoDismiss: true,
        iconClassName: 'text-teal-500',
        accentClassName: 'border-l-teal-500 dark:border-l-teal-500',
        progressClassName: 'bg-teal-500',
    },
    danger: {
        icon: CircleAlert,
        role: 'alert',
        autoDismiss: false,
        iconClassName: 'text-red-500',
        accentClassName: 'border-l-red-500 dark:border-l-red-500',
        progressClassName: 'bg-red-500',
    },
    info: {
        icon: Info,
        role: 'status',
        autoDismiss: true,
        iconClassName: 'text-blue-500',
        accentClassName: 'border-l-blue-500 dark:border-l-blue-500',
        progressClassName: 'bg-blue-500',
    },
} as const;

const actionButtonClassName =
    'flex items-center gap-1 text-xs font-medium text-gray-800 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-200';

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

    const sanitizedMessage = useMemo(() => DOMPurify.sanitize(alert.message, SANITIZE_CONFIG), [alert.message]);

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
        const text = contentRef.current?.textContent ?? '';
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
        } catch {
            setIsCopied(false);
        }
    }, []);

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
                        'bg-white border-gray-200 text-gray-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200',
                        'animate-[toast-in_200ms_ease-out] motion-reduce:animate-[toast-fade-in_200ms_ease-out]',
                        config.accentClassName,
                    )}
                >
                    <SeverityIcon size={16} className={cn('mt-0.5 shrink-0', config.iconClassName)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <div
                            ref={contentRef}
                            className={cn('break-words', isExpanded ? 'max-h-[50vh] overflow-y-auto' : 'line-clamp-4')}
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: alert messages may contain backend-provided HTML; sanitized with DOMPurify above
                            dangerouslySetInnerHTML={{ __html: sanitizedMessage }}
                        />
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
                            'text-gray-800 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2',
                            'dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
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
