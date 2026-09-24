import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SortDirection } from 'types/openapi';
import { COMMENT_SORT_STORAGE_KEY, DEFAULT_COMMENT_SORT, readStoredCommentSort, storeCommentSort } from './comment-sort';

describe('comment sort direction', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('defaults to newest-first', () => {
        expect(DEFAULT_COMMENT_SORT).toBe(SortDirection.Desc);
    });

    describe('readStoredCommentSort', () => {
        test('should fall back to the default when nothing is stored', () => {
            expect(readStoredCommentSort()).toBe(SortDirection.Desc);
        });

        test.each([SortDirection.Asc, SortDirection.Desc])('should return the stored direction %s', (direction) => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, direction);
            expect(readStoredCommentSort()).toBe(direction);
        });

        test.each(['ASC', 'newest', ''])('should fall back to the default for the corrupt value %j', (value) => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, value);
            expect(readStoredCommentSort()).toBe(SortDirection.Desc);
        });

        test('should fall back to the default when storage throws', () => {
            // Stub the global rather than Storage.prototype, for the reason given in theme.spec.ts.
            const getItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { getItem });

            expect(readStoredCommentSort()).toBe(SortDirection.Desc);
            expect(getItem).toHaveBeenCalledWith(COMMENT_SORT_STORAGE_KEY);
        });
    });

    describe('storeCommentSort', () => {
        test('should persist the direction', () => {
            storeCommentSort(SortDirection.Asc);
            expect(localStorage.getItem(COMMENT_SORT_STORAGE_KEY)).toBe(SortDirection.Asc);
        });

        test('should not throw when storage is unavailable', () => {
            const setItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { setItem });

            expect(() => storeCommentSort(SortDirection.Asc)).not.toThrow();
            expect(setItem).toHaveBeenCalledWith(COMMENT_SORT_STORAGE_KEY, SortDirection.Asc);
        });
    });
});
