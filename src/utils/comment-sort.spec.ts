import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SortDirection } from 'types/openapi';
import {
    COMMENT_SORT_STORAGE_KEY,
    DEFAULT_COMMENT_SORT,
    MAX_STORED_COMMENT_SORTS,
    readStoredCommentSorts,
    storeCommentSort,
} from './comment-sort';

const stored = () => JSON.parse(localStorage.getItem(COMMENT_SORT_STORAGE_KEY) ?? 'null');

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

    describe('readStoredCommentSorts', () => {
        test('should read as empty when nothing is stored', () => {
            expect(readStoredCommentSorts()).toEqual({});
        });

        test('should return the stored choices by object', () => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, JSON.stringify({ 'certificates/a': 'asc', 'keys/b': 'desc' }));
            expect(readStoredCommentSorts()).toEqual({ 'certificates/a': SortDirection.Asc, 'keys/b': SortDirection.Desc });
        });

        test('should drop an entry that is not a direction and keep the rest', () => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, JSON.stringify({ 'certificates/a': 'ASC', 'keys/b': 'asc', 'keys/c': 1 }));
            expect(readStoredCommentSorts()).toEqual({ 'keys/b': SortDirection.Asc });
        });

        test.each(['asc', 'desc', '', 'null', '[]', '"asc"', '{'])(
            'should read as empty for the value %j, including the single direction earlier releases stored',
            (value) => {
                localStorage.setItem(COMMENT_SORT_STORAGE_KEY, value);
                expect(readStoredCommentSorts()).toEqual({});
            },
        );

        test('should read as empty when storage throws', () => {
            // Stub the global rather than Storage.prototype, for the reason given in theme.spec.ts.
            const getItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { getItem });

            expect(readStoredCommentSorts()).toEqual({});
            expect(getItem).toHaveBeenCalledWith(COMMENT_SORT_STORAGE_KEY);
        });
    });

    describe('storeCommentSort', () => {
        test('should persist a choice away from the default for that object alone', () => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, JSON.stringify({ 'keys/b': 'asc' }));
            storeCommentSort('certificates/a', SortDirection.Asc);
            expect(stored()).toEqual({ 'keys/b': 'asc', 'certificates/a': 'asc' });
        });

        test('should forget the object when it goes back to the default', () => {
            storeCommentSort('certificates/a', SortDirection.Asc);
            storeCommentSort('keys/b', SortDirection.Asc);
            storeCommentSort('certificates/a', SortDirection.Desc);
            expect(stored()).toEqual({ 'keys/b': 'asc' });
        });

        test('should replace the single direction earlier releases stored', () => {
            localStorage.setItem(COMMENT_SORT_STORAGE_KEY, 'asc');
            storeCommentSort('certificates/a', SortDirection.Asc);
            expect(stored()).toEqual({ 'certificates/a': 'asc' });
        });

        test('should keep the latest choices when there are too many, moving a repeated object to the end', () => {
            for (let i = 0; i < MAX_STORED_COMMENT_SORTS; i++) storeCommentSort(`certificates/${i}`, SortDirection.Asc);
            storeCommentSort('certificates/0', SortDirection.Asc);
            storeCommentSort('certificates/new', SortDirection.Asc);

            const keys = Object.keys(stored());
            expect(keys).toHaveLength(MAX_STORED_COMMENT_SORTS);
            expect(keys).not.toContain('certificates/1');
            expect(keys.slice(-2)).toEqual(['certificates/0', 'certificates/new']);
        });

        test('should not throw when storage is unavailable', () => {
            const setItem = vi.fn(() => {
                throw new Error('storage disabled');
            });
            vi.stubGlobal('localStorage', { getItem: () => null, setItem });

            expect(() => storeCommentSort('certificates/a', SortDirection.Asc)).not.toThrow();
            expect(setItem).toHaveBeenCalledWith(COMMENT_SORT_STORAGE_KEY, JSON.stringify({ 'certificates/a': 'asc' }));
        });
    });
});
