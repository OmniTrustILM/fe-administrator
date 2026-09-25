import { SortDirection } from 'types/openapi';

export const COMMENT_SORT_STORAGE_KEY = 'comment-sort-direction';

/** Newest first: the panel is opened to read the latest activity. */
export const DEFAULT_COMMENT_SORT = SortDirection.Desc;

const isSortDirection = (value: unknown): value is SortDirection => value === SortDirection.Asc || value === SortDirection.Desc;

export const readStoredCommentSort = (): SortDirection => {
    try {
        const stored = globalThis.localStorage?.getItem(COMMENT_SORT_STORAGE_KEY);
        return isSortDirection(stored) ? stored : DEFAULT_COMMENT_SORT;
    } catch {
        return DEFAULT_COMMENT_SORT;
    }
};

export const storeCommentSort = (direction: SortDirection): void => {
    try {
        globalThis.localStorage?.setItem(COMMENT_SORT_STORAGE_KEY, direction);
    } catch {
        // Storage can be unavailable; the choice then lasts for the session only.
    }
};
