import { describe, expect, it } from 'vitest';
import type { ListViewModel } from 'types/listViews';
import { SortDirection } from 'types/listViews';
import {
    AttributeContentType,
    FilterConditionOperator,
    FilterFieldSource,
    FilterFieldType,
    Resource,
    type SearchFieldDataByGroupDto,
} from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import {
    MAX_VISIBLE_TABS,
    STANDARD_VIEW_ID,
    STANDARD_VIEW_NAME,
    duplicateName,
    isSliceDirty,
    resolveInitialViewId,
    resolveView,
    splitTabs,
    toColumnSort,
    toCreateRequest,
    toStandardSlice,
    toStorableFilters,
    toStoredColumns,
    toStoredColumnsKeepingUnavailable,
    toStoredSort,
    toTabs,
    toUpdateRequest,
    toViewSlice,
} from './listViews';

const view = (uuid: string, name: string, overrides: Partial<ListViewModel> = {}): ListViewModel => ({
    uuid,
    name,
    resource: Resource.Certificates,
    columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }],
    defaultView: false,
    ...overrides,
});

const field = (source: FilterFieldSource, identifier: string, label: string, overrides = {}): SourcedCatalogueField =>
    ({
        fieldSource: source,
        fieldIdentifier: identifier,
        fieldLabel: label,
        type: FilterFieldType.String,
        conditions: [],
        displayable: true,
        sortable: true,
        ...overrides,
    }) as SourcedCatalogueField;

const commonName = field(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name');
const costCentre = field(FilterFieldSource.Custom, 'cost_centre', 'Cost centre', { sortable: false });

const standardColumns: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS', catalogueLabel: 'Status' },
];

describe('toTabs', () => {
    it('puts Standard first and keeps the API order of the stored views', () => {
        const tabs = toTabs([view('a', 'Expiry watch'), view('b', 'Compliance audit')]);

        expect(tabs.map((tab) => tab.name)).toEqual([STANDARD_VIEW_NAME, 'Expiry watch', 'Compliance audit']);
        expect(tabs[0]).toMatchObject({ id: STANDARD_VIEW_ID, isStandard: true });
        expect(tabs[1]).toMatchObject({ id: 'a', isStandard: false });
    });

    it('pins Standard only while no stored view is pinned', () => {
        expect(toTabs([view('a', 'Expiry watch')])[0].isPinned).toBe(true);

        const withPinned = toTabs([view('a', 'Expiry watch'), view('b', 'Pinned', { defaultView: true })]);
        expect(withPinned[0].isPinned).toBe(false);
        expect(withPinned[2].isPinned).toBe(true);
    });

    it('offers Standard alone when the user has stored nothing', () => {
        expect(toTabs([])).toEqual([{ id: STANDARD_VIEW_ID, name: STANDARD_VIEW_NAME, isStandard: true, isPinned: true }]);
    });
});

describe('resolveInitialViewId', () => {
    it('opens the pinned view', () => {
        expect(resolveInitialViewId([view('a', 'One'), view('b', 'Two', { defaultView: true })])).toBe('b');
    });

    it('opens Standard when nothing is pinned', () => {
        expect(resolveInitialViewId([view('a', 'One')])).toBe(STANDARD_VIEW_ID);
        expect(resolveInitialViewId([])).toBe(STANDARD_VIEW_ID);
    });
});

describe('splitTabs', () => {
    const tabs = toTabs([1, 2, 3, 4, 5, 6, 7].map((n) => view(`v${n}`, `View ${n}`)));

    it('shows everything while the strip fits', () => {
        const split = splitTabs(tabs.slice(0, 3), STANDARD_VIEW_ID);
        expect(split.visible).toHaveLength(3);
        expect(split.overflow).toEqual([]);
    });

    it('rolls the remainder into the overflow at the cap', () => {
        const split = splitTabs(tabs, STANDARD_VIEW_ID);

        expect(split.visible).toHaveLength(MAX_VISIBLE_TABS);
        expect(split.overflow.map((tab) => tab.name)).toEqual(['View 5', 'View 6', 'View 7']);
    });

    it('pulls an overflowed active tab onto the strip, displacing the last visible one', () => {
        const split = splitTabs(tabs, 'v6');

        expect(split.visible.map((tab) => tab.name)).toEqual([STANDARD_VIEW_NAME, 'View 1', 'View 2', 'View 3', 'View 6']);
        expect(split.overflow.map((tab) => tab.name)).toEqual(['View 4', 'View 5', 'View 7']);
    });

    it('leaves the strip alone when the active tab is already visible', () => {
        expect(splitTabs(tabs, 'v2')).toEqual(splitTabs(tabs, STANDARD_VIEW_ID));
    });

    it('never collapses the strip to nothing', () => {
        expect(splitTabs(tabs, STANDARD_VIEW_ID, 0).visible).toHaveLength(1);
    });
});

describe('duplicateName', () => {
    it('appends (copy)', () => {
        expect(duplicateName('Expiry watch', [])).toBe('Expiry watch (copy)');
    });

    it('numbers the copy rather than stacking suffixes, because names are unique per resource', () => {
        expect(duplicateName('Expiry watch', ['Expiry watch (copy)'])).toBe('Expiry watch (copy) 2');
        expect(duplicateName('Expiry watch', ['Expiry watch (copy)', 'Expiry watch (copy) 2'])).toBe('Expiry watch (copy) 3');
    });
});

describe('sort conversion', () => {
    it('round-trips a stored sort through the table shape', () => {
        const stored = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Desc };

        expect(toColumnSort(stored)).toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: 'desc' });
        expect(toStoredSort(toColumnSort(stored))).toEqual(stored);
    });

    it('keeps an absent sort absent in both directions', () => {
        expect(toColumnSort(undefined)).toBeUndefined();
        expect(toStoredSort(undefined)).toBeUndefined();
    });

    it('reads anything that is not descending as ascending', () => {
        const stored = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER', direction: SortDirection.Asc };
        expect(toColumnSort(stored)?.direction).toBe('asc');
        expect(toStoredSort({ ...stored, direction: 'asc' })?.direction).toBe(SortDirection.Asc);
    });
});

describe('toStoredColumns', () => {
    it('stores only source, identifier and the heading override', () => {
        const columns: ColumnDefinition[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name', sortable: true },
            {
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'cost_centre',
                catalogueLabel: 'Cost centre',
                label: 'Owning team',
            },
        ];

        expect(toStoredColumns(columns)).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre', label: 'Owning team' },
        ]);
    });
});

describe('resolveView', () => {
    it('refreshes a resolved column from the catalogue and keeps the view label', () => {
        const resolved = resolveView(
            [{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre', label: 'Owning team' }],
            [costCentre],
            standardColumns,
        );

        expect(resolved.columns[0]).toMatchObject({
            catalogueLabel: 'Cost centre',
            label: 'Owning team',
            available: true,
            sortable: false,
        });
        expect(resolved.fellBackToStandard).toBe(false);
    });

    it('keeps a column whose field is gone in place, marked unavailable', () => {
        const resolved = resolveView(
            [
                { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre' },
            ],
            [commonName],
            standardColumns,
        );

        expect(resolved.columns).toHaveLength(2);
        expect(resolved.columns.filter((column) => !column.available).map((column) => column.fieldIdentifier)).toEqual(['cost_centre']);
        expect(resolved.renderable.map((column) => column.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect(resolved.fellBackToStandard).toBe(false);
    });

    it('names an unresolved column by its identifier, so an administrator can tell what it was', () => {
        const resolved = resolveView([{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre' }], [commonName], []);

        expect(resolved.columns[0].catalogueLabel).toBe('cost_centre');
    });

    it('falls back to the platform set when nothing resolved at all', () => {
        const resolved = resolveView([{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'gone' }], [], standardColumns);

        expect(resolved.fellBackToStandard).toBe(true);
        expect(resolved.renderable).toEqual(standardColumns);
    });

    it('falls back for a view that arrives with no columns at all', () => {
        // What the API returns once every field the view was built on has left the catalogue: it
        // resolves the stored identifiers on read and omits the ones it cannot offer. Rendering the
        // empty list literally would leave a table with no columns.
        const resolved = resolveView([], [commonName], standardColumns);

        expect(resolved.fellBackToStandard).toBe(true);
        expect(resolved.renderable).toEqual(standardColumns);
    });

    it('resolves a platform column the filter-field catalogue does not publish', () => {
        const resolved = resolveView([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS' }], [], standardColumns);

        expect(resolved.columns.every((column) => column.available)).toBe(true);
        expect(resolved.renderable[0].catalogueLabel).toBe('Status');
    });

    it('drops the availability marker the picker adds from the renderable columns', () => {
        const resolved = resolveView([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }], [commonName], []);

        expect(resolved.renderable[0]).not.toHaveProperty('available');
    });
});

describe('toViewSlice', () => {
    it('carries the columns, the filters and the ordering together', () => {
        const filters = [
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'COMMON_NAME',
                condition: FilterConditionOperator.Contains,
                value: 'acme',
            },
        ];
        const slice = toViewSlice(
            view('a', 'Expiry watch', {
                filters,
                sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Asc },
            }),
            [commonName],
            standardColumns,
        );

        expect(slice.columns.map((column) => column.fieldIdentifier)).toEqual(['COMMON_NAME']);
        expect(slice.filters).toEqual(filters);
        expect(slice.sort).toEqual({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' });
    });

    it('reads a view that stores no filters as filtering nothing', () => {
        expect(toViewSlice(view('a', 'Expiry watch'), [commonName], standardColumns).filters).toEqual([]);
    });
});

describe('toStandardSlice', () => {
    it('is the platform columns with no filters and no ordering of its own', () => {
        expect(toStandardSlice(standardColumns)).toEqual({ columns: standardColumns, filters: [], sort: undefined });
    });
});

describe('isSliceDirty', () => {
    const stored = toStandardSlice(standardColumns);

    it('reads an untouched slice as clean', () => {
        expect(isSliceDirty(stored, toStandardSlice(standardColumns))).toBe(false);
    });

    it('ignores catalogue detail the view does not store', () => {
        const refreshed = { ...stored, columns: standardColumns.map((column) => ({ ...column, sortable: true, multiValue: false })) };
        expect(isSliceDirty(stored, refreshed)).toBe(false);
    });

    it('sees a column added, removed, reordered or renamed', () => {
        expect(isSliceDirty(stored, { ...stored, columns: [standardColumns[0]] })).toBe(true);
        expect(isSliceDirty(stored, { ...stored, columns: [standardColumns[1], standardColumns[0]] })).toBe(true);
        expect(isSliceDirty(stored, { ...stored, columns: [{ ...standardColumns[0], label: 'Name' }, standardColumns[1]] })).toBe(true);
    });

    it('sees a filter change, because a view carries its filters', () => {
        const filtered = {
            ...stored,
            filters: [
                {
                    fieldSource: FilterFieldSource.Property,
                    fieldIdentifier: 'COMMON_NAME',
                    condition: FilterConditionOperator.Contains,
                    value: 'acme',
                },
            ],
        };

        expect(isSliceDirty(stored, filtered)).toBe(true);
        expect(isSliceDirty(filtered, filtered)).toBe(false);
    });

    it('sees the sort move and the sort direction flip', () => {
        const asc = { ...stored, sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' } };
        const desc = { ...asc, sort: { ...asc.sort, direction: 'desc' } };

        expect(isSliceDirty(stored, asc)).toBe(true);
        expect(isSliceDirty(asc, desc)).toBe(true);
        expect(isSliceDirty(asc, asc)).toBe(false);
    });
});

describe('toCreateRequest', () => {
    it('creates an unpinned view holding the slice', () => {
        const request = toCreateRequest('Expiry watch', Resource.Certificates, toStandardSlice(standardColumns));

        expect(request).toEqual({
            name: 'Expiry watch',
            resource: Resource.Certificates,
            columns: toStoredColumns(standardColumns),
            filters: [],
            sort: undefined,
            defaultView: false,
        });
    });

    it('can pin the view it creates', () => {
        expect(toCreateRequest('Expiry watch', Resource.Certificates, toStandardSlice(standardColumns), true).defaultView).toBe(true);
    });
});

describe('toUpdateRequest', () => {
    it('sends every field back, because the API replaces the whole row', () => {
        const stored = view('a', 'Expiry watch', {
            defaultView: true,
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Asc },
        });

        expect(toUpdateRequest(stored)).toEqual({
            name: 'Expiry watch',
            columns: stored.columns,
            filters: undefined,
            sort: stored.sort,
            defaultView: true,
        });
    });

    it('applies the patch over the stored row, so a rename keeps the columns', () => {
        const stored = view('a', 'Expiry watch');
        const renamed = toUpdateRequest(stored, { name: 'Expiry' });

        expect(renamed.name).toBe('Expiry');
        expect(renamed.columns).toEqual(stored.columns);
    });
});

describe('toStorableFilters', () => {
    const catalogue = [
        {
            filterFieldSource: FilterFieldSource.Property,
            searchFieldData: [{ fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', type: FilterFieldType.String, conditions: [] }],
        },
        {
            filterFieldSource: FilterFieldSource.Custom,
            searchFieldData: [
                {
                    fieldIdentifier: 'vaultToken',
                    fieldLabel: 'Vault Token',
                    type: FilterFieldType.String,
                    conditions: [],
                    attributeContentType: AttributeContentType.Secret,
                },
                {
                    fieldIdentifier: 'cost_centre',
                    fieldLabel: 'Cost centre',
                    type: FilterFieldType.String,
                    conditions: [],
                    attributeContentType: AttributeContentType.String,
                },
            ],
        },
    ] as unknown as SearchFieldDataByGroupDto[];

    const filter = (source: FilterFieldSource, identifier: string, value?: unknown) => ({
        fieldSource: source,
        fieldIdentifier: identifier,
        condition: FilterConditionOperator.Equals,
        ...(value === undefined ? {} : { value }),
    });

    it('drops a filter carrying a value typed against secret content', () => {
        const kept = toStorableFilters(
            [filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme'), filter(FilterFieldSource.Custom, 'vaultToken', 'hunter2')],
            catalogue,
        );

        expect(kept).toEqual([filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme')]);
    });

    it('keeps a presence-only condition on the same field, which carries nothing to leak', () => {
        const kept = toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken')], catalogue);

        expect(kept).toEqual([filter(FilterFieldSource.Custom, 'vaultToken')]);
    });

    it('treats an empty value as no value', () => {
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', '')], catalogue)).toHaveLength(1);
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', [])], catalogue)).toHaveLength(1);
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', ['hunter2'])], catalogue)).toHaveLength(0);
    });

    it('keys on the source as well as the identifier, so a property of the same name is untouched', () => {
        const kept = toStorableFilters([filter(FilterFieldSource.Property, 'vaultToken', 'not a secret here')], catalogue);

        expect(kept).toHaveLength(1);
    });

    it('leaves a catalogue with no secret field alone', () => {
        const filters = [filter(FilterFieldSource.Custom, 'cost_centre', '42')];

        expect(toStorableFilters(filters, [catalogue[0]])).toEqual(filters);
    });
});

describe('toStoredColumnsKeepingUnavailable', () => {
    const rendered: ColumnDefinition[] = [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS', catalogueLabel: 'Status' },
    ];

    it('puts an unavailable stored column back at the position it was stored at', () => {
        const resolved = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name', available: true },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', catalogueLabel: 'retired', available: false },
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS', catalogueLabel: 'Status', available: true },
        ];

        expect(toStoredColumnsKeepingUnavailable(rendered, resolved)).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired' },
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS' },
        ]);
    });

    it("carries an unavailable column's heading override with it", () => {
        const resolved = [
            {
                fieldSource: FilterFieldSource.Custom,
                fieldIdentifier: 'retired',
                catalogueLabel: 'retired',
                label: 'Retired at',
                available: false,
            },
        ];

        expect(toStoredColumnsKeepingUnavailable([], resolved)).toEqual([
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', label: 'Retired at' },
        ]);
    });

    it('is the plain stored shape when everything resolved', () => {
        const resolved = rendered.map((column) => ({ ...column, available: true }));

        expect(toStoredColumnsKeepingUnavailable(rendered, resolved)).toEqual(toStoredColumns(rendered));
    });
});
