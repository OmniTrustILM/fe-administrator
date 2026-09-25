import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import type { DropdownItem } from 'components/Dropdown';
import { ChevronDown, EllipsisVertical, Pin } from 'lucide-react';
import type { ViewTab } from 'utils/listViews';

type Props = Readonly<{
    tabs: readonly ViewTab[];
    /** How many views the resource holds in all, the overflow's own included. */
    viewCount: number;
    onSelect: (id: string) => void;
    actionsFor: (tab: ViewTab) => DropdownItem[];
    isBusy: boolean;
    dataTestId: string;
}>;

const itemClassName = cn(
    'flex items-center gap-x-2 py-2 px-3 rounded-lg text-sm text-content cursor-pointer',
    'hover:bg-surface-hover focus:outline-hidden focus:bg-surface-hover',
    'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
);

const contentClassName = 'min-w-60 z-[100] bg-surface-raised border-divider dark:border shadow-md rounded-lg p-1 space-y-0.5';

/**
 * The views past the strip's cap. Each row picks its view, and carries the view's own actions in a
 * submenu so a view can be renamed, pinned or deleted without first being applied to the table.
 */
export default function OverflowViewsMenu({ tabs, viewCount, onSelect, actionsFor, isBusy, dataTestId }: Props) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                type="button"
                aria-label="More saved views"
                data-testid={dataTestId}
                className={cn(
                    'group p-2 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg text-inherit bg-transparent',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-current',
                )}
            >
                {tabs.length} more
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content className={cn(contentClassName, 'max-h-80 overflow-y-auto')} sideOffset={4} align="start">
                    <DropdownMenu.Label className="px-3 py-1.5 text-xs text-content-subtle" data-testid={`${dataTestId}-count`}>
                        {viewCount} saved views
                    </DropdownMenu.Label>

                    {tabs.map((tab) => {
                        const actions = actionsFor(tab);

                        return (
                            <div key={tab.id} className="flex items-center gap-x-0.5">
                                <DropdownMenu.Item className={cn(itemClassName, 'flex-1 min-w-0')} onSelect={() => onSelect(tab.id)}>
                                    {tab.isPinned && <Pin className="size-3.5 shrink-0" aria-label="Opens by default" />}
                                    <span className="truncate">{tab.name}</span>
                                </DropdownMenu.Item>

                                {actions.length > 0 && (
                                    <DropdownMenu.Sub>
                                        <DropdownMenu.SubTrigger
                                            aria-label={`Actions for ${tab.name}`}
                                            disabled={isBusy}
                                            className={cn(itemClassName, 'px-2 text-content-subtle data-[state=open]:bg-surface-hover')}
                                            data-testid={`${dataTestId}-actions-${tab.id}`}
                                        >
                                            <EllipsisVertical className="size-4" />
                                        </DropdownMenu.SubTrigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.SubContent className={contentClassName} sideOffset={4}>
                                                {actions.map((action) => (
                                                    <DropdownMenu.Item
                                                        key={String(action.title)}
                                                        className={itemClassName}
                                                        onSelect={() => action.onClick()}
                                                    >
                                                        {action.title}
                                                    </DropdownMenu.Item>
                                                ))}
                                            </DropdownMenu.SubContent>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Sub>
                                )}
                            </div>
                        );
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
