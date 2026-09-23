import { FilterFieldSource, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, PickerColumn, SourcedCatalogueField } from 'types/tableColumns';
import { getColumnKey } from './tableColumns';

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

/**
 * The fields of a column catalogue, flattened and each stamped with the source it was published
 * under — an identifier is unique only within its source, so a field carries no meaning without it.
 *
 * Only fields the catalogue marks `displayable` are offered. An absent flag is not treated as a
 * yes: secret and encrypted content, and code blocks, are excluded server-side by that flag alone,
 * so guessing in its absence is what would put them in front of a user.
 *
 * @param renderableProperties the column keys the page has a cell renderer for. A property field
 * outside that set is dropped: its value lives on the listing entry, so with no renderer the column
 * could only ever show the empty state. Attribute sources render from projected values and are never
 * gated. Omitted means no gate, which is what a page not yet on the pipeline wants.
 */
export function toCatalogueFields(
    catalogue: SearchFieldDataByGroupDto[],
    renderableProperties?: ReadonlySet<string>,
): SourcedCatalogueField[] {
    const isOffered = (field: SourcedCatalogueField) =>
        renderableProperties === undefined ||
        field.fieldSource !== FilterFieldSource.Property ||
        renderableProperties.has(getColumnKey(field));

    return catalogue.flatMap((group) =>
        (group.searchFieldData ?? [])
            .filter((field) => field.displayable === true)
            .map((field) => ({ ...field, fieldSource: group.filterFieldSource }) as SourcedCatalogueField)
            .filter(isOffered),
    );
}

/** Whether a field answers the search term, by its label or by the identifier a view records it under. */
export function matchesFieldSearch(field: SourcedCatalogueField, search: string): boolean {
    const term = search.trim().toLowerCase();
    return (
        term === '' ||
        field.fieldLabel.toLowerCase().includes(term) ||
        // The identifier is searchable too, so a stored column can be found by what a view recorded.
        field.fieldIdentifier.toLowerCase().includes(term)
    );
}

/**
 * Catalogue fields grouped by source and narrowed by the search term. A group left with no matches
 * is dropped rather than rendered as an empty heading — a resource with no custom attributes should
 * not appear to have an empty custom section.
 */
export function groupCatalogueFields(fields: SourcedCatalogueField[], search: string): CatalogueFieldGroup[] {
    return SOURCE_ORDER.map((source) => ({
        source,
        fields: fields.filter((field) => field.fieldSource === source && matchesFieldSearch(field, search)),
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

/**
 * Stored columns resolved against the live catalogue.
 *
 * A resolved column is refreshed from the catalogue, so a field relabelled since the view was saved
 * carries its new label through, while the view's own heading override survives and the page's own
 * display choices — alignment — are taken back from the column it ships.
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

        // Alignment is the page's choice, not the catalogue's and not the view's: a centred icon column
        // stays centred whether it is opened from Standard or from a stored view, which is why it is
        // taken from the shipped column rather than from anything storage carries.
        const align = standardByKey.get(key)?.align ?? column.align;

        return {
            ...toColumnDefinition(field),
            ...(align ? { align } : {}),
            ...(column.label ? { label: column.label } : {}),
            available: true,
        };
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
/**
 * The index a drop lands on, given where the source is and which slot it was released over. A slot
 * means "insert before this position", and {@link moveColumn} takes the source out before inserting,
 * which shifts a slot beyond it down by one.
 */
export function getDropIndex(from: number, slot: number): number {
    return from < slot ? slot - 1 : slot;
}
