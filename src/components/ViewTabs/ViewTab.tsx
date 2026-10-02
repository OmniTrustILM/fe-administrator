import cn from 'classnames';
import { Pin } from 'lucide-react';
import type { ViewTab as ViewTabModel } from 'utils/listViews';

type Props = Readonly<{
    tab: ViewTabModel;
    isActive: boolean;
    /** Whether the table has drifted from what this view stores. Only ever true for the active tab. */
    isDirty: boolean;
    onSelect: () => void;
    /** The tab's action menu, rendered beside the label rather than inside its button. */
    menu?: React.ReactNode;
    dataTestId: string;
}>;

/**
 * One tab of the view strip.
 *
 * The action menu is a sibling of the tab button, not a child: a menu trigger nested inside a tab
 * would be one interactive element inside another, which leaves both unreachable from the keyboard
 * in the order they appear.
 */
export default function ViewTab({ tab, isActive, isDirty, onSelect, menu, dataTestId }: Props) {
    return (
        <div
            className={cn('inline-flex items-center rounded-lg', {
                'bg-surface-active': isActive,
                'hover:bg-surface-hover': !isActive,
            })}
        >
            <button
                type="button"
                role="tab"
                id={`view-tab-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={onSelect}
                data-testid={dataTestId}
                className={cn(
                    'py-3 pl-4 inline-flex items-center gap-x-2 bg-transparent text-sm font-medium rounded-lg',
                    'focus:outline-hidden whitespace-nowrap',
                    menu ? 'pr-2' : 'pr-4',
                    isActive ? 'text-content' : 'text-content-subtle hover:text-content',
                )}
            >
                {tab.isPinned && <Pin className="size-3.5 shrink-0" aria-label="Opens by default" />}
                {tab.name}
                {isDirty && (
                    <>
                        <span className="size-1.5 shrink-0 rounded-full bg-brand" data-testid={`${dataTestId}-dirty`} aria-hidden="true" />
                        <span className="sr-only">(unsaved changes)</span>
                    </>
                )}
            </button>
            {menu}
        </div>
    );
}
