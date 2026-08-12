const WRAPPER_BASE =
    'relative ps-2 min-h-11 flex items-center flex-wrap w-full bg-surface-raised border border-outline rounded-lg text-start text-sm hover:bg-surface-hover focus-within:ring-2 focus-within:ring-brand focus-within:border-brand text-content';

export const WRAPPER_CLASSES = `${WRAPPER_BASE} pe-9`;
export const WRAPPER_CLEARABLE_CLASSES = `${WRAPPER_BASE} pe-14`;

export const TRIGGER_CLASSES =
    'text-content relative py-3 ps-4 pe-9 flex gap-x-2 w-full cursor-pointer bg-surface-raised border border-outline rounded-lg text-start text-sm focus:outline-hidden focus:ring-2 dark:focus:ring-1 focus:ring-brand dark:focus:outline-hidden overflow-hidden [&>span]:truncate [&>span]:block [&>span]:min-w-0';

export const TRIGGER_CLEARABLE_CLASSES =
    'text-content relative py-3 ps-4 pe-14 flex gap-x-2 w-full cursor-pointer bg-surface-raised border border-outline rounded-lg text-start text-sm focus:outline-hidden focus:ring-2 dark:focus:ring-1 focus:ring-brand dark:focus:outline-hidden overflow-hidden [&>span]:truncate [&>span]:block [&>span]:min-w-0';

export const TRIGGER_DISABLED_CLASSES = 'pointer-events-none opacity-50';

export const PLACEHOLDER_CLASSES = 'text-content-subtle';

export const CHEVRON_CLASSES = 'absolute top-1/2 end-3 -translate-y-1/2 shrink-0 size-3.5 text-content-subtle';

export const CONTENT_CLASSES =
    'z-[100] max-h-72 space-y-0.5 bg-surface-raised border border-divider rounded-lg overflow-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-surface-sunken [&::-webkit-scrollbar-thumb]:bg-surface-active';

export const CONTENT_FLUID_WIDTH_CLASSES = 'w-[var(--radix-popover-trigger-width)]';

export const SEARCH_WRAPPER_CLASSES = 'bg-surface-raised p-2 sticky top-0 z-10';

export const SEARCH_INPUT_CLASSES =
    'block w-full sm:text-sm border border-outline rounded-lg focus:ring-transparent bg-surface-raised text-content placeholder-content-subtle py-1.5 sm:py-2 px-3';

export const LISTBOX_CLASSES = 'p-1';

export const OPTION_CLASSES =
    'flex justify-between items-center py-2 px-3 w-full text-sm cursor-pointer rounded-lg focus:outline-hidden overflow-hidden text-content';

export const OPTION_HIGHLIGHTED_CLASSES = 'bg-surface-hover';
export const OPTION_DISABLED_CLASSES = 'pointer-events-none opacity-50';
export const OPTION_ADD_NEW_CLASSES = 'text-brand-hover font-medium';

export const OPTION_LABEL_TRUNCATE_CLASSES = 'truncate block min-w-0';
export const OPTION_LABEL_WRAP_CLASSES = 'whitespace-normal block min-w-0';

export const CHIP_CLASSES =
    'max-w-full min-w-0 flex flex-nowrap items-center relative z-10 bg-surface-sunken border border-outline rounded-full p-1 pl-2.5 m-1 text-content';

export const CHIP_REMOVE_CLASSES =
    'inline-flex shrink-0 justify-center items-center size-5 ms-1.5 rounded-full bg-surface-hover hover:bg-surface-active focus:outline-none text-content-muted hover:text-content cursor-pointer';

export const CHIP_LABEL_CLASSES = 'truncate min-w-0 cursor-default block';

export const SELECTED_ICON_CLASSES = 'shrink-0 size-3.5 text-brand ml-2';

export const NO_OPTIONS_CLASSES = 'py-2 px-3 text-sm text-content-subtle';
