import cn from 'classnames';
import { GripVertical } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getInsertionSlot } from 'components/ColumnHeaderMenu/columnMoves';
import { getDropIndex } from 'utils/columnPicker';

/** How far a pointer may travel before the press counts as picking the column up rather than a stray click. */
const DRAG_THRESHOLD_PX = 5;

type Gesture = {
    pointerId: number;
    startX: number;
    startY: number;
    /** The header cells, measured once the threshold is crossed. Absent means the press has not become a drag. */
    cells?: HTMLElement[];
    slot?: number;
};

type DropIndicator = {
    left: number;
    top: number;
    height: number;
};

type Props = Readonly<{
    /** The column this handle belongs to, keyed the way the table's header ids are. */
    columnKey: string;
    /** The column's heading, which is what names the handle. */
    label: string;
    /** Every displayed column key in display order: the handle's own position, and where a drag can land. */
    columnKeys: readonly string[];
    onMove: (from: number, to: number) => void;
    dataTestId?: string;
}>;

/**
 * The grip at the leading end of a column-driven header cell: press it and the column comes with the
 * pointer, with an indicator on the header row showing where it would land.
 *
 * It carries no menu of its own. A grip that also opened one could not tell a press from a drag until
 * the pointer had already moved, which is the ambiguity the separate three-dot control removes. The
 * same moves are reachable from that menu, because a drag is unavailable without a pointer.
 */
export default function ColumnDragHandle({ columnKey, label, columnKeys, onMove, dataTestId = 'column-drag-handle' }: Props) {
    const index = columnKeys.indexOf(columnKey);

    const handleRef = useRef<HTMLButtonElement | null>(null);
    const gesture = useRef<Gesture | null>(null);
    const [indicator, setIndicator] = useState<DropIndicator | null>(null);
    const isDragging = indicator !== null;

    const collectCells = useCallback((): HTMLElement[] | undefined => {
        const table = handleRef.current?.closest('table');
        if (!table) return undefined;

        const byKey = new Map<string, HTMLElement>();
        for (const cell of table.querySelectorAll<HTMLElement>('thead th[data-id]')) {
            if (cell.dataset.id) byKey.set(cell.dataset.id, cell);
        }

        const cells: HTMLElement[] = [];
        for (const key of columnKeys) {
            const cell = byKey.get(key);
            if (!cell) return undefined;
            cells.push(cell);
        }
        return cells.length > 0 ? cells : undefined;
    }, [columnKeys]);

    const endGesture = useCallback(() => {
        gesture.current = null;
        setIndicator(null);
    }, []);

    // Escape abandons a drag in progress. Dropping the gesture also silences the pointerup that
    // follows, so the column stays where it was.
    useEffect(() => {
        if (!isDragging) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            endGesture();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isDragging, endGesture]);

    const onPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        // ctrl+left is the secondary click on macOS, so it belongs to the context menu, not to a drag.
        if (event.button !== 0 || event.ctrlKey) return;

        // Keeps the press from selecting the heading text it starts on.
        event.preventDefault();

        gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
    }, []);

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            const current = gesture.current;
            if (!current || current.pointerId !== event.pointerId) return;

            if (!current.cells) {
                if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD_PX) return;

                const cells = collectCells();
                if (!cells) return;
                current.cells = cells;
            }

            // Re-measured every move rather than cached, so the indicator follows a table scrolled mid-drag.
            const rects = current.cells.map((cell) => cell.getBoundingClientRect());
            const slot = getInsertionSlot(event.clientX, rects);
            current.slot = slot;

            setIndicator({
                left: slot < rects.length ? rects[slot].left : rects[rects.length - 1].right,
                top: rects[0].top,
                height: rects[0].height,
            });
        },
        [collectCells],
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            const current = gesture.current;
            if (!current || current.pointerId !== event.pointerId) return;

            endGesture();

            if (!current.cells || current.slot === undefined) return;

            const to = getDropIndex(index, current.slot);
            if (to !== index) onMove(index, to);
        },
        [endGesture, index, onMove],
    );

    return (
        <>
            <button
                ref={handleRef}
                type="button"
                // Out of the tab order and out of the a11y tree: it answers to a pointer alone, so a
                // reachable button here would be a dead stop on every column. The menu's four move
                // entries are the keyboard route, and they carry the accessible name for the job.
                tabIndex={-1}
                aria-hidden="true"
                title={`Reorder ${label}`}
                data-testid={`${dataTestId}-trigger`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={endGesture}
                className={cn(
                    // `p-1.5` around the 14px grip: the icon is deliberately smaller than the menu's, so the
                    // padding is what carries the control to the 24px target size.
                    'inline-flex shrink-0 touch-none items-center rounded-md p-1.5 text-content-subtle',
                    isDragging ? 'cursor-grabbing' : 'cursor-grab',
                    'hover:bg-surface-hover hover:text-content',
                )}
            >
                <GripVertical className="size-3.5 shrink-0" aria-hidden="true" />
            </button>

            {indicator &&
                createPortal(
                    <div
                        aria-hidden="true"
                        data-testid={`${dataTestId}-drop-indicator`}
                        className="pointer-events-none fixed z-[200] w-0.5 rounded-full bg-brand-solid"
                        style={{ left: indicator.left - 1, top: indicator.top, height: indicator.height }}
                    />,
                    document.body,
                )}
        </>
    );
}
