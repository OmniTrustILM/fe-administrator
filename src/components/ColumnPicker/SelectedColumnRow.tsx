import cn from 'classnames';
import { ChevronDown, ChevronUp, GripVertical, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import Badge from 'components/Badge';
import type { FilterFieldSource } from 'types/openapi';
import type { PickerColumn } from 'types/tableColumns';
import { getColumnHeading } from 'utils/tableColumns';
import SourceBadge from './SourceBadge';

type Props = Readonly<{
    column: PickerColumn;
    index: number;
    total: number;
    getSourceLabel: (source: FilterFieldSource) => string;
    onRename: (index: number, label: string) => void;
    onRevert: (index: number) => void;
    onRemove: (index: number) => void;
    onMove: (from: number, to: number) => void;
    onDragStart: (index: number) => void;
    onDragOver: (index: number) => void;
    onDrop: () => void;
    onDragEnd: () => void;
    isDragging: boolean;
    /** True when a dragged row would land immediately above this one. */
    isDropTarget: boolean;
    dataTestId: string;
}>;

/**
 * One selected column. Position is display order — top is leftmost — so the row carries both the
 * pointer affordance (a drag handle) and explicit move controls: reordering has to be reachable
 * from the keyboard, and a drag handle alone never is.
 */
export default function SelectedColumnRow({
    column,
    index,
    total,
    getSourceLabel,
    onRename,
    onRevert,
    onRemove,
    onMove,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
    isDropTarget,
    dataTestId,
}: Props) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [draft, setDraft] = useState('');

    const heading = getColumnHeading(column);
    const isRenamed = Boolean(column.label);

    const commitRename = () => {
        setIsRenaming(false);
        onRename(index, draft);
    };

    // A column whose field the catalogue no longer publishes cannot be renamed or reordered into
    // meaning — it can only be taken out. It keeps its position and shows the stored identifier, so
    // an administrator can tell what it was. It is not draggable, but it does accept a drop, or no
    // column could be placed immediately above it.
    if (!column.available) {
        return (
            <li
                onDragOver={(event) => {
                    event.preventDefault();
                    onDragOver(index);
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    onDrop();
                }}
                onDragEnd={onDragEnd}
                className={cn('flex items-center gap-2 rounded-md border border-dashed border-outline px-2 py-1.5', {
                    'border-t-2 border-t-brand': isDropTarget,
                })}
                data-testid={dataTestId}
            >
                <span className="w-4 shrink-0" aria-hidden />
                <Badge color="warning" size="small" className="shrink-0">
                    Unavailable
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-content-muted">
                    {column.catalogueLabel}
                    <span className="ms-1.5 text-xs text-content-subtle">{`${column.fieldSource} / ${column.fieldIdentifier}`}</span>
                </span>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    aria-label={`Remove unavailable column ${column.catalogueLabel}`}
                    className="shrink-0 rounded-md p-1 text-content-subtle hover:bg-surface-hover hover:text-danger focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                    data-testid={`${dataTestId}-remove`}
                >
                    <X size={14} aria-hidden />
                </button>
            </li>
        );
    }

    return (
        <li
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(event) => {
                event.preventDefault();
                onDragOver(index);
            }}
            onDrop={(event) => {
                event.preventDefault();
                onDrop();
            }}
            onDragEnd={onDragEnd}
            className={cn('flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 hover:bg-surface-hover', {
                'opacity-50': isDragging,
                'border-t-2 border-t-brand': isDropTarget,
            })}
            data-testid={dataTestId}
        >
            <GripVertical size={16} className="shrink-0 cursor-grab text-content-subtle" aria-hidden data-testid={`${dataTestId}-handle`} />
            <SourceBadge source={column.fieldSource} label={getSourceLabel(column.fieldSource)} />

            {isRenaming ? (
                <input
                    // biome-ignore lint/a11y/noAutofocus: the field replaces the heading the user just chose to edit
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commitRename();
                        if (event.key === 'Escape') setIsRenaming(false);
                    }}
                    aria-label={`Heading for ${column.catalogueLabel}`}
                    className="min-w-0 flex-1 rounded-md border border-brand bg-surface-raised px-1.5 py-0.5 text-sm text-content focus:outline-hidden"
                    data-testid={`${dataTestId}-rename-input`}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        setDraft(heading);
                        setIsRenaming(true);
                    }}
                    className="min-w-0 flex-1 truncate rounded-md px-1 text-start text-sm text-content hover:bg-surface-active focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                    data-testid={`${dataTestId}-rename`}
                >
                    {heading}
                    {isRenamed && (
                        // The catalogue label stays visible behind the override, so it is clear what
                        // reverting would restore.
                        <span className="ms-1.5 text-xs text-content-subtle">{`← ${column.catalogueLabel}`}</span>
                    )}
                    <span className="sr-only"> — rename this column heading</span>
                </button>
            )}

            {isRenamed && !isRenaming && (
                <button
                    type="button"
                    onClick={() => onRevert(index)}
                    aria-label={`Revert ${heading} to the catalogue label ${column.catalogueLabel}`}
                    className="shrink-0 rounded-md p-1 text-content-subtle hover:bg-surface-hover hover:text-content focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                    data-testid={`${dataTestId}-revert`}
                >
                    <RotateCcw size={13} aria-hidden />
                </button>
            )}

            <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${heading} earlier`}
                className="shrink-0 rounded-md p-1 text-content-subtle hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                data-testid={`${dataTestId}-up`}
            >
                <ChevronUp size={14} aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === total - 1}
                aria-label={`Move ${heading} later`}
                className="shrink-0 rounded-md p-1 text-content-subtle hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                data-testid={`${dataTestId}-down`}
            >
                <ChevronDown size={14} aria-hidden />
            </button>
            <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove column ${heading}`}
                className="shrink-0 rounded-md p-1 text-content-subtle hover:bg-surface-hover hover:text-danger focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                data-testid={`${dataTestId}-remove`}
            >
                <X size={14} aria-hidden />
            </button>
        </li>
    );
}
