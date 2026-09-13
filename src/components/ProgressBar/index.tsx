import cn from 'classnames';
import type React from 'react';

export type ProgressBarTone = 'brand' | 'success' | 'warning' | 'danger' | 'info';

type Props = Readonly<{
    /** Work done so far. Leave it out when nothing has been reported and the bar renders indeterminate. */
    value?: number;
    /**
     * The total the value is measured against. Leave it out when the total is unknown: the bar then renders
     * indeterminate rather than guessing a denominator. A missing max is never defaulted to 100.
     */
    max?: number;
    /** Rendered above the track, typically what is being counted on the left and the figures on the right. */
    label?: React.ReactNode;
    /** Rendered under the track in a muted small size, typically when the reading was taken. */
    caption?: React.ReactNode;
    tone?: ProgressBarTone;
    size?: 'sm' | 'md';
    className?: string;
    dataTestId?: string;
    ariaLabel?: string;
}>;

const toneClasses: Record<ProgressBarTone, string> = {
    brand: 'bg-brand-solid',
    success: 'bg-success-solid',
    warning: 'bg-warning-solid',
    danger: 'bg-danger-solid',
    info: 'bg-info-solid',
};

/**
 * The filled fraction of the track, or undefined when there is nothing honest to draw: no value, no total, or a total
 * of zero. Clamped to [0, 1] so a value that overshoots a shrinking estimate still fills the track rather than
 * spilling out of it.
 */
export function progressRatio(value?: number, max?: number): number | undefined {
    if (value === undefined || max === undefined) return undefined;
    if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return undefined;
    return Math.min(1, Math.max(0, value / max));
}

export default function ProgressBar({ value, max, label, caption, tone = 'brand', size = 'md', className, dataTestId, ariaLabel }: Props) {
    const ratio = progressRatio(value, max);
    const indeterminate = ratio === undefined;

    return (
        <div className={cn('flex w-full flex-col gap-1', className)} data-testid={dataTestId ?? 'progress-bar'}>
            {label ? <div className="flex items-center justify-between gap-2 text-sm text-content">{label}</div> : null}
            <div
                role="progressbar"
                aria-label={ariaLabel}
                aria-valuemin={0}
                aria-valuemax={indeterminate ? undefined : max}
                aria-valuenow={indeterminate ? undefined : value}
                data-indeterminate={indeterminate ? 'true' : undefined}
                className={cn('relative w-full overflow-hidden rounded-full bg-surface-sunken', size === 'sm' ? 'h-1.5' : 'h-2.5')}
            >
                <div
                    data-testid="progress-bar-fill"
                    className={cn(
                        'h-full rounded-full',
                        toneClasses[tone],
                        indeterminate
                            ? 'w-1/3 animate-[progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40'
                            : 'transition-[width] duration-300 motion-reduce:transition-none',
                    )}
                    style={indeterminate ? undefined : { width: `${Math.round(ratio * 1000) / 10}%` }}
                />
            </div>
            {caption ? <div className="text-xs text-content-muted">{caption}</div> : null}
        </div>
    );
}
