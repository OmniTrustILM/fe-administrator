import cn from 'classnames';
import type { AriaRole, ReactNode, Ref } from 'react';

export type CalloutSeverity = 'warning' | 'danger' | 'success';

type Props = {
    severity: CalloutSeverity;
    children: ReactNode;
    role?: AriaRole;
    /** `-1` makes a callout a focus target without putting it in the tab order, for moving focus onto its message. */
    tabIndex?: number;
    ref?: Ref<HTMLDivElement>;
    className?: string;
    dataTestId?: string;
};

/**
 * Every tint here sits outside the branding overrides, which is what lets a callout carry a message about the
 * operator's own colours - the contrast warnings are exactly that. There is deliberately no informational tint: `info`
 * is derived from the operator's secondary colour, so it is the one severity that cannot say what these have to say.
 */
export const SEVERITY_CLASSES: Record<CalloutSeverity, string> = {
    warning: 'bg-warning-surface text-warning',
    danger: 'bg-danger-surface text-danger',
    success: 'bg-success-surface text-success',
};

/** A tinted note in the flow of a page or a dialog: a severity, the surface that carries it, and the text itself. */
function Callout({ severity, children, role, tabIndex, ref, className, dataTestId }: Readonly<Props>) {
    return (
        <div
            ref={ref}
            className={cn('rounded-lg px-3 py-2 text-sm', SEVERITY_CLASSES[severity], className)}
            role={role}
            tabIndex={tabIndex}
            data-testid={dataTestId}
        >
            {children}
        </div>
    );
}

export default Callout;
