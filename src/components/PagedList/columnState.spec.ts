import { describe, expect, it } from 'vitest';
import type { SearchFieldListModel } from 'types/certificate';
import { FilterFieldSource, SortDirection } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import {
    buildListRequest,
    getRenderableProperties,
    isSameSort,
    toColumnSortFromHeader,
    toDisplayableSort,
    withCatalogueSortability,
} from './columnState';

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

describe('buildListRequest', () => {
    const base = { itemsPerPage: 10, pageNumber: 1, filters: [] };

    // The Epic's compatibility guarantee (AC12): with no columns and no ordering the request must be
    // byte-identical to one written before the contract carried either field, so both are absent from
    // the object rather than present and empty.
    it('omits both new fields for a page that is not on the pipeline', () => {
        const request = buildListRequest(base);

        expect(request).toEqual(base);
        expect('columns' in request).toBe(false);
        expect('sort' in request).toBe(false);
    });

    it('omits both new fields for an empty column set and no ordering', () => {
        const request = buildListRequest(base, [], undefined);

        expect(request).toEqual(base);
        expect('columns' in request).toBe(false);
        expect('sort' in request).toBe(false);
    });

    it('names the displayed columns', () => {
        expect(buildListRequest(base, columns).columns).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CK_ASSOCIATIONS' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
        ]);
    });

    it("names the applied ordering in the contract's own direction enum", () => {
        const request = buildListRequest(base, columns, {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            direction: 'desc',
        });

        expect(request.sort).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            direction: SortDirection.Desc,
        });
    });

    it('keeps the paging and filters it was given', () => {
        const filtered = { itemsPerPage: 25, pageNumber: 3, filters: [] };

        expect(buildListRequest(filtered, columns)).toMatchObject(filtered);
    });
});

describe('toDisplayableSort', () => {
    const sortable = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' as const };

    it('keeps an ordering whose column is displayed and sortable', () => {
        expect(toDisplayableSort(sortable, columns)).toBe(sortable);
    });

    it('drops an ordering whose column a view switch or a column edit took away', () => {
        expect(toDisplayableSort({ ...sortable, fieldIdentifier: 'NOT_AFTER' }, columns)).toBeUndefined();
    });

    it('drops an ordering the catalogue says the column cannot carry', () => {
        expect(
            toDisplayableSort({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING', direction: 'asc' }, columns),
        ).toBeUndefined();
    });

    it('drops an ordering on a column with no sortable answer at all', () => {
        expect(
            toDisplayableSort({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CK_ASSOCIATIONS', direction: 'asc' }, columns),
        ).toBeUndefined();
    });

    it('separates one identifier under two sources', () => {
        expect(toDisplayableSort({ ...sortable, fieldSource: FilterFieldSource.Meta }, columns)).toBeUndefined();
    });

    it('is undefined for no ordering', () => {
        expect(toDisplayableSort(undefined, columns)).toBeUndefined();
    });
});

describe('withCatalogueSortability', () => {
    /** As a page ships it: no `sortable`, because a static literal cannot know what the API supports. */
    const standard: ColumnDefinition[] = [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CK_ASSOCIATIONS', catalogueLabel: 'Associations' },
    ];

    const catalogue = [
        {
            filterFieldSource: FilterFieldSource.Property,
            searchFieldData: [
                { fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Subject Common Name', sortable: true, displayable: true },
                { fieldIdentifier: 'CK_ASSOCIATIONS', fieldLabel: 'Associations', sortable: false, displayable: true },
            ],
        },
    ] as unknown as SearchFieldListModel[];

    it('marks a column the catalogue can order on as sortable', () => {
        expect(withCatalogueSortability(standard, catalogue)[0].sortable).toBe(true);
    });

    /**
     * Asserted as "not sortable" rather than as `false`: absent and `false` are the same answer to
     * every reader of the flag, both being `sortable === true` failures, so the merge leaves an
     * already-unsortable column alone rather than writing `false` over its absence.
     */
    it('leaves a column the catalogue cannot order on unsortable', () => {
        expect(withCatalogueSortability(standard, catalogue)[1].sortable).not.toBe(true);
    });

    /** Absent is not the same as false, and the safe reading of an unpublished field is unsortable. */
    it('treats a column the catalogue does not publish as unsortable', () => {
        const unpublished = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'PRIVATE_KEY', catalogueLabel: 'Has private key' },
        ];

        expect(withCatalogueSortability(unpublished, catalogue)[0].sortable).not.toBe(true);
    });

    it('withdraws a stale sortable flag the catalogue no longer supports', () => {
        const stale = [{ ...standard[1], sortable: true }];

        expect(withCatalogueSortability(stale, catalogue)[0].sortable).toBe(false);
    });

    /**
     * The page's display choices are not the catalogue's business. Taking the catalogue's label here
     * would rename the headings of a tab nobody edited - `COMMON_NAME` is published as "Subject Common
     * Name" above, while the page ships "Common Name".
     */
    it('keeps every display property the page shipped', () => {
        const shipped: ColumnDefinition[] = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'COMMON_NAME',
                catalogueLabel: 'Common Name',
                align: 'center',
                headingHidden: true,
            },
        ];

        expect(withCatalogueSortability(shipped, catalogue)[0]).toEqual({ ...shipped[0], sortable: true });
    });

    /** Whether the API can order by a field is a separate question from whether the picker offers it. */
    it('takes sortability from a field the catalogue does not offer as a column', () => {
        const hidden = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [{ fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', sortable: true, displayable: false }],
            },
        ] as unknown as SearchFieldListModel[];

        expect(withCatalogueSortability(standard, hidden)[0].sortable).toBe(true);
    });

    it('returns the column unchanged when the flag already agrees, so a memo can rest on its identity', () => {
        const agreed: ColumnDefinition[] = [{ ...standard[0], sortable: true }];
        const merged = withCatalogueSortability(agreed, catalogue);

        expect(merged[0]).toBe(agreed[0]);
    });

    /** Nothing published means nothing to merge, so the columns come back as they went in. */
    it('leaves the set alone when the catalogue has not published anything', () => {
        const merged = withCatalogueSortability(standard, []);

        expect(merged[0]).toBe(standard[0]);
        expect(merged[1]).toBe(standard[1]);
    });
});
