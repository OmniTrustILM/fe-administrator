import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import type { SortDirection } from 'components/CustomTable/types';
import { ArrowDown, ArrowLeftToLine, ArrowRightToLine, ArrowUp, ChevronLeft, ChevronRight, EllipsisVertical } from 'lucide-react';
import type React from 'react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type ColumnMove, getDropIndex, getInsertionSlot, getMoveTarget } from './columnMoves';

/** How far a pointer may travel before the press counts as picking the column up rather than a click. */
const DRAG_THRESHOLD_PX = 5;

const NOT_SORTABLE_REASON = 'This field cannot be used for ordering.';

/**
 * What the menu says before anything has answered. The catalogue is read a round trip after the table
 * first paints, and a column carries no sort capability until it lands, so stating the permanent
 * reason here would assert an answer nobody has given.
 */
const SORTABILITY_UNKNOWN_REASON = 'Still loading which fields can be ordered.';

const ICON_CLASS = 'size-4 shrink-0';

type Gesture = {
    pointerId: number;
    startX: number;
    startY: number;
    /** The header cells, measured once the threshold is crossed. Absent means the press is still a click. */
    cells?: HTMLElement[];
    slot?: number;
};

type DropIndicator = {
    left: number;
    top: number;
    height: number;
};

type ItemProps = Readonly<{
    icon: ReactNode;
    label: string;
    disabled: boolean;
    dataTestId: string;
    /** The element carrying the reason the entry is unavailable, announced when it takes focus. */
    describedBy?: string;
    onSelect: () => void;
}>;

/**
 * Unavailable entries are marked `aria-disabled` rather than handed to Radix's `disabled`, which drops
 * them from its roving focus — an entry arrow keys cannot reach is one whose reason nobody hears.
 * Selecting one is made inert instead, and leaves the menu open.
 */
function MenuItem({ icon, label, disabled, dataTestId, describedBy, onSelect }: ItemProps) {
    return (
        <DropdownMenu.Item
            aria-disabled={disabled || undefined}
            aria-describedby={describedBy}
            onSelect={(event) => (disabled ? event.preventDefault() : onSelect())}
            data-testid={dataTestId}
            className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm focus:bg-surface-hover focus:outline-hidden',
                // Focus repaints the text as well: `content-subtle` on the focus background is 4.28:1 in
                // the light theme, under AA, and the token suite asserts that pairing nowhere.
                disabled ? 'cursor-not-allowed text-content-subtle focus:text-content' : 'cursor-pointer text-content',
            )}
        >
            {icon}
            {label}
        </DropdownMenu.Item>
    );
}

type Props = Readonly<{
    /** The column this control belongs to, keyed the way the table's header ids are. */
    columnKey: string;
    /** The column's heading, which is what names the control and the menu. */
    label: string;
    /** Every displayed column key in display order: the control's own position, and where a drag can land. */
    columnKeys: readonly string[];
    sortable: boolean;
    /**
     * Whether anything has answered on sortability yet. Distinguishes "the catalogue says no" from
     * "the catalogue has not replied", which read identically on the column itself.
     */
    isSortabilityKnown?: boolean;
    onSort: (direction: SortDirection) => void;
    onMove: (from: number, to: number) => void;
    dataTestId?: string;
}>;

/**
 * The three-dot control at the end of a column-driven header cell. It offers the two sort directions
 * explicitly, and four move entries; pressing and dragging it picks the column up instead, with a
 * drop indicator on the header row.
 *
 * The move entries are not a fallback for the drag. A drag handle is unreachable without a pointer,
 * and dragging across a horizontally scrolled table is imprecise work, so both reach the same move.
 *
 * Like the add-column menu beside it, this applies to the table and stores nothing: what it changes
 * leaves the active view dirty for the summary bar's Save to decide.
 */
export default function ColumnHeaderMenu({
    columnKey,
    label,
    columnKeys,
    sortable,
    isSortabilityKnown = true,
    onSort,
    onMove,
    dataTestId = 'column-header-menu',
}: Props) {
    const index = columnKeys.indexOf(columnKey);
    const total = columnKeys.length;

    const reasonId = useId();
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const gesture = useRef<Gesture | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [indicator, setIndicator] = useState<DropIndicator | null>(null);
    const isDragging = indicator !== null;

    const collectCells = useCallback((): HTMLElement[] | undefined => {
        const table = triggerRef.current?.closest('table');
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
    // follows, so the column stays where it was and no menu opens in its place.
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

        // Radix opens on pointerdown, which is before a press can be told apart from a drag. Taking the
        // default away leaves the menu to pointerup, and takes focus with it, so focus is set by hand.
        event.preventDefault();
        triggerRef.current?.focus();

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

            if (!current.cells || current.slot === undefined) {
                setIsOpen(true);
                return;
            }

            const to = getDropIndex(index, current.slot);
            if (to !== index) onMove(index, to);
        },
        [endGesture, index, onMove],
    );

    const move = useCallback(
        (kind: ColumnMove) => {
            const target = getMoveTarget(kind, index, total);
            if (target !== undefined) onMove(index, target);
        },
        [index, total, onMove],
    );

    const isMoveUnavailable = (kind: ColumnMove) => getMoveTarget(kind, index, total) === undefined;

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger
                ref={triggerRef}
                type="button"
                aria-label={`Column options for ${label}`}
                title={`Column options for ${label}`}
                data-testid={`${dataTestId}-trigger`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={endGesture}
                className={cn(
                    'inline-flex shrink-0 cursor-pointer touch-none items-center rounded-md p-0.5 text-content-subtle',
                    'hover:bg-surface-hover hover:text-content',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand',
                )}
            >
                <EllipsisVertical className={ICON_CLASS} aria-hidden="true" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    collisionPadding={8}
                    data-testid={dataTestId}
                    // Announced once on entering the menu, so the reason does not depend on the user
                    // reaching the entries it applies to.
                    aria-describedby={sortable ? undefined : reasonId}
                    className="z-[100] min-w-56 rounded-lg border-divider bg-surface-raised p-1 shadow-md dark:border"
                >
                    <MenuItem
                        icon={<ArrowUp className={ICON_CLASS} aria-hidden="true" />}
                        label="Sort ascending"
                        disabled={!sortable}
                        describedBy={sortable ? undefined : reasonId}
                        dataTestId={`${dataTestId}-sort-asc`}
                        onSelect={() => onSort('asc')}
                    />
                    <MenuItem
                        icon={<ArrowDown className={ICON_CLASS} aria-hidden="true" />}
                        label="Sort descending"
                        disabled={!sortable}
                        describedBy={sortable ? undefined : reasonId}
                        dataTestId={`${dataTestId}-sort-desc`}
                        onSelect={() => onSort('desc')}
                    />
                    {!sortable && (
                        <DropdownMenu.Label
                            id={reasonId}
                            className="px-2 pb-1 text-xs text-content-subtle"
                            data-testid={`${dataTestId}-sort-unavailable`}
                        >
                            {isSortabilityKnown ? NOT_SORTABLE_REASON : SORTABILITY_UNKNOWN_REASON}
                        </DropdownMenu.Label>
                    )}

                    <DropdownMenu.Separator className="my-1 h-px bg-divider" />

                    <MenuItem
                        icon={<ChevronLeft className={ICON_CLASS} aria-hidden="true" />}
                        label="Move left"
                        disabled={isMoveUnavailable('left')}
                        dataTestId={`${dataTestId}-move-left`}
                        onSelect={() => move('left')}
                    />
                    <MenuItem
                        icon={<ChevronRight className={ICON_CLASS} aria-hidden="true" />}
                        label="Move right"
                        disabled={isMoveUnavailable('right')}
                        dataTestId={`${dataTestId}-move-right`}
                        onSelect={() => move('right')}
                    />
                    <MenuItem
                        icon={<ArrowLeftToLine className={ICON_CLASS} aria-hidden="true" />}
                        label="Move to the start"
                        disabled={isMoveUnavailable('start')}
                        dataTestId={`${dataTestId}-move-start`}
                        onSelect={() => move('start')}
                    />
                    <MenuItem
                        icon={<ArrowRightToLine className={ICON_CLASS} aria-hidden="true" />}
                        label="Move to the end"
                        disabled={isMoveUnavailable('end')}
                        dataTestId={`${dataTestId}-move-end`}
                        onSelect={() => move('end')}
                    />
                </DropdownMenu.Content>
            </DropdownMenu.Portal>

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
        </DropdownMenu.Root>
    );
}
