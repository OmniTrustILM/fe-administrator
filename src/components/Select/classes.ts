const WRAPPER_BASE =
    'relative ps-2 min-h-11 flex items-center flex-wrap w-full bg-white border border-gray-200 rounded-lg text-start text-sm hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800';

export const WRAPPER_CLASSES = `${WRAPPER_BASE} pe-9`;
export const WRAPPER_CLEARABLE_CLASSES = `${WRAPPER_BASE} pe-14`;

export const TRIGGER_CLASSES =
    'text-[var(--dark-gray-color)] relative py-3 ps-4 pe-9 flex gap-x-2 w-full cursor-pointer bg-white border border-gray-200 rounded-lg text-start text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:focus:outline-hidden dark:focus:ring-1 dark:focus:ring-neutral-600 overflow-hidden [&>span]:truncate [&>span]:block [&>span]:min-w-0';

export const TRIGGER_CLEARABLE_CLASSES =
    'text-[var(--dark-gray-color)] relative py-3 ps-4 pe-14 flex gap-x-2 w-full cursor-pointer bg-white border border-gray-200 rounded-lg text-start text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:focus:outline-hidden dark:focus:ring-1 dark:focus:ring-neutral-600 overflow-hidden [&>span]:truncate [&>span]:block [&>span]:min-w-0';

export const TRIGGER_DISABLED_CLASSES = 'pointer-events-none opacity-50';

export const PLACEHOLDER_CLASSES = 'text-gray-400 dark:text-neutral-500';

export const CHEVRON_CLASSES = 'absolute top-1/2 end-3 -translate-y-1/2 shrink-0 size-3.5 dark:text-neutral-500';

export const CONTENT_CLASSES =
    'z-[100] max-h-72 space-y-0.5 bg-white border border-gray-200 rounded-lg overflow-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 dark:bg-neutral-900 dark:border-neutral-700';

export const CONTENT_FLUID_WIDTH_CLASSES = 'w-[var(--radix-popover-trigger-width)]';

export const SEARCH_WRAPPER_CLASSES = 'bg-white p-2 sticky top-0 dark:bg-neutral-900 z-10';

export const SEARCH_INPUT_CLASSES =
    'block w-full sm:text-sm border border-gray-200 rounded-lg focus:ring-transparent dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 py-1.5 sm:py-2 px-3';

export const LISTBOX_CLASSES = 'p-1';

export const OPTION_CLASSES =
    'flex justify-between items-center py-2 px-3 w-full text-sm cursor-pointer rounded-lg focus:outline-hidden dark:text-neutral-200 overflow-hidden text-[var(--dark-gray-color)]';

export const OPTION_HIGHLIGHTED_CLASSES = 'bg-gray-100 dark:bg-neutral-800';
export const OPTION_DISABLED_CLASSES = 'pointer-events-none opacity-50';
export const OPTION_ADD_NEW_CLASSES = 'text-blue-600 dark:text-blue-400 font-medium';

export const OPTION_LABEL_TRUNCATE_CLASSES = 'truncate block min-w-0';
export const OPTION_LABEL_WRAP_CLASSES = 'whitespace-normal block min-w-0';

export const CHIP_CLASSES =
    'max-w-full min-w-0 flex flex-nowrap items-center relative z-10 bg-white border border-gray-200 rounded-full p-1 pl-2.5 m-1 dark:bg-neutral-800 dark:border-neutral-600 text-[var(--dark-gray-color)] dark:text-neutral-200';

export const CHIP_REMOVE_CLASSES =
    'inline-flex shrink-0 justify-center items-center size-5 ms-1.5 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none text-gray-600 hover:text-gray-800 dark:bg-neutral-600 dark:hover:bg-neutral-500 dark:text-neutral-300 cursor-pointer';

export const CHIP_LABEL_CLASSES = 'truncate min-w-0 cursor-default block';

export const SELECTED_ICON_CLASSES = 'shrink-0 size-3.5 text-blue-600 dark:text-blue-500 ml-2';

export const NO_OPTIONS_CLASSES = 'py-2 px-3 text-sm text-gray-500 dark:text-neutral-500';
