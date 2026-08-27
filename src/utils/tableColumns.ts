import type { SortDirection, TableHeader } from 'components/CustomTable/types';
import type { BaseAttributeContentModel } from 'types/attributes';
import { AttributeContentType, FilterFieldType } from 'types/openapi';
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

/** Ordering the whole result set is sorted by, as a saved view carries it. */
export interface ColumnSort {
    fieldIdentifier: string;
    direction: SortDirection;
}

export interface BuildColumnHeadersOptions {
    sort?: ColumnSort;
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
        const isSorted = options.sort?.fieldIdentifier === column.fieldIdentifier;
        return {
            id: getColumnKey(column),
            content: getColumnHeading(column),
            sortable: column.sortable === true,
            sort: isSorted ? options.sort?.direction : undefined,
            align: getColumnAlign(column),
            minWidth: sizing.minWidth,
            maxWidth: sizing.maxWidth,
        };
    });
}
