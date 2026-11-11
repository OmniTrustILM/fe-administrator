import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { EllipsisVertical } from 'lucide-react';
import { useRef } from 'react';
import Dropdown from 'components/Dropdown';
import MenuItem from 'components/MenuItem';
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

    const renderItem = (action: PageAction) => {
        const Icon = iconRegistry[action.icon];
        return (
            <MenuItem
                key={action.id}
                icon={
                    <span className="shrink-0" aria-hidden>
                        <Icon size={16} />
                    </span>
                }
                label={action.label}
                disabled={!!action.disabled}
                description={action.disabled ? action.disabledReason : undefined}
                destructive={action.destructive}
                dataTestId={`page-action-${action.id}`}
                onSelect={() => action.onClick(triggerRef.current)}
            />
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
