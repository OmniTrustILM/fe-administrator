import { useState } from 'react';
import type { FilterFieldSource } from 'types/openapi';
import type { PickerColumn } from 'types/tableColumns';
import { getDropIndex } from 'utils/columnPicker';
import { formatColumnCount, getColumnKey } from 'utils/tableColumns';
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

/**
 * Where the width advisory starts: the withdrawn cap of twelve plus one. A deliberate rough proxy
 * for width, not a measurement — what decides whether the table scrolls is the sum of the
 * per-column `minWidth` against the viewport, which a count cannot see.
 */
const WIDE_VIEW_FROM = 13;

/**
 * The selected columns, in display order, with the count and the reset control. Reordering is
 * available by drag and by the per-row move buttons, because a drag handle alone is not reachable
 * from the keyboard.
 */
export default function SelectedColumns({ columns, getSourceLabel, onRename, onRevert, onRemove, onMove, onResetToStandard }: Props) {
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    // The advisory is a claim about the table, and the table renders only the available columns.
    const renderedCount = columns.filter((column) => column.available).length;

    const finishDrag = () => {
        setDraggingIndex(null);
        setDropIndex(null);
    };

    const handleDrop = () => {
        // The indicator is a top border on the target row, so the highlighted row is the slot.
        if (draggingIndex !== null && dropIndex !== null) onMove(draggingIndex, getDropIndex(draggingIndex, dropIndex));
        finishDrag();
    };

    return (
        <section className="flex min-h-0 flex-col" aria-labelledby="selected-columns-heading">
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 id="selected-columns-heading" className="text-sm font-semibold text-content">
                    Columns shown
                </h3>
                <div
                    className="flex flex-col items-end gap-0.5 text-right text-xs text-content-muted"
                    // The only feedback a screen reader gets when a column is added from the other pane. The
                    // advisory sits inside it to be announced too, and above the list so a long selection cannot hide it.
                    aria-live="polite"
                >
                    <span className="font-medium" data-testid="column-counter">
                        {formatColumnCount(columns.length)}
                    </span>
                    {renderedCount >= WIDE_VIEW_FROM && (
                        <span data-testid="column-width-advisory">
                            A view this wide may scroll horizontally rather than squeeze its columns.
                        </span>
                    )}
                </div>
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
