import cn from 'classnames';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = Readonly<{
    children: ReactNode;
    className?: string;
}>;

/**
 * An informational note in a form or a dialog. Its tint is the `info` family, which follows the operator's secondary
 * colour, so a note about the operator's own colours belongs in a `Callout` instead.
 */
export default function InfoNote({ children, className }: Props) {
    return (
        <div className={cn('flex gap-2 rounded-lg bg-info-surface px-3 py-2 text-sm text-info', className)}>
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div>{children}</div>
        </div>
    );
}
