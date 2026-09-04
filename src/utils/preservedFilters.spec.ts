import { describe, expect, test } from 'vitest';
import { preservedFilterRestore } from './preservedFilters';

const decide = (overrides: Partial<Parameters<typeof preservedFilterRestore>[0]> = {}) =>
    preservedFilterRestore({ withPreservedFilters: true, preservedCount: 1, currentCount: 0, ...overrides });

describe('preservedFilterRestore', () => {
    test('restores a deep link that left only a snapshot behind', () => {
        expect(decide()).toBe('restore');
    });

    /**
     * A link that populates the current filters as well as snapshotting them leaves nothing to apply -
     * but it is finished, not pending. Reported as pending, the restore stays armed until a tab switch
     * clears the filters, and then undoes the switch.
     */
    test('reports a deep link whose filters are already in place as settled, not pending', () => {
        expect(decide({ currentCount: 2 })).toBe('settled');
    });

    test('does nothing on a page that does not honour deep-link filters', () => {
        expect(decide({ withPreservedFilters: false })).toBe('inapplicable');
    });

    /** No snapshot means no deep link, so the restore has genuinely not happened and stays armed. */
    test('stays armed when there is no snapshot to restore', () => {
        expect(decide({ preservedCount: 0 })).toBe('inapplicable');
    });

    test('stays armed when there is no snapshot even though filters are set', () => {
        expect(decide({ preservedCount: 0, currentCount: 3 })).toBe('inapplicable');
    });

    /** Only 'inapplicable' leaves the restore to run later, which is the whole point of the three cases. */
    test.each([
        ['restore', { currentCount: 0 }],
        ['settled', { currentCount: 1 }],
    ] as const)('treats %s as the restore having happened', (expected, overrides) => {
        expect(decide(overrides)).toBe(expected);
        expect(decide(overrides)).not.toBe('inapplicable');
    });
});
