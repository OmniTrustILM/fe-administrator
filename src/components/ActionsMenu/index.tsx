import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import { EllipsisVertical } from 'lucide-react';
import { useRef } from 'react';
import Dropdown from 'components/Dropdown';
import type { IconName } from 'types/icons';
import { iconRegistry } from 'utils/icons';

export type PageAction = {
    id: string;
    label: string;
    icon: IconName;
    /** Receives the control the action was started from, for feedback anchored to it. */
    onClick: (anchor: HTMLElement | null) => void;
    disabled?: boolean;
    disabledReason?: string;
    destructive?: boolean;
};

type Props = Readonly<{
    actions: PageAction[];
}>;

function ActionsMenu({ actions }: Props) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const regular = actions.filter((action) => !action.destructive);
    const destructive = actions.filter((action) => action.destructive);

    // aria-disabled rather than Radix's disabled: a disabled item drops out of keyboard reach, and its reason with it.
    const renderItem = (action: PageAction) => {
        const Icon = iconRegistry[action.icon];
        return (
            <DropdownMenu.Item
                key={action.id}
                aria-disabled={action.disabled || undefined}
                data-testid={`page-action-${action.id}`}
                className={cn(
                    'flex items-start gap-x-3 py-2 px-3 w-full text-left rounded-lg text-sm focus:outline-hidden focus:bg-surface-hover',
                    action.disabled ? 'cursor-not-allowed text-content-subtle' : 'cursor-pointer hover:bg-surface-hover',
                    !action.disabled && (action.destructive ? 'text-danger' : 'text-content'),
                )}
                onSelect={(event) => {
                    if (action.disabled) {
                        event.preventDefault();
                        return;
                    }
                    action.onClick(triggerRef.current);
                }}
            >
                <span className="shrink-0 mt-0.5" aria-hidden>
                    <Icon size={16} />
                </span>
                <span className="flex flex-col min-w-0">
                    <span>{action.label}</span>
                    {action.disabled && action.disabledReason && (
                        <span className="text-xs text-content-subtle">{action.disabledReason}</span>
                    )}
                </span>
            </DropdownMenu.Item>
        );
    };

    return (
        <Dropdown
            title={<EllipsisVertical size={20} aria-hidden="true" />}
            ariaLabel="More actions"
            hideArrow
            triggerClassName="p-2.5"
            buttonRef={triggerRef}
            menu={
                <>
                    {regular.map(renderItem)}
                    {regular.length > 0 && destructive.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-divider" />}
                    {destructive.map(renderItem)}
                </>
            }
        />
    );
}

export default ActionsMenu;
