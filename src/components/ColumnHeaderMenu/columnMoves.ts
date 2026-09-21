/** The four places the menu can send a column, in display order terms — left is earlier. */
export type ColumnMove = 'left' | 'right' | 'start' | 'end';

/** A header cell's horizontal extent, in viewport coordinates. */
export interface ColumnBounds {
    left: number;
    right: number;
}

/**
 * The position a move entry sends the column to, or `undefined` when the entry has nowhere to go —
 * which is also what makes it unavailable in the menu, so the two cannot disagree.
 */
export function getMoveTarget(move: ColumnMove, index: number, total: number): number | undefined {
    if (index < 0 || index >= total) return undefined;

    const targets: Readonly<Record<ColumnMove, number>> = {
        left: index - 1,
        right: index + 1,
        start: 0,
        end: total - 1,
    };

    const target = targets[move];
    if (target < 0 || target >= total || target === index) return undefined;
    return target;
}

/**
 * The slot a pointer sits over while dragging, as an insertion point rather than a column: 0 lands
 * before the first column and `bounds.length` after the last, so both ends of the row are reachable.
 */
export function getInsertionSlot(pointerX: number, bounds: readonly ColumnBounds[]): number {
    const slot = bounds.findIndex((cell) => pointerX < (cell.left + cell.right) / 2);
    return slot === -1 ? bounds.length : slot;
}

/**
 * The index a drop lands on. The slot means "insert before this column", and the move takes the
 * source out before inserting, which shifts a slot to its right down by one — the horizontal form of
 * the correction the picker's own drop makes.
 */
export function getDropIndex(from: number, slot: number): number {
    return from < slot ? slot - 1 : slot;
}
