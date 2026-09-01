import type { ReactNode } from 'react';
import type { ColumnDefinition } from 'types/tableColumns';
import { getColumnKey, getProjectedContent } from 'utils/tableColumns';
import type { TableDataRow } from '../types';
import AttributeCell from './AttributeCell';
import EmptyCell from './EmptyCell';
import type { CellRegistry } from './registry';

/** A registry result that carries nothing to show. */
function isBlank(rendered: ReactNode): boolean {
    return rendered === null || rendered === undefined || rendered === '';
}

/**
 * The cell for one column of one row. Resolution runs in a fixed order:
 *
 * 1. the registry entry for the column, which owns the rich property cells;
 * 2. otherwise the projected attribute values, rendered by content type;
 * 3. and in either case the shared empty state when that produced nothing.
 */
export function renderCell<TRow extends object>(row: TRow, column: ColumnDefinition, registry?: CellRegistry<TRow>): ReactNode {
    const renderer = registry?.[getColumnKey(column)];
    if (renderer) {
        const rendered = renderer(row, column);
        return isBlank(rendered) ? <EmptyCell /> : rendered;
    }

    return (
        <AttributeCell
            contentType={column.attributeContentType}
            content={getProjectedContent(row, column)}
            dataTestId={`cell-${getColumnKey(column)}`}
        />
    );
}

export interface BuildTableRowsOptions<TRow> {
    getRowId: (row: TRow) => string | number;
    registry?: CellRegistry<TRow>;
    rowOptions?: (row: TRow) => TableDataRow['options'];
}

/**
 * Table rows for a column definition list. A row is rendered from the definitions it is given, in
 * the order it is given them, rather than from a positional cell array a page assembles — which is
 * what lets a column set chosen at runtime render at all.
 */
export function buildTableRows<TRow extends object>(
    rows: TRow[],
    columns: ColumnDefinition[],
    { getRowId, registry, rowOptions }: BuildTableRowsOptions<TRow>,
): TableDataRow[] {
    return rows.map((row) => {
        const options = rowOptions?.(row);
        return {
            id: getRowId(row),
            columns: columns.map((column) => renderCell(row, column, registry)),
            ...(options ? { options } : {}),
        };
    });
}
