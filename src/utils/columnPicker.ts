import { FilterFieldSource, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, PickerColumn, SourcedCatalogueField } from 'types/tableColumns';
import { getColumnKey } from './tableColumns';

/**
 * The most columns a view may hold. A readability rule rather than a contract limit: if the API ever
 * enforces a maximum of its own, the picker takes the smaller of the two.
 */
export const MAX_COLUMNS = 12;

/** Where the counter starts warning, so the cap is visible before it binds. */
export const COLUMN_COUNT_WARNING_FROM = 10;

/** The order sources are offered in: object properties first, then the attribute sources. */
const SOURCE_ORDER: readonly FilterFieldSource[] = [
    FilterFieldSource.Property,
    FilterFieldSource.Custom,
    FilterFieldSource.Meta,
    FilterFieldSource.Data,
];

/** Fields the catalogue publishes under one source, after searching. */
export interface CatalogueFieldGroup {
    source: FilterFieldSource;
    fields: SourcedCatalogueField[];
}

export type ColumnCounterState = 'ok' | 'warning' | 'full';

/**
 * The fields of a column catalogue, flattened and each stamped with the source it was published
 * under — an identifier is unique only within its source, so a field carries no meaning without it.
 *
 * Only fields the catalogue marks `displayable` are offered. An absent flag is not treated as a
 * yes: secret and encrypted content, and code blocks, are excluded server-side by that flag alone,
 * so guessing in its absence is what would put them in front of a user.
 */
export function toCatalogueFields(catalogue: SearchFieldDataByGroupDto[]): SourcedCatalogueField[] {
    return catalogue.flatMap((group) =>
        (group.searchFieldData ?? [])
            .filter((field) => field.displayable === true)
            .map((field) => ({ ...field, fieldSource: group.filterFieldSource }) as SourcedCatalogueField),
    );
}

/**
 * Catalogue fields grouped by source and narrowed by the search term. A group left with no matches
 * is dropped rather than rendered as an empty heading — a resource with no custom attributes should
 * not appear to have an empty custom section.
 */
export function groupCatalogueFields(fields: SourcedCatalogueField[], search: string): CatalogueFieldGroup[] {
    const term = search.trim().toLowerCase();
    const matches = (field: SourcedCatalogueField) =>
        term === '' ||
        field.fieldLabel.toLowerCase().includes(term) ||
        // The identifier is searchable too, so a stored column can be found by what a view recorded.
        field.fieldIdentifier.toLowerCase().includes(term);

    return SOURCE_ORDER.map((source) => ({
        source,
        fields: fields.filter((field) => field.fieldSource === source && matches(field)),
    })).filter((group) => group.fields.length > 0);
}

/** A catalogue field as a newly added column. It carries no label override, so it follows the catalogue. */
export function toColumnDefinition(field: SourcedCatalogueField): ColumnDefinition {
    return {
        fieldSource: field.fieldSource,
        fieldIdentifier: field.fieldIdentifier,
        catalogueLabel: field.fieldLabel,
        type: field.type,
        attributeContentType: field.attributeContentType,
        // Absent means the backend has not said yes, and an unsortable header is the safe reading.
        sortable: field.sortable === true,
        multiValue: field.multiValue,
    };
}

/** Whether a catalogue field is already among the selected columns. */
export function isColumnSelected(selected: ColumnDefinition[], field: SourcedCatalogueField): boolean {
    const key = getColumnKey(field);
    return selected.some((column) => getColumnKey(column) === key);
}

/**
 * Stored columns resolved against the live catalogue.
 *
 * A resolved column is refreshed from the catalogue, so a field relabelled since the view was saved
 * carries its new label through, while the view's own label override and anything the catalogue does
 * not carry — alignment — survive.
 *
 * A column the catalogue does not publish is only unavailable if the platform does not define it
 * either. A platform default column can be absent from the filter-field catalogue and still be
 * renderable, and marking those unavailable would drop them from the view on the next save. Anything
 * else is kept in place and marked unavailable rather than skipped: silently dropping it makes a
 * heading vanish with no explanation, and the user's next move is to hunt for a field that is gone.
 */
export function resolveColumns(
    stored: ColumnDefinition[],
    fields: SourcedCatalogueField[],
    standardColumns: readonly ColumnDefinition[] = [],
): PickerColumn[] {
    const byKey = new Map(fields.map((field) => [getColumnKey(field), field]));
    const standardByKey = new Map(standardColumns.map((column) => [getColumnKey(column), column]));

    return stored.map((column) => {
        const key = getColumnKey(column);
        const field = byKey.get(key);

        if (!field) {
            const standard = standardByKey.get(key);
            if (!standard) return { ...column, available: false };
            return { ...standard, ...(column.label ? { label: column.label } : {}), available: true };
        }

        return {
            ...toColumnDefinition(field),
            ...(column.align ? { align: column.align } : {}),
            ...(column.label ? { label: column.label } : {}),
            available: true,
        };
    });
}

/**
 * Whether two resolutions are the same column list. Lets a re-resolution be dropped rather than
 * replacing state with an equal value, which is what keeps an unstable catalogue reference from
 * re-rendering forever.
 */
export function isSameResolution(a: readonly PickerColumn[], b: readonly PickerColumn[]): boolean {
    if (a.length !== b.length) return false;

    return a.every((column, index) => {
        const other = b[index];
        const keys = new Set([...Object.keys(column), ...Object.keys(other)]) as Set<keyof PickerColumn>;
        return [...keys].every((key) => column[key] === other[key]);
    });
}

/**
 * The column list with one column moved. Position is display order — top is leftmost — and the
 * stored shape is a plain array, so a move is a reorder with no index field to renumber.
 */
export function moveColumn<T>(columns: T[], from: number, to: number): T[] {
    if (from < 0 || from >= columns.length) return columns;

    const target = Math.min(Math.max(to, 0), columns.length - 1);
    if (target === from) return columns;

    const reordered = [...columns];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(target, 0, moved);
    return reordered;
}

/** How the column counter should read for a given selection size. */
export function getCounterState(count: number): ColumnCounterState {
    if (count >= MAX_COLUMNS) return 'full';
    if (count >= COLUMN_COUNT_WARNING_FROM) return 'warning';
    return 'ok';
}
