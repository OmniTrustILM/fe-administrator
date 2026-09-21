import { useState } from 'react';
import type { FilterFieldSource } from 'types/openapi';
import type { PickerColumn } from 'types/tableColumns';
import { getColumnKey } from 'utils/tableColumns';
import SelectedColumnRow from './SelectedColumnRow';

type Props = Readonly<{
    columns: PickerColumn[];
    getSourceLabel: (source: FilterFieldSource) => string;
    onRename: (index: number, label: string) => void;
    onRevert: (index: number) => void;
    onRemove: (index: number) => void;
    onMove: (from: number, to: number) => void;
    onResetToStandard: () => void;
}>;

const WIDE_VIEW_FROM = 13;

/**
 * The selected columns, in display order, with the count and the reset control. Reordering is
 * available by drag and by the per-row move buttons, because a drag handle alone is not reachable
 * from the keyboard.
 */
export default function SelectedColumns({ columns, getSourceLabel, onRename, onRevert, onRemove, onMove, onResetToStandard }: Props) {
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    const finishDrag = () => {
        setDraggingIndex(null);
        setDropIndex(null);
    };

    const handleDrop = () => {
        if (draggingIndex !== null && dropIndex !== null) {
            // The indicator is a top border on the target row, i.e. "land above this row". The move
            // takes the source out before inserting, which shifts a target below it up by one, so a
            // downward move has to compensate or the row lands below the highlighted one.
            onMove(draggingIndex, draggingIndex < dropIndex ? dropIndex - 1 : dropIndex);
        }
        finishDrag();
    };

    return (
        <section className="flex min-h-0 flex-col" aria-labelledby="selected-columns-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
                <h3 id="selected-columns-heading" className="text-sm font-semibold text-content">
                    Columns shown
                </h3>
                <span
                    className="text-xs font-medium text-content-muted"
                    // The only feedback a screen reader gets when a column is added from the other pane.
                    aria-live="polite"
                    data-testid="column-counter"
                >
                    {`${columns.length} ${columns.length === 1 ? 'column' : 'columns'}`}
                </span>
            </div>

            {columns.length === 0 ? (
                <p
                    className="rounded-md border border-dashed border-outline px-3 py-6 text-center text-sm text-content-muted"
                    data-testid="selected-columns-empty"
                >
                    A view needs at least one column.
                </p>
            ) : (
                <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0" data-testid="selected-columns-list">
                    {columns.map((column, index) => (
                        <SelectedColumnRow
                            key={getColumnKey(column)}
                            column={column}
                            index={index}
                            total={columns.length}
                            getSourceLabel={getSourceLabel}
                            onRename={onRename}
                            onRevert={onRevert}
                            onRemove={onRemove}
                            onMove={onMove}
                            onDragStart={setDraggingIndex}
                            onDragOver={setDropIndex}
                            onDrop={handleDrop}
                            onDragEnd={finishDrag}
                            isDragging={draggingIndex === index}
                            isDropTarget={draggingIndex !== null && dropIndex === index && draggingIndex !== index}
                            dataTestId={`selected-column-${getColumnKey(column)}`}
                        />
                    ))}
                </ul>
            )}

            {columns.length >= WIDE_VIEW_FROM && (
                <p className="mt-2 text-xs text-content-muted" data-testid="column-width-advisory">
                    A view this wide scrolls horizontally rather than squeezing its columns.
                </p>
            )}

            <button
                type="button"
                onClick={onResetToStandard}
                // Refills the pane as an edit the user can still cancel. Getting back to the
                // platform columns outright is the Standard tab, which is why the table itself
                // carries no reset control.
                className="mt-3 self-start rounded-md px-1 text-xs font-medium text-brand hover:text-brand-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                data-testid="reset-to-standard"
            >
                Reset to Standard columns
            </button>
        </section>
    );
}
