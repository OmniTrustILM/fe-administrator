import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import type { ButtonColor, ButtonVariant } from 'components/Button';

export interface DropdownItem {
    title: React.ReactNode;
    onClick: () => void;
    variant?: ButtonVariant;
    color?: ButtonColor;
}

type Props = {
    title: React.ReactNode;
    items?: DropdownItem[];
    disabled?: boolean;
    btnStyle?: 'transparent';
    className?: string;
    menuClassName?: string;
    hideArrow?: boolean;
    menu?: React.ReactNode;
    buttonRef?: React.RefObject<HTMLButtonElement | null>;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    ariaLabel?: string;
};

function Dropdown({
    title,
    items,
    disabled = false,
    btnStyle,
    className,
    menuClassName,
    hideArrow = false,
    menu,
    buttonRef,
    open,
    onOpenChange,
    ariaLabel,
}: Readonly<Props>) {
    return (
        <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
            <div className={cn('relative inline-flex z-10', className)}>
                <DropdownMenu.Trigger
                    type="button"
                    aria-label={ariaLabel}
                    className={cn(
                        'group p-2 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg',
                        'focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none',
                        'dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 text-inherit',
                        {
                            'border border-gray-200 shadow-2xs bg-white text-gray-800 hover:bg-gray-50 focus:bg-gray-50':
                                btnStyle !== 'transparent',
                            'bg-transparent': btnStyle === 'transparent',
                        },
                    )}
                    disabled={disabled}
                    ref={buttonRef}
                >
                    {title}
                    {!hideArrow && (
                        <svg
                            className="group-data-[state=open]:rotate-180 size-4 transition-transform"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    )}
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className={cn(
                            'min-w-60 z-[100] bg-white shadow-md rounded-lg mt-2',
                            'dark:bg-neutral-800 dark:border dark:border-neutral-700 dark:divide-neutral-700',
                            menuClassName,
                        )}
                        sideOffset={4}
                    >
                        <div className="p-1 space-y-0.5">
                            {menu}
                            {items &&
                                items.length > 0 &&
                                items.map((item, index) => (
                                    <DropdownMenu.Item
                                        key={typeof item.title === 'string' ? item.title : `dropdown-item-${index}`}
                                        className={cn(
                                            'flex items-center gap-x-3.5 py-2 px-3 w-full text-left rounded-lg text-sm text-gray-800',
                                            'hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100',
                                            'dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700',
                                            'cursor-pointer',
                                        )}
                                        onSelect={() => item.onClick()}
                                    >
                                        {item.title}
                                    </DropdownMenu.Item>
                                ))}
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </div>
        </DropdownMenu.Root>
    );
}

export default Dropdown;
