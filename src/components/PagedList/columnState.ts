import type { CellRegistry } from 'components/CustomTable/columns';
import type { SortDirection } from 'components/CustomTable/types';
import type { ColumnDefinition } from 'types/tableColumns';
import { type ColumnSort, getColumnKey, getSortKey, parseColumnKey } from 'utils/tableColumns';

/**
 * The ordering a header click asks for, or `undefined` when the click cannot become one.
 *
 * `CustomTable` reports an opaque header id, so it is resolved against the displayed columns rather
 * than trusted: the id may name one of the table's own chrome columns, or a column a view switch has
 * since taken away. A column the catalogue does not mark `sortable` is refused here as well as being
 * rendered unsortable, so a stale header cannot ask the API for an ordering it would reject.
 */
export function toColumnSortFromHeader(
    key: string,
    direction: SortDirection,
    columns: readonly ColumnDefinition[],
): ColumnSort | undefined {
    const parsed = parseColumnKey(key);
    if (!parsed) return undefined;

    const column = columns.find((candidate) => getColumnKey(candidate) === key);
    if (!column || column.sortable !== true) return undefined;

    return { ...parsed, direction };
}

/**
 * Whether two orderings are the same one.
 *
 * `CustomTable` announces the sort its headers declare once on mount, and that sort is the one the
 * caller just handed it. Without this the echo would read as a change and start another fetch, which
 * would rebuild the headers and echo again.
 */
export function isSameSort(a: ColumnSort | undefined, b: ColumnSort | undefined): boolean {
    if (!a || !b) return a === b;
    return getSortKey(a) === getSortKey(b) && a.direction === b.direction;
}

/**
 * The column keys a page can render from the listing entry itself, which is exactly the keys of its
 * cell registry. This is what keeps a permanently blank property column out of the picker — see
 * `toCatalogueFields`, which takes it as its gate.
 */
export function getRenderableProperties<TRow>(registry: CellRegistry<TRow> | undefined): ReadonlySet<string> {
    return new Set(Object.keys(registry ?? {}));
}
