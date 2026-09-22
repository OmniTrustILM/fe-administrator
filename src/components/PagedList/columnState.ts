import type { CellRegistry } from 'components/CustomTable/columns';
import type { SortDirection } from 'components/CustomTable/types';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { toColumnDefinition } from 'utils/columnPicker';
import { toStoredSort } from 'utils/listViews';
import { type ColumnSort, getColumnKey, getSortKey, parseColumnKey, toRequestColumns } from 'utils/tableColumns';

/**
 * The ordering a header click asks for, or `undefined` when the click cannot become one. The header id
 * is opaque — it may name a chrome column, or one a view switch has since taken away — so it is
 * resolved against the displayed columns rather than trusted.
 */
export function toColumnSortFromHeader(
    key: string,
    direction: SortDirection,
    columns: readonly ColumnDefinition[],
): ColumnSort | undefined {
    const parsed = parseColumnKey(key);
    if (!parsed) return undefined;

    const column = columns.find((candidate) => getColumnKey(candidate) === key);
    if (column?.sortable !== true) return undefined;

    return { ...parsed, direction };
}

/** Whether two orderings are the same one. Lets the caller ignore the table's own mount-time echo. */
export function isSameSort(a: ColumnSort | undefined, b: ColumnSort | undefined): boolean {
    if (!a || !b) return a === b;
    return getSortKey(a) === getSortKey(b) && a.direction === b.direction;
}

/**
 * The displayed columns with a catalogue field added at the end, or taken away when it is already
 * one. The last column standing is kept: the API rejects a view with none, and the same array comes
 * back so a refused removal cannot re-list the page.
 */
export function toggleColumn(columns: ColumnDefinition[], field: SourcedCatalogueField): ColumnDefinition[] {
    const key = getColumnKey(field);
    if (!columns.some((column) => getColumnKey(column) === key)) return [...columns, toColumnDefinition(field)];
    if (columns.length === 1) return columns;
    return columns.filter((column) => getColumnKey(column) !== key);
}

export function getRenderableProperties<TRow>(registry: CellRegistry<TRow> | undefined): ReadonlySet<string> {
    return new Set(Object.keys(registry ?? {}));
}

/**
 * A platform column set with the catalogue's sort capability merged in. A page ships a static literal
 * that cannot know what the API can order by, and unmerged it would render the Standard tab entirely
 * unsortable. Only `sortable` is taken — the rest of a shipped column is a deliberate display choice.
 */
export function withCatalogueSortability(
    columns: readonly ColumnDefinition[],
    catalogue: readonly SearchFieldListModel[],
): ColumnDefinition[] {
    const sortableKeys = new Set(
        catalogue.flatMap((group) =>
            (group.searchFieldData ?? [])
                .filter((field) => field.sortable === true)
                .map((field) => getColumnKey({ fieldSource: group.filterFieldSource, fieldIdentifier: field.fieldIdentifier })),
        ),
    );

    return columns.map((column) => {
        const sortable = sortableKeys.has(getColumnKey(column));

        // Identity is preserved when the flag already agrees, so the caller's memo stays stable.
        return sortable === (column.sortable === true) ? column : { ...column, sortable };
    });
}

/**
 * A platform column set with the page's own declared ordering marked sortable. The catalogue is the authority on
 * sortability, but it arrives after the first render, and until it does no column carries the flag — so
 * `toDisplayableSort` would drop the declared ordering and the first listing request would go out in API order, to be
 * corrected by a second one. A page naming a `defaultSort` asserts the API can order by that column, which is the same
 * assertion its static column set already makes; the catalogue still overrules it once read.
 */
export function withDeclaredSortability(columns: ColumnDefinition[], sort: ColumnSort | undefined): ColumnDefinition[] {
    if (!sort) return columns;

    const key = getSortKey(sort);
    return columns.map((column) => (getColumnKey(column) === key && column.sortable !== true ? { ...column, sortable: true } : column));
}

/**
 * The listing request for a page state. `columns` and `sort` are spread in only when they carry
 * something, so a request with neither is byte-identical to one written before the contract had them.
 */
export function buildListRequest(base: SearchRequestModel, columns?: readonly ColumnDefinition[], sort?: ColumnSort): SearchRequestModel {
    const requestColumns = columns ? toRequestColumns(columns) : undefined;
    const requestSort = toStoredSort(sort);

    return {
        ...base,
        ...(requestColumns ? { columns: requestColumns } : {}),
        ...(requestSort ? { sort: requestSort } : {}),
    };
}

/**
 * The ordering the table can actually show. A view stores its columns and its ordering independently,
 * and an ordering no header can paint is one the user can neither see nor clear.
 */
export function toDisplayableSort(sort: ColumnSort | undefined, columns: readonly ColumnDefinition[]): ColumnSort | undefined {
    if (!sort) return undefined;

    const key = getSortKey(sort);
    const column = columns.find((candidate) => getColumnKey(candidate) === key);
    return column?.sortable === true ? sort : undefined;
}
