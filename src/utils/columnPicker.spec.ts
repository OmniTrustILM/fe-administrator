import { describe, expect, it } from 'vitest';
import { AttributeContentType, FilterFieldSource, FilterFieldType, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import {
    COLUMN_COUNT_WARNING_FROM,
    MAX_COLUMNS,
    getCounterState,
    groupCatalogueFields,
    isColumnSelected,
    isSameResolution,
    moveColumn,
    resolveColumns,
    toCatalogueFields,
    toColumnDefinition,
} from './columnPicker';

const field = (overrides: Partial<SourcedCatalogueField> = {}): SourcedCatalogueField =>
    ({
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'COMMON_NAME',
        fieldLabel: 'Common Name',
        type: FilterFieldType.String,
        conditions: [],
        displayable: true,
        sortable: true,
        ...overrides,
    }) as SourcedCatalogueField;

const catalogue: SearchFieldDataByGroupDto[] = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [
            {
                fieldIdentifier: 'COMMON_NAME',
                fieldLabel: 'Common Name',
                type: FilterFieldType.String,
                conditions: [],
                displayable: true,
                sortable: true,
            },
            {
                fieldIdentifier: 'FINGERPRINT',
                fieldLabel: 'Fingerprint',
                type: FilterFieldType.String,
                conditions: [],
                displayable: false,
                sortable: true,
            },
        ] as SearchFieldDataByGroupDto['searchFieldData'],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        searchFieldData: [
            {
                fieldIdentifier: 'costCentre',
                fieldLabel: 'Cost centre',
                type: FilterFieldType.Number,
                conditions: [],
                attributeContentType: AttributeContentType.Integer,
                displayable: true,
                sortable: false,
            },
        ] as SearchFieldDataByGroupDto['searchFieldData'],
    },
    { filterFieldSource: FilterFieldSource.Meta, searchFieldData: undefined },
];

describe('toCatalogueFields', () => {
    it('flattens the catalogue and stamps each field with the source it was published under', () => {
        expect(toCatalogueFields(catalogue).map((f) => [f.fieldSource, f.fieldIdentifier])).toEqual([
            [FilterFieldSource.Property, 'COMMON_NAME'],
            [FilterFieldSource.Custom, 'costCentre'],
        ]);
    });

    it('offers only fields the catalogue marks displayable', () => {
        expect(toCatalogueFields(catalogue).some((f) => f.fieldIdentifier === 'FINGERPRINT')).toBe(false);
    });

    it('treats a field with no displayable flag as not offerable, rather than guessing', () => {
        const groups = [
            {
                filterFieldSource: FilterFieldSource.Property,
                searchFieldData: [{ fieldIdentifier: 'X', fieldLabel: 'X', type: FilterFieldType.String, conditions: [] }],
            },
        ];
        expect(toCatalogueFields(groups as SearchFieldDataByGroupDto[])).toEqual([]);
    });

    it('survives a source that publishes no fields', () => {
        expect(toCatalogueFields([{ filterFieldSource: FilterFieldSource.Meta }])).toEqual([]);
    });

    it('returns nothing for an empty catalogue', () => {
        expect(toCatalogueFields([])).toEqual([]);
    });
});

describe('groupCatalogueFields', () => {
    const fields = [
        field(),
        field({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SERIAL_NUMBER', fieldLabel: 'Serial Number' }),
        field({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre', fieldLabel: 'Cost centre' }),
    ];

    it('groups fields by source, in a stable source order', () => {
        expect(groupCatalogueFields(fields, '').map((group) => group.source)).toEqual([
            FilterFieldSource.Property,
            FilterFieldSource.Custom,
        ]);
    });

    it('drops a group left with no fields, so no empty heading is rendered', () => {
        expect(groupCatalogueFields(fields, 'cost').map((group) => group.source)).toEqual([FilterFieldSource.Custom]);
    });

    it('searches across every source, case-insensitively', () => {
        expect(groupCatalogueFields(fields, 'NUMBER').flatMap((g) => g.fields.map((f) => f.fieldIdentifier))).toEqual(['SERIAL_NUMBER']);
    });

    it('matches the field identifier as well as the label, so a stored identifier can be found', () => {
        expect(groupCatalogueFields(fields, 'costcentre').flatMap((g) => g.fields.map((f) => f.fieldIdentifier))).toEqual(['costCentre']);
    });

    it('ignores surrounding whitespace in the search term', () => {
        expect(groupCatalogueFields(fields, '  cost  ').flatMap((g) => g.fields)).toHaveLength(1);
    });

    it('returns every group for an empty search', () => {
        expect(groupCatalogueFields(fields, '').flatMap((g) => g.fields)).toHaveLength(3);
    });

    it('returns nothing when the search matches no field', () => {
        expect(groupCatalogueFields(fields, 'nothing matches this')).toEqual([]);
    });
});

describe('toColumnDefinition', () => {
    it('carries the catalogue label, type and sortability onto the column', () => {
        expect(toColumnDefinition(field({ sortable: false, attributeContentType: AttributeContentType.Integer }))).toEqual({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'COMMON_NAME',
            catalogueLabel: 'Common Name',
            type: FilterFieldType.String,
            attributeContentType: AttributeContentType.Integer,
            sortable: false,
            multiValue: undefined,
        });
    });

    it('reports a field with no sortable flag as not sortable', () => {
        expect(toColumnDefinition(field({ sortable: undefined })).sortable).toBe(false);
    });

    it('sets no label override, so a newly added column follows the catalogue', () => {
        expect(toColumnDefinition(field()).label).toBeUndefined();
    });
});

describe('isColumnSelected', () => {
    const selected: ColumnDefinition[] = [
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre', catalogueLabel: 'Cost centre' },
    ];

    it('matches on source and identifier together', () => {
        expect(isColumnSelected(selected, field({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre' }))).toBe(true);
    });

    it('does not match the same identifier under a different source', () => {
        expect(isColumnSelected(selected, field({ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'costCentre' }))).toBe(false);
    });
});

describe('resolveColumns', () => {
    const fields = [field(), field({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre', fieldLabel: 'Cost centre' })];

    const stored: ColumnDefinition[] = [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'stale label' },
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'gone', catalogueLabel: 'Gone', label: 'Was renamed' },
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre', catalogueLabel: 'Cost centre' },
    ];

    it('keeps every stored column, in its stored position', () => {
        expect(resolveColumns(stored, fields).map((column) => column.fieldIdentifier)).toEqual(['COMMON_NAME', 'gone', 'costCentre']);
    });

    it('marks a column whose field the catalogue no longer publishes as unavailable', () => {
        expect(resolveColumns(stored, fields).map((column) => column.available)).toEqual([true, false, true]);
    });

    it('refreshes a resolved column from the live catalogue, so a relabelled field carries through', () => {
        expect(resolveColumns(stored, fields)[0].catalogueLabel).toBe('Common Name');
    });

    it('keeps a per-view label override across the refresh', () => {
        const withOverride = [{ ...stored[0], label: 'Host' }];
        expect(resolveColumns(withOverride, fields)[0]).toMatchObject({ label: 'Host', catalogueLabel: 'Common Name' });
    });

    it('leaves an unavailable column exactly as it was stored, since nothing can refresh it', () => {
        expect(resolveColumns(stored, fields)[1]).toMatchObject({ catalogueLabel: 'Gone', label: 'Was renamed', available: false });
    });

    it('resolves nothing for no stored columns', () => {
        expect(resolveColumns([], fields)).toEqual([]);
    });

    it('marks everything unavailable when the catalogue is empty', () => {
        expect(resolveColumns(stored, []).every((column) => !column.available)).toBe(true);
    });

    /**
     * A platform default column can be absent from the filter-field catalogue and still renderable —
     * the keys inventory ships three such columns. Marking those unavailable would drop them from the
     * view on the next save.
     */
    it('keeps a platform column the catalogue does not publish available', () => {
        const platform: ColumnDefinition[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CKI_ENABLED', catalogueLabel: 'Status', align: 'center' },
        ];

        expect(resolveColumns(platform, fields, platform)[0]).toMatchObject({
            catalogueLabel: 'Status',
            align: 'center',
            available: true,
        });
    });

    it('still marks an unknown column unavailable when a standard set is given', () => {
        const platform: ColumnDefinition[] = [
            { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CKI_ENABLED', catalogueLabel: 'Status' },
        ];

        expect(resolveColumns(stored, fields, platform).map((column) => column.available)).toEqual([true, false, true]);
    });

    it('keeps alignment the catalogue does not carry while refreshing what it does', () => {
        const aligned = [{ ...stored[0], align: 'center' as const }];

        expect(resolveColumns(aligned, fields)[0]).toMatchObject({ align: 'center', catalogueLabel: 'Common Name' });
    });
});

describe('isSameResolution', () => {
    const resolved = () =>
        resolveColumns([{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'x' }], [field()]);

    it('reports two separately built but equal resolutions as the same', () => {
        expect(isSameResolution(resolved(), resolved())).toBe(true);
    });

    it('reports a different length as different', () => {
        expect(isSameResolution(resolved(), [])).toBe(false);
    });

    it('reports a changed property as different', () => {
        const changed = resolved().map((column) => ({ ...column, catalogueLabel: 'Renamed' }));
        expect(isSameResolution(resolved(), changed)).toBe(false);
    });

    it('reports an added property as different', () => {
        const changed = resolved().map((column) => ({ ...column, label: 'Override' }));
        expect(isSameResolution(resolved(), changed)).toBe(false);
    });
});

describe('moveColumn', () => {
    const columns = ['a', 'b', 'c', 'd'].map((id) => ({
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: id,
        catalogueLabel: id,
    }));
    const ids = (result: ColumnDefinition[]) => result.map((column) => column.fieldIdentifier);

    it('moves a column later in the order', () => {
        expect(ids(moveColumn(columns, 0, 2))).toEqual(['b', 'c', 'a', 'd']);
    });

    it('moves a column earlier in the order', () => {
        expect(ids(moveColumn(columns, 3, 1))).toEqual(['a', 'd', 'b', 'c']);
    });

    it('leaves the order alone when a column is moved onto itself', () => {
        expect(ids(moveColumn(columns, 2, 2))).toEqual(['a', 'b', 'c', 'd']);
    });

    it('clamps a target past the end rather than dropping the column', () => {
        expect(ids(moveColumn(columns, 0, 99))).toEqual(['b', 'c', 'd', 'a']);
    });

    it('clamps a target before the start', () => {
        expect(ids(moveColumn(columns, 2, -5))).toEqual(['c', 'a', 'b', 'd']);
    });

    it('ignores a source index that is not a column', () => {
        expect(ids(moveColumn(columns, 9, 0))).toEqual(['a', 'b', 'c', 'd']);
    });

    it('does not mutate the array it was given', () => {
        const original = [...columns];
        moveColumn(columns, 0, 3);
        expect(columns).toEqual(original);
    });
});

describe('getCounterState', () => {
    it('is unremarkable below the warning threshold', () => {
        expect(getCounterState(COLUMN_COUNT_WARNING_FROM - 1)).toBe('ok');
    });

    it('warns from the threshold, so the limit is visible before it binds', () => {
        expect(getCounterState(COLUMN_COUNT_WARNING_FROM)).toBe('warning');
        expect(getCounterState(MAX_COLUMNS - 1)).toBe('warning');
    });

    it('reports the cap once it is reached', () => {
        expect(getCounterState(MAX_COLUMNS)).toBe('full');
    });

    it('treats an over-full set as full, so a stored view above the cap still renders', () => {
        expect(getCounterState(MAX_COLUMNS + 4)).toBe('full');
    });

    it('warns before it blocks', () => {
        expect(COLUMN_COUNT_WARNING_FROM).toBeLessThan(MAX_COLUMNS);
    });
});
