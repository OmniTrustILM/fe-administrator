import { describe, expect, it } from 'vitest';
import { DEFAULT_ITEMS_PER_PAGE_OPTIONS } from './pagination';

describe('DEFAULT_ITEMS_PER_PAGE_OPTIONS', () => {
    it('offers exactly the four agreed page sizes, in ascending order', () => {
        expect(DEFAULT_ITEMS_PER_PAGE_OPTIONS).toEqual([10, 25, 50, 100]);
    });
});
