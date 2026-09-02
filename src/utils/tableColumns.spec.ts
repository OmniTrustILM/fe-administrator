import { describe, expect, it } from 'vitest';
import type { ColumnDefinition, ProjectedAttributeValues } from 'types/tableColumns';
import { AttributeContentType, FilterFieldSource, FilterFieldType } from 'types/openapi';
import {
    buildColumnHeaders,
    getColumnHeading,
    getColumnKey,
    getColumnSizing,
    getProjectedContent,
    parseColumnKey,
    toRequestColumns,
} from './tableColumns';

const column = (overrides: Partial<ColumnDefinition> = {}): ColumnDefinition => ({
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'costCentre',
    catalogueLabel: 'Cost centre',
    ...overrides,
});

describe('getColumnHeading', () => {
    it('uses the catalogue label when the view sets no override', () => {
        expect(getColumnHeading(column())).toBe('Cost centre');
    });

    it('prefers the view label over the catalogue label', () => {
        expect(getColumnHeading(column({ label: 'Cost centre (FY26)' }))).toBe('Cost centre (FY26)');
    });

    it('treats an empty override as absent, so the column keeps following the catalogue', () => {
        expect(getColumnHeading(column({ label: '' }))).toBe('Cost centre');
    });
});

describe('getColumnKey', () => {
    it('qualifies the identifier with its source, because an identifier is unique only within a source', () => {
        expect(getColumnKey(column())).toBe('custom:costCentre');
        expect(getColumnKey(column({ fieldSource: FilterFieldSource.Meta }))).toBe('meta:costCentre');
    });
});

describe('getProjectedContent', () => {
    const attributeValues: ProjectedAttributeValues = {
        [FilterFieldSource.Custom]: {
            costCentre: [{ data: 4820 }],
            environment: [{ data: 'production' }, { data: 'staging' }],
            empty: [],
        },
        [FilterFieldSource.Meta]: {
            costCentre: [{ data: 'meta-value' }],
        },
    };

    it('reads the value nested by source and then identifier', () => {
        expect(getProjectedContent({ attributeValues }, column())).toEqual([{ data: 4820 }]);
    });

    it('does not confuse the same identifier across two sources', () => {
        expect(getProjectedContent({ attributeValues }, column({ fieldSource: FilterFieldSource.Meta }))).toEqual([{ data: 'meta-value' }]);
    });

    it('returns every value of a multi-valued attribute', () => {
        expect(getProjectedContent({ attributeValues }, column({ fieldIdentifier: 'environment' }))).toHaveLength(2);
    });

    it('reports an empty array as absent, so the cell resolves to the empty state', () => {
        expect(getProjectedContent({ attributeValues }, column({ fieldIdentifier: 'empty' }))).toBeUndefined();
    });

    it('reports an unprojected identifier as absent', () => {
        expect(getProjectedContent({ attributeValues }, column({ fieldIdentifier: 'notProjected' }))).toBeUndefined();
    });

    it('reports an unprojected source as absent', () => {
        expect(getProjectedContent({ attributeValues }, column({ fieldSource: FilterFieldSource.Data }))).toBeUndefined();
    });

    it('survives a row that carries no projected values at all', () => {
        expect(getProjectedContent({}, column())).toBeUndefined();
    });
});

describe('getColumnSizing', () => {
    it('always sets a maxWidth, because that is the switch that turns the one-line rule on', () => {
        const contentTypes = Object.values(AttributeContentType);
        for (const attributeContentType of contentTypes) {
            expect(getColumnSizing(column({ attributeContentType })).maxWidth).toBeGreaterThan(0);
        }
    });

    it('gives a date column less room than free text', () => {
        const date = getColumnSizing(column({ attributeContentType: AttributeContentType.Date }));
        const text = getColumnSizing(column({ attributeContentType: AttributeContentType.Text }));
        expect(date.maxWidth).toBeLessThan(text.maxWidth);
    });

    it('keeps minWidth at or below maxWidth for every content type', () => {
        for (const attributeContentType of Object.values(AttributeContentType)) {
            const sizing = getColumnSizing(column({ attributeContentType }));
            expect(Number.parseInt(sizing.minWidth, 10)).toBeLessThanOrEqual(sizing.maxWidth);
        }
    });

    it('falls back to the filter field type when a property column carries no content type', () => {
        const boolean = getColumnSizing(column({ fieldSource: FilterFieldSource.Property, type: FilterFieldType.Boolean }));
        const string = getColumnSizing(column({ fieldSource: FilterFieldSource.Property, type: FilterFieldType.String }));
        expect(boolean.maxWidth).toBeLessThan(string.maxWidth);
    });

    it('sizes a column with neither content type nor field type from the default', () => {
        const sizing = getColumnSizing(column());
        expect(sizing.maxWidth).toBeGreaterThan(0);
        expect(sizing.minWidth).toMatch(/^\d+px$/);
    });
});

describe('buildColumnHeaders', () => {
    const columns: ColumnDefinition[] = [
        column({ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', catalogueLabel: 'Common Name', sortable: true }),
        column({ fieldIdentifier: 'costCentre', label: 'Cost centre (FY26)', attributeContentType: AttributeContentType.Integer }),
    ];

    it('produces one header per column, in the order given', () => {
        expect(buildColumnHeaders(columns).map((header) => header.id)).toEqual(['property:COMMON_NAME', 'custom:costCentre']);
    });

    it('renders the heading a view asks for', () => {
        expect(buildColumnHeaders(columns).map((header) => header.content)).toEqual(['Common Name', 'Cost centre (FY26)']);
    });

    it('marks a header sortable only when the catalogue says the field is', () => {
        expect(buildColumnHeaders(columns).map((header) => header.sortable)).toEqual([true, false]);
    });

    it('sizes every header, so a wide column set degrades by scrolling rather than by squeezing', () => {
        for (const header of buildColumnHeaders(columns)) {
            expect(header.minWidth).toBeTruthy();
            expect(header.maxWidth).toBeTruthy();
        }
    });

    it('declares no percentage width, which under table-layout auto is a hint rather than a width', () => {
        for (const header of buildColumnHeaders(columns)) {
            expect(header.width).toBeUndefined();
        }
    });

    it('marks the sorted column with its direction and leaves the others unmarked', () => {
        const headers = buildColumnHeaders(columns, {
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME', direction: 'desc' },
        });
        expect(headers[0].sort).toBe('desc');
        expect(headers[1].sort).toBeUndefined();
    });

    it('ignores a sort on a column that is not displayed', () => {
        const headers = buildColumnHeaders(columns, {
            sort: { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_SHOWN', direction: 'asc' },
        });
        expect(headers.every((header) => header.sort === undefined)).toBe(true);
    });

    /** An identifier is unique only within its source, so two sources may publish the same one. */
    it('marks only the sorted source when two columns share an identifier', () => {
        const shared: ColumnDefinition[] = [
            column({ fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'name', catalogueLabel: 'Name', sortable: true }),
            column({ fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'name', catalogueLabel: 'Name', sortable: true }),
        ];

        const headers = buildColumnHeaders(shared, {
            sort: { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'name', direction: 'asc' },
        });

        expect(headers[0].sort).toBeUndefined();
        expect(headers[1].sort).toBe('asc');
    });

    it('right-aligns numeric columns so digits line up down the column', () => {
        const headers = buildColumnHeaders(columns);
        expect(headers[1].align).toBe('right');
    });

    it('honours an explicit alignment over the content-type default', () => {
        const headers = buildColumnHeaders([column({ attributeContentType: AttributeContentType.Integer, align: 'center' })]);
        expect(headers[0].align).toBe('center');
    });

    it('returns no headers for no columns', () => {
        expect(buildColumnHeaders([])).toEqual([]);
    });
});

describe('parseColumnKey', () => {
    it('is the inverse of getColumnKey', () => {
        const identity = { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' };
        expect(parseColumnKey(getColumnKey(identity))).toEqual(identity);
    });

    it('keeps an attribute identifier whole, pipe and all', () => {
        const identity = { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' };
        expect(parseColumnKey(getColumnKey(identity))).toEqual(identity);
    });

    it('keeps an identifier that carries a separator of its own', () => {
        const identity = { fieldSource: FilterFieldSource.Meta, fieldIdentifier: 'ns:field|STRING' };
        expect(parseColumnKey(getColumnKey(identity))).toEqual(identity);
    });

    it('rejects a key that names no source', () => {
        expect(parseColumnKey('COMMON_NAME')).toBeUndefined();
    });

    it('rejects a key whose source is not a field source', () => {
        expect(parseColumnKey('nonsense:COMMON_NAME')).toBeUndefined();
    });

    it('rejects a key with no identifier behind the separator', () => {
        expect(parseColumnKey('property:')).toBeUndefined();
    });

    it("rejects one of the table's own chrome columns", () => {
        expect(parseColumnKey('__checkbox__')).toBeUndefined();
    });
});

describe('toRequestColumns', () => {
    it('reduces a column to the two fields the request carries', () => {
        expect(toRequestColumns([column({ label: 'Dept' })])).toEqual([
            { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'costCentre' },
        ]);
    });

    it('keeps the display order, which is the order the response is read in', () => {
        expect(
            toRequestColumns([column({ fieldIdentifier: 'b' }), column({ fieldIdentifier: 'a' })]).map(
                (requested) => requested.fieldIdentifier,
            ),
        ).toEqual(['b', 'a']);
    });

    it('is undefined for no columns, so the field is omitted rather than sent empty', () => {
        expect(toRequestColumns([])).toBeUndefined();
    });
});

describe('buildColumnHeaders auxiliary heading content', () => {
    it('attaches auxiliary content to the header of the column it is keyed by', () => {
        const headers = buildColumnHeaders([column({ fieldIdentifier: 'a' }), column({ fieldIdentifier: 'b' })], {
            info: { 'custom:a': 'legend' },
        });

        expect(headers[0].info).toBe('legend');
        expect(headers[1].info).toBeUndefined();
    });

    it('leaves every header without it when none is given', () => {
        expect(buildColumnHeaders([column()])[0].info).toBeUndefined();
    });
});
