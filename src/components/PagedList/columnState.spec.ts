import { describe, expect, it } from 'vitest';
import { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { getRenderableProperties, isSameSort, toColumnSortFromHeader } from './columnState';

const columns: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name', sortable: true },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CK_ASSOCIATIONS', catalogueLabel: 'Associations' },
    { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING', catalogueLabel: 'Department', sortable: false },
];

describe('toColumnSortFromHeader', () => {
    it('resolves a header id back to the column it names', () => {
        expect(toColumnSortFromHeader('property:COMMON_NAME', 'desc', columns)).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            direction: 'desc',
        });
    });

    it('refuses a column the catalogue says cannot be ordered on', () => {
        expect(toColumnSortFromHeader('custom:department|STRING', 'asc', columns)).toBeUndefined();
    });

    it('refuses a column with no sortable answer at all, rather than guessing', () => {
        expect(toColumnSortFromHeader('property:CK_ASSOCIATIONS', 'asc', columns)).toBeUndefined();
    });

    it('refuses a header that is no longer a displayed column', () => {
        expect(toColumnSortFromHeader('property:NOT_AFTER', 'asc', columns)).toBeUndefined();
    });

    it("refuses one of the table's own chrome columns", () => {
        expect(toColumnSortFromHeader('__checkbox__', 'asc', columns)).toBeUndefined();
    });

    it('separates two sources publishing one identifier', () => {
        expect(toColumnSortFromHeader('meta:COMMON_NAME', 'asc', columns)).toBeUndefined();
    });
});

describe('isSameSort', () => {
    const sort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' as const };

    it('treats two absent orderings as the same', () => {
        expect(isSameSort(undefined, undefined)).toBe(true);
    });

    it('separates an ordering from no ordering', () => {
        expect(isSameSort(sort, undefined)).toBe(false);
        expect(isSameSort(undefined, sort)).toBe(false);
    });

    it('separates two directions of one column', () => {
        expect(isSameSort(sort, { ...sort, direction: 'desc' })).toBe(false);
    });

    it('separates two columns', () => {
        expect(isSameSort(sort, { ...sort, fieldIdentifier: 'NOT_AFTER' })).toBe(false);
    });

    it('separates one identifier under two sources', () => {
        expect(isSameSort(sort, { ...sort, fieldSource: FilterFieldSource.Meta })).toBe(false);
    });

    it('treats an equal ordering as the same, so an echo cannot start a fetch', () => {
        expect(isSameSort(sort, { ...sort })).toBe(true);
    });
});

describe('getRenderableProperties', () => {
    it("is the registry's own keys", () => {
        const gate = getRenderableProperties({ 'property:COMMON_NAME': () => null, 'custom:x|STRING': () => null });

        expect(gate.has('property:COMMON_NAME')).toBe(true);
        expect(gate.has('custom:x|STRING')).toBe(true);
        expect(gate.size).toBe(2);
    });

    it('is empty for a page with no registry, which then offers no property column', () => {
        expect(getRenderableProperties(undefined).size).toBe(0);
    });
});
