import { describe, expect, it } from 'vitest';
import { moveColumn } from 'utils/columnPicker';
import { type ColumnBounds, type ColumnMove, getDropIndex, getInsertionSlot, getMoveTarget } from './columnMoves';

const columns = ['a', 'b', 'c', 'd'];

const afterMove = (move: ColumnMove, index: number) => {
    const target = getMoveTarget(move, index, columns.length);
    return target === undefined ? undefined : moveColumn(columns, index, target);
};

const cells = (widths: number[]): ColumnBounds[] => {
    let left = 0;
    return widths.map((width) => {
        const bounds = { left, right: left + width };
        left += width;
        return bounds;
    });
};

describe('getMoveTarget', () => {
    it('shifts a middle column one position either way', () => {
        expect(afterMove('left', 2)).toEqual(['a', 'c', 'b', 'd']);
        expect(afterMove('right', 1)).toEqual(['a', 'c', 'b', 'd']);
    });

    it('sends a column to either end in one move', () => {
        expect(afterMove('start', 2)).toEqual(['c', 'a', 'b', 'd']);
        expect(afterMove('end', 1)).toEqual(['a', 'c', 'd', 'b']);
    });

    it('offers nothing to the column already at the position the move names', () => {
        expect(getMoveTarget('left', 0, 4)).toBeUndefined();
        expect(getMoveTarget('start', 0, 4)).toBeUndefined();
        expect(getMoveTarget('right', 3, 4)).toBeUndefined();
        expect(getMoveTarget('end', 3, 4)).toBeUndefined();
    });

    it('still offers the far end to a column one position away from it', () => {
        expect(getMoveTarget('start', 1, 4)).toBe(0);
        expect(getMoveTarget('end', 2, 4)).toBe(3);
    });

    it('offers nothing at all for the only column there is', () => {
        for (const move of ['left', 'right', 'start', 'end'] as const) {
            expect(getMoveTarget(move, 0, 1)).toBeUndefined();
        }
    });

    it('offers nothing for an index outside the row', () => {
        expect(getMoveTarget('start', -1, 4)).toBeUndefined();
        expect(getMoveTarget('start', 4, 4)).toBeUndefined();
    });
});

describe('getInsertionSlot', () => {
    const bounds = cells([100, 100, 100]);

    it('lands before the first column when the pointer is left of its midpoint', () => {
        expect(getInsertionSlot(0, bounds)).toBe(0);
        expect(getInsertionSlot(49, bounds)).toBe(0);
    });

    it('crosses into the next slot at each midpoint', () => {
        expect(getInsertionSlot(50, bounds)).toBe(1);
        expect(getInsertionSlot(149, bounds)).toBe(1);
        expect(getInsertionSlot(150, bounds)).toBe(2);
    });

    it('lands after the last column beyond its midpoint', () => {
        expect(getInsertionSlot(250, bounds)).toBe(3);
        expect(getInsertionSlot(1000, bounds)).toBe(3);
    });

    it('reads columns of unequal width by their own midpoints', () => {
        const uneven = cells([40, 400]);
        expect(getInsertionSlot(30, uneven)).toBe(1);
        expect(getInsertionSlot(239, uneven)).toBe(1);
        expect(getInsertionSlot(240, uneven)).toBe(2);
    });
});

describe('getDropIndex', () => {
    it('compensates for the source being taken out before a slot to its right', () => {
        expect(getDropIndex(0, 3)).toBe(2);
        expect(getDropIndex(0, 4)).toBe(3);
    });

    it('leaves a slot to the left of the source alone', () => {
        expect(getDropIndex(3, 0)).toBe(0);
        expect(getDropIndex(2, 1)).toBe(1);
    });

    it('resolves both slots bordering the source to where it already is', () => {
        expect(getDropIndex(1, 1)).toBe(1);
        expect(getDropIndex(1, 2)).toBe(1);
    });

    it('drops a column onto the position the indicator marked', () => {
        expect(moveColumn(columns, 0, getDropIndex(0, 3))).toEqual(['b', 'c', 'a', 'd']);
        expect(moveColumn(columns, 0, getDropIndex(0, 4))).toEqual(['b', 'c', 'd', 'a']);
        expect(moveColumn(columns, 3, getDropIndex(3, 0))).toEqual(['d', 'a', 'b', 'c']);
        expect(moveColumn(columns, 3, getDropIndex(3, 2))).toEqual(['a', 'b', 'd', 'c']);
    });
});
