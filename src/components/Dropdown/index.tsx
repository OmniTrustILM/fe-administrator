import cn from 'classnames';
import type { ButtonColor, ButtonVariant } from 'components/Button';
import { useEffect } from 'react';

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
}: Readonly<Props>) {
    useEffect(() => {
        const hsMethods = (globalThis as any).HSStaticMethods;
        if (hsMethods) hsMethods.autoInit();
    }, [disabled]);

    return (
        <div
            // we need this key to force a re-render when the disabled state changes otherwise the dropdown will not work correctly
            key={disabled ? 'dropdown-disabled' : 'dropdown-enabled'}
            className={cn('hs-dropdown relative inline-flex z-10', className)}
        >
            <button
                id="hs-dropdown-default"
                type="button"
                className={cn(
                    'hs-dropdown-toggle p-2 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 text-inherit',
                    {
                        'border border-gray-200 shadow-2xs bg-white text-gray-800 hover:bg-gray-50 focus:bg-gray-50':
                            btnStyle !== 'transparent',
                        'bg-transparent': btnStyle === 'transparent',
                    },
                )}
                aria-haspopup="menu"
                aria-expanded="false"
                aria-label="Dropdown"
                disabled={disabled}
                ref={buttonRef}
            >
                {title}
                {!hideArrow && (
                    <svg
                        className="hs-dropdown-open:rotate-180 size-4"
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
            </button>

            <div
                className={cn(
                    'hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-60 bg-white shadow-md rounded-lg mt-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 dark:divide-neutral-700 after:h-4 after:absolute after:-bottom-4 after:start-0 after:w-full before:h-4 before:absolute before:-top-4 before:start-0 before:w-full',
                    menuClassName,
                )}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="hs-dropdown-default"
            >
                <div className="p-1 space-y-0.5">
                    {menu}
                    {items &&
                        items.length > 0 &&
                        items.map((item, index) => (
                            <button
                                key={index}
                                type="button"
                                className="flex items-center gap-x-3.5 py-2 px-3 w-full text-left rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-hidden focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700 cursor-pointer"
                                onClick={() => item.onClick()}
                            >
                                {item.title}
                            </button>
                        ))}
                </div>
            </div>
        </div>
    );
}

export default Dropdown;
