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
    MAX_VIEW_NAME_LENGTH,
    MAX_VISIBLE_TABS,
    STANDARD_VIEW_ID,
    STANDARD_VIEW_NAME,
    duplicateName,
    goneAttributeKeys,
    isSliceDirty,
    newViewName,
    resolveInitialViewId,
    resolveView,
    splitTabs,
    toColumnSort,
    toCreateRequest,
    toStandardSlice,
    storableColumnTest,
    toStorableColumns,
    toStorableFilters,
    toStoredColumns,
    toStoredColumnsKeepingUnavailable,
    toStoredSort,
    toTabs,
    toUpdateRequest,
    toViewSlice,
    withoutMissingFieldFilters,
} from './listViews';
import { getColumnKey } from './tableColumns';

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

const standardCatalogue: SearchFieldDataByGroupDto[] = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [
            { fieldIdentifier: 'COMMON_NAME', fieldLabel: 'Common Name', type: FilterFieldType.String, conditions: [] },
            { fieldIdentifier: 'STATUS', fieldLabel: 'Status', type: FilterFieldType.List, conditions: [] },
        ],
    },
];

/** A filter-field catalogue in which one custom attribute holds secret content. */
const secretCatalogue = [
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

const schemaOf = (catalogue: SearchFieldDataByGroupDto[], standard: ColumnDefinition[] = standardColumns) => ({
    catalogue,
    standardColumns: standard,
});

const displayOnlyStatus: ColumnDefinition[] = [standardColumns[0], { ...standardColumns[1], displayOnly: true }];

const retired = { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired' };

const filter = (source: FilterFieldSource, identifier: string, value?: unknown) => ({
    fieldSource: source,
    fieldIdentifier: identifier,
    condition: FilterConditionOperator.Equals,
    ...(value === undefined ? {} : { value }),
});

const presence = (source: FilterFieldSource, identifier: string) => ({
    fieldSource: source,
    fieldIdentifier: identifier,
    condition: FilterConditionOperator.NotEmpty,
});

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

    it('numbers a duplicate of a duplicate into the same series', () => {
        const taken = ['test', 'test (copy)'];
        expect(duplicateName('test (copy)', taken)).toBe('test (copy) 2');
        expect(duplicateName('test (copy) 2', [...taken, 'test (copy) 2'])).toBe('test (copy) 3');
    });

    it('folds a name already stacked with copies back into the series', () => {
        expect(duplicateName('test (copy) (copy) 3 (copy)', ['test (copy)'])).toBe('test (copy) 2');
    });

    it('keeps a number that is not a copy counter', () => {
        expect(duplicateName('Batch 2', [])).toBe('Batch 2 (copy)');
    });

    it('numbers past a taken copy of the reserved Standard name', () => {
        expect(duplicateName('Standard (copy)', [STANDARD_VIEW_NAME, 'Standard (copy)'])).toBe('Standard (copy) 2');
    });

    it('shortens the stem so the name fits what Core stores', () => {
        const long = 'x'.repeat(MAX_VIEW_NAME_LENGTH);
        const first = duplicateName(long, []);
        expect(first).toHaveLength(MAX_VIEW_NAME_LENGTH);
        expect(first.endsWith(' (copy)')).toBe(true);

        const second = duplicateName(first, [first]);
        expect(second).toHaveLength(MAX_VIEW_NAME_LENGTH);
        expect(second.endsWith(' (copy) 2')).toBe(true);

        const third = duplicateName(second, [first, second]);
        expect(third).toBe(`${'x'.repeat(MAX_VIEW_NAME_LENGTH - ' (copy) 3'.length)} (copy) 3`);
    });

    it('restarts the series when the source number is too large to count past', () => {
        const huge = 'Report (copy) 100000000000000000000';
        expect(duplicateName(huge, [huge])).toBe('Report (copy)');
    });

    it('restarts the series instead of counting past the largest safe number', () => {
        const taken = [Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1].map(
            (suffix) => `Report (copy) ${suffix}`,
        );
        expect(duplicateName(taken[0], taken)).toBe('Report (copy)');
    });

    it('keeps advancing the series when the cut exposes a copy suffix inside the stem', () => {
        const stem = 'x'.repeat(MAX_VIEW_NAME_LENGTH - ' (copy)tail'.length - 3);
        const first = duplicateName(`${stem} (copy)tail`, []);
        expect(first).toBe(`${stem} (copy)`);
        expect(duplicateName(first, [first])).toBe(`${stem} (copy) 2`);
    });

    it('does not split a character that straddles the cut', () => {
        const name = duplicateName(`${'x'.repeat(MAX_VIEW_NAME_LENGTH - 8)}\u{1F600}`, []);
        expect(name).toBe(`${'x'.repeat(MAX_VIEW_NAME_LENGTH - 8)} (copy)`);
    });
});

describe('newViewName', () => {
    it('offers a neutral name that owes nothing to any existing view', () => {
        expect(newViewName(['Expiry watch', STANDARD_VIEW_NAME])).toBe('New view');
    });

    it('numbers the name once it is taken, because names are unique per resource', () => {
        expect(newViewName(['New view'])).toBe('New view 2');
        expect(newViewName(['New view', 'New view 2'])).toBe('New view 3');
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

    it('drops the availability marker from the renderable columns', () => {
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

    it('carries the ordering the page declares as its default', () => {
        const sort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Asc };

        expect(toStandardSlice(standardColumns, sort)).toEqual({ columns: standardColumns, filters: [], sort });
    });

    it('reads a page under its declared ordering as clean, so Standard is not born drifted', () => {
        const sort = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Asc };

        expect(isSliceDirty(toStandardSlice(standardColumns, sort), { columns: standardColumns, filters: [], sort }, 'standard')).toBe(
            false,
        );
    });
});

describe('isSliceDirty', () => {
    const stored = toStandardSlice(standardColumns);

    it('reads an untouched slice as clean', () => {
        expect(isSliceDirty(stored, toStandardSlice(standardColumns), 'view')).toBe(false);
    });

    it('ignores catalogue detail the view does not store', () => {
        const refreshed = { ...stored, columns: standardColumns.map((column) => ({ ...column, sortable: true, multiValue: false })) };
        expect(isSliceDirty(stored, refreshed, 'view')).toBe(false);
    });

    it('sees a column added, removed, reordered or renamed', () => {
        expect(isSliceDirty(stored, { ...stored, columns: [standardColumns[0]] }, 'view')).toBe(true);
        expect(isSliceDirty(stored, { ...stored, columns: [standardColumns[1], standardColumns[0]] }, 'view')).toBe(true);
        expect(isSliceDirty(stored, { ...stored, columns: [{ ...standardColumns[0], label: 'Name' }, standardColumns[1]] }, 'view')).toBe(
            true,
        );
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

        expect(isSliceDirty(stored, filtered, 'view')).toBe(true);
        expect(isSliceDirty(filtered, filtered, 'view')).toBe(false);
    });

    it('ignores a display-only column against a stored view, which never stores one, but not against Standard', () => {
        const shown = {
            ...stored,
            columns: [
                ...stored.columns,
                {
                    fieldSource: FilterFieldSource.Property,
                    fieldIdentifier: 'CK_ASSOCIATIONS',
                    catalogueLabel: 'Associations',
                    displayOnly: true,
                },
            ],
        };

        expect(isSliceDirty(stored, shown, 'view')).toBe(false);
        expect(isSliceDirty(stored, shown, 'standard')).toBe(true);
    });

    it('reads a view that fell back to a platform set with a display-only column as clean', () => {
        const fallback = {
            ...stored,
            columns: [
                ...stored.columns,
                {
                    fieldSource: FilterFieldSource.Property,
                    fieldIdentifier: 'CK_ASSOCIATIONS',
                    catalogueLabel: 'Associations',
                    displayOnly: true,
                },
            ],
        };

        expect(isSliceDirty(fallback, fallback, 'view')).toBe(false);
    });

    it('sees the sort move and the sort direction flip', () => {
        const asc = { ...stored, sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'asc' } };
        const desc = { ...asc, sort: { ...asc.sort, direction: 'desc' } };

        expect(isSliceDirty(stored, asc, 'view')).toBe(true);
        expect(isSliceDirty(asc, desc, 'view')).toBe(true);
        expect(isSliceDirty(asc, asc, 'view')).toBe(false);
    });
});

describe('toCreateRequest', () => {
    it('creates an unpinned view holding the slice', () => {
        const request = toCreateRequest(
            'Expiry watch',
            Resource.Certificates,
            toStandardSlice(standardColumns),
            schemaOf(standardCatalogue),
        );

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
        expect(
            toCreateRequest('Expiry watch', Resource.Certificates, toStandardSlice(standardColumns), schemaOf(standardCatalogue), true)
                .defaultView,
        ).toBe(true);
    });

    it('keeps a platform column the published catalogue leaves out, which Core still accepts', () => {
        const request = toCreateRequest(
            'Standard (copy)',
            Resource.Certificates,
            toStandardSlice(standardColumns),
            schemaOf(secretCatalogue),
        );

        expect(request.columns).toEqual(toStoredColumns(standardColumns));
    });

    it('drops a display-only platform column, so duplicating Standard succeeds', () => {
        const request = toCreateRequest(
            'Standard (copy)',
            Resource.Certificates,
            toStandardSlice(displayOnlyStatus),
            schemaOf(secretCatalogue, displayOnlyStatus),
        );

        expect(request.columns).toEqual([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }]);
    });

    it('drops a column whose field is gone, because Core holds a new row to the live catalogue', () => {
        const slice = { columns: [standardColumns[0], { ...retired, catalogueLabel: 'retired' }], filters: [] };

        expect(toCreateRequest('Copy', Resource.Certificates, slice, schemaOf(secretCatalogue)).columns).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        ]);
    });

    it('drops an attribute filter whose field is gone and keeps a property filter the catalogue leaves out', () => {
        const slice = {
            columns: standardColumns,
            filters: [filter(FilterFieldSource.Property, 'CERTIFICATE_STATE', 'issued'), filter(FilterFieldSource.Custom, 'retired', 'x')],
        };

        expect(toCreateRequest('Copy', Resource.Certificates, slice, schemaOf(secretCatalogue)).filters).toEqual([
            filter(FilterFieldSource.Property, 'CERTIFICATE_STATE', 'issued'),
        ]);
    });

    it('drops a secret-valued filter, which storage would not protect', () => {
        const slice = {
            columns: standardColumns,
            filters: [filter(FilterFieldSource.Custom, 'vaultToken', 'hunter2')],
        };

        expect(toCreateRequest('Expiry watch', Resource.Certificates, slice, schemaOf(secretCatalogue)).filters).toEqual([]);
    });
});

describe('toUpdateRequest', () => {
    const schema = schemaOf(secretCatalogue);

    it('sends every field back, because the API replaces the whole row', () => {
        const stored = view('a', 'Expiry watch', {
            defaultView: true,
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: SortDirection.Asc },
        });

        expect(toUpdateRequest(stored, schema)).toEqual({
            name: 'Expiry watch',
            columns: stored.columns,
            filters: [],
            sort: stored.sort,
            defaultView: true,
        });
    });

    it('applies the patch over the stored row, so a rename keeps the columns', () => {
        const stored = view('a', 'Expiry watch');
        const renamed = toUpdateRequest(stored, schema, { name: 'Expiry' });

        expect(renamed.name).toBe('Expiry');
        expect(renamed.columns).toEqual(stored.columns);
    });

    it.each([
        ['a rename', { name: 'Expiry' }],
        ['a pin', { defaultView: true }],
        ['a column edit', { columns: [] }],
    ])('drops a stored secret-valued filter on %s, which never names the filters', (_, patch) => {
        const stored = view('a', 'Expiry watch', {
            filters: [filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme'), filter(FilterFieldSource.Custom, 'vaultToken', 'hunter2')],
        });

        expect(toUpdateRequest(stored, schema, patch).filters).toEqual([filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme')]);
    });

    it('drops a secret-valued filter the patch itself supplies', () => {
        const stored = view('a', 'Expiry watch');
        const patched = toUpdateRequest(stored, schema, { filters: [filter(FilterFieldSource.Custom, 'vaultToken', 'hunter2')] });

        expect(patched.filters).toEqual([]);
    });

    it('keeps a presence-only condition on the secret field, which carries nothing to leak', () => {
        const stored = view('a', 'Expiry watch', { filters: [filter(FilterFieldSource.Custom, 'vaultToken')] });

        expect(toUpdateRequest(stored, schema).filters).toEqual([filter(FilterFieldSource.Custom, 'vaultToken')]);
    });

    it.each([
        ['a rename', { name: 'Expiry' }],
        ['a pin', { defaultView: true }],
    ])('keeps a stored column whose field is gone on %s, so it returns when the field does', (_, patch) => {
        const stored = view('a', 'Expiry watch', {
            columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }, retired],
        });

        expect(toUpdateRequest(stored, schema, patch).columns).toEqual(stored.columns);
    });

    it('keeps a stored presence filter whose field is gone, which Core accepts from the row that holds it', () => {
        const stored = view('a', 'Expiry watch', { filters: [presence(FilterFieldSource.Custom, 'retired')] });

        expect(toUpdateRequest(stored, schema, { name: 'Expiry' }).filters).toEqual([presence(FilterFieldSource.Custom, 'retired')]);
    });

    it('drops a stored valued filter whose field is gone on a rename, since it may be secret content', () => {
        const stored = view('a', 'Expiry watch', { filters: [filter(FilterFieldSource.Custom, 'retired', 'x')] });

        expect(toUpdateRequest(stored, schema, { name: 'Expiry' }).filters).toEqual([]);
    });

    it('drops a filter whose field is gone that the patch changes, which Core refuses for this row', () => {
        const stored = view('a', 'Expiry watch', { filters: [presence(FilterFieldSource.Custom, 'retired')] });
        const patched = toUpdateRequest(stored, schema, {
            filters: [{ ...presence(FilterFieldSource.Custom, 'retired'), condition: FilterConditionOperator.Empty }],
        });

        expect(patched.filters).toEqual([]);
    });

    it('drops a filter whose field is gone that the patch introduces, which Core refuses for this row', () => {
        const stored = view('a', 'Expiry watch', { filters: [presence(FilterFieldSource.Custom, 'retired')] });
        const patched = toUpdateRequest(stored, schema, {
            filters: [presence(FilterFieldSource.Custom, 'retired'), presence(FilterFieldSource.Custom, 'deleted')],
        });

        expect(patched.filters).toEqual([presence(FilterFieldSource.Custom, 'retired')]);
    });

    it('drops a column whose field is gone that the patch introduces, and keeps the one the row held', () => {
        const nameColumn = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' };
        const stored = view('a', 'Expiry watch', { columns: [nameColumn, retired] });
        const patched = toUpdateRequest(stored, schema, {
            columns: [nameColumn, retired, { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'deleted' }],
        });

        expect(patched.columns).toEqual([nameColumn, retired]);
    });

    it('keeps a platform column the published catalogue leaves out in a patch', () => {
        const patched = toUpdateRequest(view('a', 'Expiry watch'), schema, { columns: toStoredColumns(standardColumns) });

        expect(patched.columns).toEqual(toStoredColumns(standardColumns));
    });

    it('drops a display-only column from a patch', () => {
        const patched = toUpdateRequest(view('a', 'Expiry watch'), schemaOf(secretCatalogue, displayOnlyStatus), {
            columns: toStoredColumns(displayOnlyStatus),
        });

        expect(patched.columns).toEqual([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }]);
    });
});

describe('storableColumnTest', () => {
    const isStorable = storableColumnTest(schemaOf(secretCatalogue, displayOnlyStatus));

    it('counts a published column and a platform column the catalogue leaves out', () => {
        expect(isStorable({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre' })).toBe(true);
        expect(isStorable(standardColumns[0])).toBe(true);
    });

    it('does not count a display-only column or one whose field is gone, since a create drops both', () => {
        expect(isStorable(displayOnlyStatus[1])).toBe(false);
        expect(isStorable(retired)).toBe(false);
    });

    it('counts every column while the catalogue has not arrived', () => {
        expect(storableColumnTest(schemaOf([]))(retired)).toBe(true);
    });
});

describe('toStorableColumns', () => {
    const schema = schemaOf(secretCatalogue);

    it.each([
        ['a create', []],
        ['an update', [retired]],
    ])('keeps a column the catalogue carries on %s', (_, held) => {
        expect(toStorableColumns([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }], schema, held)).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        ]);
    });

    it('keeps a column the catalogue carries but the listing cannot display', () => {
        expect(toStorableColumns([{ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'vaultToken' }], schema, [])).toEqual([
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'vaultToken' },
        ]);
    });

    it.each([
        ['a create', []],
        ['an update', [retired]],
    ])('keeps a platform column the published catalogue leaves out on %s', (_, held) => {
        expect(toStorableColumns([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS' }], schema, held)).toEqual([
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS' },
        ]);
    });

    it.each([
        ['a create', []],
        ['an update', [retired]],
    ])('drops a display-only platform column on %s, which the API would reject', (_, held) => {
        expect(
            toStorableColumns(
                [
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
                    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'STATUS' },
                ],
                schemaOf(secretCatalogue, displayOnlyStatus),
                held,
            ),
        ).toEqual([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }]);
    });

    it('keeps a column whose field is gone when the stored row holds it, in its stored position', () => {
        const columns = [retired, { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }];

        expect(toStorableColumns(columns, schema, [retired])).toEqual(columns);
    });

    it('drops a column whose field is gone when the stored row does not hold it, as on a create', () => {
        expect(toStorableColumns([retired], schema, [])).toEqual([]);
    });

    it('drops a column whose field is gone that an update introduces, and keeps the one the row held', () => {
        const introduced = { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'deleted' };

        expect(toStorableColumns([retired, introduced], schema, [retired])).toEqual([retired]);
    });

    it('matches a held column on its source as well as its identifier', () => {
        expect(toStorableColumns([retired], schema, [{ ...retired, fieldSource: FilterFieldSource.Meta }])).toEqual([]);
    });

    it('separates two sources publishing one identifier', () => {
        expect(toStorableColumns([{ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'COMMON_NAME' }], schema, [])).toEqual([]);
    });

    it('keeps the heading override on a column it keeps', () => {
        expect(
            toStorableColumns([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', label: 'Name' }], schema, []),
        ).toEqual([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', label: 'Name' }]);
    });

    it('leaves everything alone when the catalogue has not arrived, rather than emptying the view', () => {
        const columns = [retired];
        expect(toStorableColumns(columns, schemaOf([]), [])).toEqual(columns);
    });
});

describe('withoutMissingFieldFilters', () => {
    it('drops an attribute filter on a field the catalogue no longer publishes and keeps the rest', () => {
        const filters = [
            filter(FilterFieldSource.Property, 'CERTIFICATE_STATE', 'issued'),
            filter(FilterFieldSource.Custom, 'cost_centre', '42'),
            filter(FilterFieldSource.Custom, 'retired', 'x'),
        ];

        expect(withoutMissingFieldFilters(filters, secretCatalogue)).toEqual(filters.slice(0, 2));
    });

    it('drops nothing while the catalogue has not arrived', () => {
        const filters = [filter(FilterFieldSource.Custom, 'retired', 'x')];

        expect(withoutMissingFieldFilters(filters, [])).toEqual(filters);
    });
});

describe('toStorableFilters', () => {
    const catalogue = secretCatalogue;

    it('drops a filter carrying a value typed against secret content', () => {
        const kept = toStorableFilters(
            [filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme'), filter(FilterFieldSource.Custom, 'vaultToken', 'hunter2')],
            catalogue,
            [],
        );

        expect(kept).toEqual([filter(FilterFieldSource.Property, 'COMMON_NAME', 'acme')]);
    });

    it('keeps a presence-only condition on the same field, which carries nothing to leak', () => {
        const kept = toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken')], catalogue, []);

        expect(kept).toEqual([filter(FilterFieldSource.Custom, 'vaultToken')]);
    });

    it('treats an empty value as no value', () => {
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', '')], catalogue, [])).toHaveLength(1);
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', [])], catalogue, [])).toHaveLength(1);
        expect(toStorableFilters([filter(FilterFieldSource.Custom, 'vaultToken', ['hunter2'])], catalogue, [])).toHaveLength(0);
    });

    it('keys on the source as well as the identifier, so a property of the same name is untouched', () => {
        const kept = toStorableFilters([filter(FilterFieldSource.Property, 'vaultToken', 'not a secret here')], catalogue, []);

        expect(kept).toHaveLength(1);
    });

    it('leaves a catalogue with no secret field alone', () => {
        const filters = [filter(FilterFieldSource.Custom, 'cost_centre', '42')];

        const withoutSecret = [{ ...catalogue[1], searchFieldData: catalogue[1].searchFieldData?.slice(1) }];

        expect(toStorableFilters(filters, withoutSecret, [])).toEqual(filters);
    });

    it('keeps a presence filter whose field is gone when the stored row holds that exact filter', () => {
        const filters = [presence(FilterFieldSource.Custom, 'retired')];

        expect(toStorableFilters(filters, catalogue, filters)).toEqual(filters);
    });

    it('drops a filter whose field is gone once its condition differs from the one stored, which Core refuses', () => {
        const edited = { ...presence(FilterFieldSource.Custom, 'retired'), condition: FilterConditionOperator.Empty };

        expect(toStorableFilters([edited], catalogue, [presence(FilterFieldSource.Custom, 'retired')])).toEqual([]);
    });

    it('drops a valued filter whose field is gone although the stored row holds it, since its content may be a secret', () => {
        const filters = [filter(FilterFieldSource.Custom, 'retired', 'y')];

        expect(toStorableFilters(filters, catalogue, filters)).toEqual([]);
    });

    it('keeps a valued attribute filter while the catalogue has not arrived', () => {
        const filters = [filter(FilterFieldSource.Custom, 'retired', 'y')];

        expect(toStorableFilters(filters, [], filters)).toEqual(filters);
    });

    it('drops a filter whose field is gone when the stored row does not filter on it', () => {
        const kept = toStorableFilters(
            [presence(FilterFieldSource.Custom, 'retired'), presence(FilterFieldSource.Custom, 'deleted')],
            catalogue,
            [presence(FilterFieldSource.Custom, 'retired')],
        );

        expect(kept).toEqual([presence(FilterFieldSource.Custom, 'retired')]);
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

    it('does not put back an unavailable column the table is rendering again', () => {
        const withReturned = [
            ...rendered,
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', catalogueLabel: 'Retired' },
        ];
        const resolved = [
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'retired', catalogueLabel: 'retired', available: false },
            ...rendered.map((column) => ({ ...column, available: true })),
        ];

        expect(toStoredColumnsKeepingUnavailable(withReturned, resolved)).toEqual(toStoredColumns(withReturned));
    });

    it('is the plain stored shape when everything resolved', () => {
        const resolved = rendered.map((column) => ({ ...column, available: true }));

        expect(toStoredColumnsKeepingUnavailable(rendered, resolved)).toEqual(toStoredColumns(rendered));
    });
});

describe('goneAttributeKeys', () => {
    const catalogue: SearchFieldDataByGroupDto[] = [
        ...standardCatalogue,
        {
            filterFieldSource: FilterFieldSource.Custom,
            searchFieldData: [{ fieldIdentifier: 'cost_centre', fieldLabel: 'Cost centre', type: FilterFieldType.String, conditions: [] }],
        },
    ];

    it('names each attribute column a stored view holds whose field the catalogue no longer publishes, once', () => {
        const views = [
            view('a', 'One', { columns: [retired, { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'cost_centre' }] }),
            view('b', 'Two', { columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' }, retired] }),
        ];

        expect(goneAttributeKeys(views, catalogue)).toEqual([getColumnKey(retired)]);
    });

    it('leaves out a platform column the catalogue does not publish, which is not an attribute', () => {
        const views = [view('a', 'One', { columns: [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CERTIFICATE_TYPE' }] })];

        expect(goneAttributeKeys(views, catalogue)).toEqual([]);
    });

    it('names nothing against an empty catalogue, which has not arrived rather than lost every field', () => {
        expect(goneAttributeKeys([view('a', 'One', { columns: [retired] })], [])).toEqual([]);
    });
});
