import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import { type ReactNode, useId } from 'react';

type Props = Readonly<{
    icon: ReactNode;
    label: string;
    disabled: boolean;
    dataTestId: string;
    /** Shown under the label and announced as the entry's description, e.g. why it is unavailable. */
    description?: string;
    /** An element elsewhere in the menu describing the entry, for a reason several entries share. */
    describedBy?: string;
    destructive?: boolean;
    onSelect: () => void;
}>;

/**
 * Unavailable entries are marked `aria-disabled` rather than handed to Radix's `disabled`, which drops
 * them from its roving focus — an entry arrow keys cannot reach is one whose reason nobody hears.
 * Selecting one is made inert instead, and leaves the menu open.
 */
function MenuItem({ icon, label, disabled, dataTestId, description, describedBy, destructive = false, onSelect }: Props) {
    const descriptionId = useId();
    let colour = 'cursor-pointer text-content';
    // Focus repaints the text as well: `content-subtle` on the focus background is 4.28:1 in
    // the light theme, under AA, and the token suite asserts that pairing nowhere.
    if (disabled) colour = 'cursor-not-allowed text-content-subtle focus:text-content';
    else if (destructive) colour = 'cursor-pointer text-danger';

    return (
        <DropdownMenu.Item
            aria-disabled={disabled || undefined}
            aria-describedby={description ? descriptionId : describedBy}
            onSelect={(event) => (disabled ? event.preventDefault() : onSelect())}
            data-testid={dataTestId}
            className={cn(
                'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm focus:bg-surface-hover focus:outline-hidden',
                colour,
            )}
        >
            {icon}
            {description ? (
                <span className="flex min-w-0 flex-col">
                    <span>{label}</span>
                    {/* Hidden so it stays out of the entry's name; aria-describedby still announces it. */}
                    <span id={descriptionId} aria-hidden className="text-xs text-content-subtle group-focus:text-content">
                        {description}
                    </span>
                </span>
            ) : (
                label
            )}
        </DropdownMenu.Item>
    );
}

export default MenuItem;
