import { SortDirection } from 'types/openapi';

/**
 * The objects the user reads in the other direction, as a map from panel key to direction. Earlier releases kept a
 * single direction for every object under this key; that value does not parse as a map and is replaced on the next
 * choice.
 */
export const COMMENT_SORT_STORAGE_KEY = 'comment-sort-direction';

/** Newest first: the panel is opened to read the latest activity. */
export const DEFAULT_COMMENT_SORT = SortDirection.Desc;

/** Objects get deleted without the choice made on them being forgotten, so the oldest choices give way. */
export const MAX_STORED_COMMENT_SORTS = 500;

const isSortDirection = (value: unknown): value is SortDirection => value === SortDirection.Asc || value === SortDirection.Desc;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The stored choices in the order they were made; a corrupt entry is dropped and a corrupt store reads as empty. */
export const readStoredCommentSorts = (): Record<string, SortDirection> => {
    try {
        const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(COMMENT_SORT_STORAGE_KEY) ?? 'null');
        if (!isRecord(parsed)) return {};
        return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, SortDirection] => isSortDirection(entry[1])));
    } catch {
        return {};
    }
};

/** Only a choice away from the default is kept, so flipping an object back forgets it. */
export const storeCommentSort = (key: string, direction: SortDirection): void => {
    try {
        const stored = readStoredCommentSorts();
        delete stored[key];
        if (direction !== DEFAULT_COMMENT_SORT) stored[key] = direction;
        const kept = Object.entries(stored).slice(-MAX_STORED_COMMENT_SORTS);
        globalThis.localStorage?.setItem(COMMENT_SORT_STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
    } catch {
        // Storage can be unavailable; the choice then lasts for the session only.
    }
};
