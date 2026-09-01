import type { ReactNode } from 'react';
import type { ColumnDefinition } from 'types/tableColumns';

/**
 * Renders the cell of one column from the listing entry itself. A registry entry exists for the
 * property columns that are rich today — a status badge, a link to a detail page, an owner chip —
 * where the value lives on the entry rather than in the projected attribute map.
 *
 * Returning `null`, `undefined` or `''` means the entry has no value for this column, and the row
 * renders the shared empty state; a renderer never has to spell that out.
 */
export type CellRenderer<TRow> = (row: TRow, column: ColumnDefinition) => ReactNode;

/**
 * Cell renderers keyed by the column key — `property:COMMON_NAME`, for example. A field identifier
 * is unique only within its source, so the key carries the source too.
 */
export type CellRegistry<TRow> = Readonly<Record<string, CellRenderer<TRow>>>;
