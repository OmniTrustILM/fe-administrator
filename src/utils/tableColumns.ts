import type { SortDirection, TableHeader } from 'components/CustomTable/types';
import type { ReactNode } from 'react';
import type { BaseAttributeContentModel } from 'types/attributes';
import { AttributeContentType, FilterFieldSource, FilterFieldType, type SearchColumnRequestDto } from 'types/openapi';
import type { AttributeProjectable, ColumnDefinition, ProjectedAttributeValues } from 'types/tableColumns';

/** Width bounds of one generated column, in pixels. */
export interface ColumnSizing {
    minWidth: string;
    maxWidth: number;
}

/**
 * Sizing per content type. Every column gets a `maxWidth`, because that is the only thing that makes
 * the row cell apply `overflow: hidden` and an ellipsis, and so the switch that turns the one-line
 * row rule on. The `minWidth` is what makes a twelve-column table degrade by scrolling rather than
 * by squeezing every column into illegibility.
 */
const SIZING_BY_CONTENT_TYPE: Readonly<Record<AttributeContentType, ColumnSizing>> = {
    [AttributeContentType.Boolean]: { minWidth: '90px', maxWidth: 120 },
    [AttributeContentType.Integer]: { minWidth: '90px', maxWidth: 140 },
    [AttributeContentType.Float]: { minWidth: '90px', maxWidth: 140 },
    [AttributeContentType.Date]: { minWidth: '110px', maxWidth: 160 },
    [AttributeContentType.Time]: { minWidth: '100px', maxWidth: 140 },
    [AttributeContentType.Datetime]: { minWidth: '150px', maxWidth: 200 },
    [AttributeContentType.String]: { minWidth: '140px', maxWidth: 320 },
    [AttributeContentType.Text]: { minWidth: '180px', maxWidth: 420 },
    [AttributeContentType.Credential]: { minWidth: '140px', maxWidth: 260 },
    [AttributeContentType.Object]: { minWidth: '140px', maxWidth: 260 },
    [AttributeContentType.Resource]: { minWidth: '140px', maxWidth: 260 },
    [AttributeContentType.File]: { minWidth: '140px', maxWidth: 260 },
    // Neither can be picked as a column: both are marked displayable=false by the catalogue. They
    // are sized anyway so the table never has to reason about a missing entry.
    [AttributeContentType.Secret]: { minWidth: '90px', maxWidth: 120 },
    [AttributeContentType.Codeblock]: { minWidth: '140px', maxWidth: 320 },
};

/** A property column reports a filter field type rather than an attribute content type. */
const SIZING_BY_FIELD_TYPE: Readonly<Record<FilterFieldType, ColumnSizing>> = {
    [FilterFieldType.Boolean]: SIZING_BY_CONTENT_TYPE[AttributeContentType.Boolean],
    [FilterFieldType.Number]: SIZING_BY_CONTENT_TYPE[AttributeContentType.Integer],
    [FilterFieldType.Date]: SIZING_BY_CONTENT_TYPE[AttributeContentType.Date],
    [FilterFieldType.Datetime]: SIZING_BY_CONTENT_TYPE[AttributeContentType.Datetime],
    [FilterFieldType.List]: SIZING_BY_CONTENT_TYPE[AttributeContentType.String],
    [FilterFieldType.String]: SIZING_BY_CONTENT_TYPE[AttributeContentType.String],
};

const DEFAULT_SIZING: ColumnSizing = SIZING_BY_CONTENT_TYPE[AttributeContentType.String];

const NUMERIC_CONTENT_TYPES: ReadonlySet<AttributeContentType> = new Set([AttributeContentType.Integer, AttributeContentType.Float]);

/**
 * Ordering the whole result set is sorted by, as a saved view carries it. The source is part of the
 * identity for the same reason it is in {@link getColumnKey}: an identifier alone does not say which
 * column was sorted when two sources publish the same one.
 */
export interface ColumnSort {
    fieldSource: FilterFieldSource;
    fieldIdentifier: string;
    direction: SortDirection;
}

/** A sort's column key, in the same shape {@link getColumnKey} produces. */
export function getSortKey(sort: ColumnSort): string {
    return `${sort.fieldSource}:${sort.fieldIdentifier}`;
}

export interface BuildColumnHeadersOptions {
    sort?: ColumnSort;
    /**
     * Auxiliary heading content by column key — the enum legends the listing pages show beside State,
     * Type, Algorithm and Format. It rides beside the heading rather than inside it because a sortable
     * heading is itself a button, and `TableHeader.info` is the slot that keeps an interactive legend
     * from nesting inside one.
     */
    info?: Readonly<Record<string, ReactNode>>;
}

/**
 * The heading a view shows for a column. An absent or empty override means the column follows the
 * catalogue, so a field relabelled later carries through.
 */
export function getColumnHeading(column: ColumnDefinition): string {
    return column.label ? column.label : column.catalogueLabel;
}

/**
 * A stable key for a column. A field identifier is unique only within its source, so the source has
 * to qualify it — `property:name` and `custom:name` are different columns.
 *
 * Takes only the two fields it needs, so a catalogue field keys the same way a column does.
 */
export function getColumnKey(column: Pick<ColumnDefinition, 'fieldSource' | 'fieldIdentifier'>): string {
    return `${column.fieldSource}:${column.fieldIdentifier}`;
}

const FIELD_SOURCES: ReadonlySet<string> = new Set<string>(Object.values(FilterFieldSource));

/**
 * The column a key names, or `undefined` when the key is not one {@link getColumnKey} produced.
 *
 * Split at the *first* separator only. An attribute identifier is `name|CONTENT_TYPE` and an
 * attribute may be named with a colon of its own, so splitting on every colon would truncate the
 * identifier rather than reject the key. The source is checked against the enum instead of trusted,
 * because these keys come back through `CustomTable` as opaque header ids — including the table's own
 * chrome columns, which name no field at all.
 */
export function parseColumnKey(key: string): Pick<ColumnDefinition, 'fieldSource' | 'fieldIdentifier'> | undefined {
    const separator = key.indexOf(':');
    if (separator <= 0) return undefined;

    const fieldSource = key.slice(0, separator);
    const fieldIdentifier = key.slice(separator + 1);
    if (!FIELD_SOURCES.has(fieldSource) || fieldIdentifier === '') return undefined;

    return { fieldSource: fieldSource as FilterFieldSource, fieldIdentifier };
}

/**
 * The columns a listing request names, or `undefined` when there are none to name.
 *
 * `undefined` rather than an empty array deliberately: the contract's compatibility guarantee is
 * that omitting `columns` leaves the request identical to one written before the field existed, and
 * an empty array is a value rather than an omission.
 */
export function toRequestColumns(columns: readonly ColumnDefinition[]): SearchColumnRequestDto[] | undefined {
    if (columns.length === 0) return undefined;
    return columns.map((column) => ({ fieldSource: column.fieldSource, fieldIdentifier: column.fieldIdentifier }));
}

/**
 * The projected values a listing entry carries for a column, or `undefined` when the entry has
 * none. An empty array is reported as absent so the cell resolves to the empty state rather than to
 * a value renderer with nothing to render.
 */
export function getProjectedContent(row: object, column: ColumnDefinition): BaseAttributeContentModel[] | undefined {
    // Read structurally rather than constraining the row type: the listing DTOs gain
    // `attributeValues` from the contract, and a caller must not have to declare the field to
    // render a row that simply has no projected values.
    const attributeValues = (row as AttributeProjectable).attributeValues;
    const bySource: ProjectedAttributeValues[keyof ProjectedAttributeValues] = attributeValues?.[column.fieldSource];
    const content = bySource?.[column.fieldIdentifier];
    return content && content.length > 0 ? content : undefined;
}

/** Width bounds for a column, taken from its content type and falling back to its field type. */
export function getColumnSizing(column: ColumnDefinition): ColumnSizing {
    if (column.attributeContentType) return SIZING_BY_CONTENT_TYPE[column.attributeContentType] ?? DEFAULT_SIZING;
    if (column.type) return SIZING_BY_FIELD_TYPE[column.type] ?? DEFAULT_SIZING;
    return DEFAULT_SIZING;
}

function getColumnAlign(column: ColumnDefinition): TableHeader['align'] {
    if (column.align) return column.align;
    // Numerals are rendered in tabular figures and right-aligned, so digits line up down the column.
    if (column.attributeContentType && NUMERIC_CONTENT_TYPES.has(column.attributeContentType)) return 'right';
    if (!column.attributeContentType && column.type === FilterFieldType.Number) return 'right';
    return undefined;
}

/**
 * Table headers for a column definition list. Deliberately declares no percentage `width`: no
 * `table-layout` is set anywhere in the app, so the table is `auto` and a percentage is a competing
 * hint rather than a width. The per-column `minWidth`/`maxWidth` are the real sizing.
 */
export function buildColumnHeaders(columns: ColumnDefinition[], options: BuildColumnHeadersOptions = {}): TableHeader[] {
    return columns.map((column) => {
        const sizing = getColumnSizing(column);
        const key = getColumnKey(column);
        const isSorted = options.sort !== undefined && getSortKey(options.sort) === key;
        const info = options.info?.[key];
        return {
            id: key,
            content: getColumnHeading(column),
            ...(info ? { info } : {}),
            sortable: column.sortable === true,
            sort: isSorted ? options.sort?.direction : undefined,
            align: getColumnAlign(column),
            minWidth: sizing.minWidth,
            maxWidth: sizing.maxWidth,
        };
    });
}
