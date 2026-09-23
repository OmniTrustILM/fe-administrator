import { describe, expect, it } from 'vitest';
import type { SearchFieldListModel } from 'types/certificate';
import { FilterFieldSource, SortDirection } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import {
    buildListRequest,
    getRenderableProperties,
    isSameSort,
    toColumnSortFromHeader,
    toDisplayableSort,
    renameColumn,
    toProjectedKeys,
    toggleColumn,
    withCatalogueSortability,
    withDeclaredSortability,
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

    it('leaves a column the catalogue cannot order on unsortable', () => {
        expect(withCatalogueSortability(standard, catalogue)[1].sortable).not.toBe(true);
    });

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

    it('keeps every display property the page shipped', () => {
        const shipped: ColumnDefinition[] = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'COMMON_NAME',
                catalogueLabel: 'Common Name',
                align: 'center',
            },
        ];

        expect(withCatalogueSortability(shipped, catalogue)[0]).toEqual({ ...shipped[0], sortable: true });
    });

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

    it('leaves the set alone when the catalogue has not published anything', () => {
        const merged = withCatalogueSortability(standard, []);

        expect(merged[0]).toBe(standard[0]);
        expect(merged[1]).toBe(standard[1]);
    });
});

describe('withDeclaredSortability', () => {
    const standard: ColumnDefinition[] = [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_NAME', catalogueLabel: 'Name' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_URL', catalogueLabel: 'URL' },
    ];
    const sort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_NAME', direction: SortDirection.Asc };

    it('marks the column the page declared its ordering on as sortable', () => {
        expect(withDeclaredSortability(standard, sort)[0].sortable).toBe(true);
    });

    it('leaves every other column alone', () => {
        expect(withDeclaredSortability(standard, sort)[1]).toBe(standard[1]);
    });

    it('keeps the display properties the page shipped', () => {
        const shipped: ColumnDefinition[] = [{ ...standard[0], align: 'center', label: 'Connector' }];

        expect(withDeclaredSortability(shipped, sort)[0]).toEqual({ ...shipped[0], sortable: true });
    });

    it('returns the same set when the page declared no ordering', () => {
        expect(withDeclaredSortability(standard, undefined)).toBe(standard);
    });

    it('marks nothing when the declared ordering names no shipped column', () => {
        const missing = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_STATUS', direction: SortDirection.Asc };

        expect(withDeclaredSortability(standard, missing).some((column) => column.sortable === true)).toBe(false);
    });

    it('keeps the declared ordering displayable, so the first listing request carries it', () => {
        expect(toDisplayableSort(sort, withDeclaredSortability(standard, sort))).toEqual(sort);
    });
});

describe('toggleColumn', () => {
    const costCentre = {
        fieldSource: FilterFieldSource.Custom,
        fieldIdentifier: 'costCentre|STRING',
        fieldLabel: 'Cost centre',
        sortable: true,
    } as SourcedCatalogueField;

    const commonName = {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'COMMON_NAME',
        fieldLabel: 'Common Name',
        sortable: true,
    } as SourcedCatalogueField;

    it('puts a field the table is not showing first', () => {
        const next = toggleColumn(columns, costCentre);

        expect(next).toHaveLength(columns.length + 1);
        expect(next.at(0)).toEqual({
            fieldSource: FilterFieldSource.Custom,
            fieldIdentifier: 'costCentre|STRING',
            catalogueLabel: 'Cost centre',
            sortable: true,
            type: undefined,
            attributeContentType: undefined,
            multiValue: undefined,
        });
    });

    it('takes away a field the table is already showing', () => {
        expect(toggleColumn(columns, commonName).map((column) => column.fieldIdentifier)).toEqual(['CK_ASSOCIATIONS', 'department|STRING']);
    });

    it('keeps the last column standing, because the API rejects a view with none', () => {
        const only = [columns[0]];

        expect(toggleColumn(only, commonName)).toBe(only);
    });

    it('tells a field of one source from the same identifier under another', () => {
        const customCommonName = { ...commonName, fieldSource: FilterFieldSource.Custom } as SourcedCatalogueField;

        expect(toggleColumn(columns, customCommonName)).toHaveLength(columns.length + 1);
    });
});

describe('renameColumn', () => {
    const columns = [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING', catalogueLabel: 'Department' },
    ];

    it('overrides the heading of the named column alone', () => {
        const next = renameColumn(columns, 'property:COMMON_NAME', 'Host');

        expect(next[0]).toMatchObject({ fieldIdentifier: 'COMMON_NAME', label: 'Host' });
        expect(next[1]).not.toHaveProperty('label');
    });

    it('trims what it is given', () => {
        expect(renameColumn(columns, 'property:COMMON_NAME', '  Host  ')[0]).toMatchObject({ label: 'Host' });
    });

    it('clears the override when given nothing', () => {
        const overridden = renameColumn(columns, 'property:COMMON_NAME', 'Host');

        expect(renameColumn(overridden, 'property:COMMON_NAME', undefined)[0]).not.toHaveProperty('label');
    });

    it('clears it for an empty heading rather than storing one', () => {
        const overridden = renameColumn(columns, 'property:COMMON_NAME', 'Host');

        expect(renameColumn(overridden, 'property:COMMON_NAME', '   ')[0]).not.toHaveProperty('label');
    });

    it('stores no override for the name the catalogue already publishes, so a relabel carries through', () => {
        expect(renameColumn(columns, 'property:COMMON_NAME', 'Common Name')[0]).not.toHaveProperty('label');
    });
});

describe('toProjectedKeys', () => {
    it('keeps the attribute columns and drops the properties, because only attributes are projected', () => {
        const columns = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
            { fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'discoverySource|STRING' },
        ];

        expect(toProjectedKeys(columns)).toEqual(['custom:department|STRING', 'meta:discoverySource|STRING']);
    });

    it('sorts them, so a reorder does not read as a new set to fetch', () => {
        const columns = [
            { fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'b' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'a' },
        ];

        expect(toProjectedKeys(columns)).toEqual(toProjectedKeys([...columns].reverse()));
    });

    it('answers for a request that names no columns at all', () => {
        expect(toProjectedKeys(undefined)).toEqual([]);
    });
});
