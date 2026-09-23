import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import cn from 'classnames';
import type { SortDirection } from 'components/CustomTable/types';
import Dialog from 'components/Dialog';
import TextInput from 'components/TextInput';
import {
    ArrowDown,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    EllipsisVertical,
    EyeOff,
    Pencil,
    RotateCcw,
} from 'lucide-react';
import { type ReactNode, useCallback, useId, useState } from 'react';
import { type ColumnMove, getMoveTarget } from './columnMoves';

const NOT_SORTABLE_REASON = 'This field cannot be used for ordering.';

/**
 * What the menu says when the catalogue read that decides sortability failed. It leaves every column
 * flagged unsortable, which is not an answer, so the permanent reason would assert something nobody said.
 */
const CATALOGUE_FAILED_REASON = 'Could not load which fields can be ordered.';

const LAST_COLUMN_REASON = 'A view must keep at least one column.';

const ICON_CLASS = 'size-4 shrink-0';

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
    /** Every displayed column key in display order: the column's own position, and how far a move can send it. */
    columnKeys: readonly string[];
    sortable: boolean;
    /**
     * Whether the catalogue read failed. Distinguishes "the catalogue says no" from "the read failed",
     * which read identically on the column itself.
     */
    hasCatalogueFailed?: boolean;
    onSort: (direction: SortDirection) => void;
    onMove: (from: number, to: number) => void;
    /**
     * Overrides the column's heading, or clears the override when given nothing. Left out where the
     * host cannot keep one.
     */
    onRename?: (label: string | undefined) => void;
    /**
     * The heading the column carries with no rename of its own — the one the page ships, which is not
     * always what the catalogue calls the field. Resetting goes back to this.
     */
    defaultHeading?: string;
    /** Takes the column off the table. Left out where there is nothing to remove it from. */
    onRemove?: () => void;
    /** Whether this is the last column standing, which the API will not let a view drop to. */
    isLastColumn?: boolean;
    dataTestId?: string;
}>;

/**
 * The three-dot control at the end of a column-driven header cell. It offers the two sort directions
 * explicitly, four move entries, and the heading and removal entries; the grip at the other end of the
 * cell is what drags the column.
 *
 * The move entries are not a fallback for that drag. A grip is unreachable without a pointer, and
 * dragging across a horizontally scrolled table is imprecise work, so both reach the same move.
 *
 * Like the add-column menu beside it, this applies to the table and stores nothing: what it changes
 * leaves the active view dirty for the summary bar's Save to decide.
 */
export default function ColumnHeaderMenu({
    columnKey,
    label,
    columnKeys,
    sortable,
    hasCatalogueFailed = false,
    onSort,
    onMove,
    onRename,
    defaultHeading,
    onRemove,
    isLastColumn = false,
    dataTestId = 'column-header-menu',
}: Props) {
    const index = columnKeys.indexOf(columnKey);
    const total = columnKeys.length;

    const reasonId = useId();
    const lastColumnId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [renaming, setRenaming] = useState<string | undefined>(undefined);
    const hasOverride = defaultHeading !== undefined && label !== defaultHeading;

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
                type="button"
                aria-label={`Column options for ${label}`}
                title={`Column options for ${label}`}
                data-testid={`${dataTestId}-trigger`}
                className={cn(
                    // 4px of gap from the heading is short of the spacing exception, so the control has to
                    // clear the 24px target size on its own; `p-1` puts it exactly on it, which firefox then
                    // measures a fraction under.
                    'inline-flex shrink-0 cursor-pointer items-center rounded-md p-1.5 text-content-subtle',
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
                            {hasCatalogueFailed ? CATALOGUE_FAILED_REASON : NOT_SORTABLE_REASON}
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

                    {onRename && (
                        <>
                            <DropdownMenu.Separator className="my-1 h-px bg-divider" />

                            <MenuItem
                                icon={<Pencil className={ICON_CLASS} aria-hidden="true" />}
                                label="Rename…"
                                disabled={false}
                                dataTestId={`${dataTestId}-rename`}
                                onSelect={() => setRenaming(label)}
                            />
                            <MenuItem
                                icon={<RotateCcw className={ICON_CLASS} aria-hidden="true" />}
                                label="Reset heading"
                                disabled={!hasOverride}
                                dataTestId={`${dataTestId}-reset-heading`}
                                onSelect={() => onRename(defaultHeading)}
                            />
                        </>
                    )}

                    {onRemove && (
                        <>
                            <DropdownMenu.Separator className="my-1 h-px bg-divider" />

                            <MenuItem
                                icon={<EyeOff className={ICON_CLASS} aria-hidden="true" />}
                                label="Remove column"
                                disabled={isLastColumn}
                                describedBy={isLastColumn ? lastColumnId : undefined}
                                dataTestId={`${dataTestId}-remove`}
                                onSelect={onRemove}
                            />
                            {isLastColumn && (
                                <DropdownMenu.Label
                                    id={lastColumnId}
                                    className="px-2 pb-1 text-xs text-content-subtle"
                                    data-testid={`${dataTestId}-remove-unavailable`}
                                >
                                    {LAST_COLUMN_REASON}
                                </DropdownMenu.Label>
                            )}
                        </>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>

            {onRename && (
                <Dialog
                    isOpen={renaming !== undefined}
                    toggle={() => setRenaming(undefined)}
                    caption="Rename column"
                    size="sm"
                    dataTestId={`${dataTestId}-rename-dialog`}
                    body={
                        <TextInput
                            id={`${dataTestId}-rename-input`}
                            label="Heading"
                            value={renaming ?? ''}
                            onChange={setRenaming}
                            placeholder={defaultHeading}
                            dataTestId={`${dataTestId}-rename-field`}
                        />
                    }
                    buttons={[
                        { color: 'secondary', variant: 'outline', onClick: () => setRenaming(undefined), body: 'Cancel' },
                        {
                            color: 'primary',
                            onClick: () => {
                                // An emptied field is the same request Reset heading makes: the heading the
                                // page ships, which is not always what the catalogue calls the field.
                                onRename(renaming?.trim() ? renaming : defaultHeading);
                                setRenaming(undefined);
                            },
                            body: 'Rename',
                        },
                    ]}
                />
            )}
        </DropdownMenu.Root>
    );
}
