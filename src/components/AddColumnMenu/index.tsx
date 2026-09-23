import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';
import Badge from 'components/Badge';
import { CHECKBOX_INPUT_CLASS } from 'components/Checkbox';
import SourceBadge, { DEFAULT_SOURCE_LABELS, SOURCE_COLORS } from 'components/SourceBadge';
import { Plus, RotateCcw, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { getColumnKey } from 'utils/tableColumns';
import { type MenuSourceColumn, toMenuContents } from './sourceColumns';

const LOCKED_AT_LAST_COLUMN = 'A view must keep at least one column';
const LOCKED_WHILE_LOADING = 'Columns cannot be changed while the page is loading';

function getEmptyState(column: MenuSourceColumn, isCatalogueLoaded: boolean): string {
    // Three different answers, and reading them as one is what makes an exhausted source claim the
    // search found nothing when nothing was typed.
    if (!column.isPublishing) return isCatalogueLoaded ? 'None published' : 'Loading…';
    return column.isExhausted ? 'All shown' : 'No match';
}

type Props = Readonly<{
    /** The catalogue fields on offer, already through the displayable and property gates. */
    fields: SourcedCatalogueField[];
    /**
     * Whether the catalogue read has settled. Until it has, an empty `fields` means "not yet", which
     * must not be shown as the answer that this resource publishes nothing.
     */
    isCatalogueLoaded?: boolean;
    /** The columns the table is showing, which is what the checkboxes report. */
    columns: ColumnDefinition[];
    /**
     * Adds the field as the first column, or takes it away when it is already one. Left out while the
     * host cannot yet keep what a toggle produces, which locks every checkbox rather than accept a
     * change something else is about to overwrite.
     */
    onToggle?: (field: SourcedCatalogueField) => void;
    /** Puts the platform's own column set back. Left out where there is nothing to go back to. */
    onReset?: () => void;
    dataTestId?: string;
}>;

type FieldRowProps = Readonly<{
    field: SourcedCatalogueField;
    isSelected: boolean;
    sourceLabel: string;
    /** Why the checkbox cannot be changed, which is also what it is titled and announced with. */
    lockReason?: string;
    withSourceBadge?: boolean;
    itemClassName?: string;
    onToggle?: (field: SourcedCatalogueField) => void;
    dataTestId: string;
}>;

function FieldRow({ field, isSelected, sourceLabel, lockReason, withSourceBadge, itemClassName, onToggle, dataTestId }: FieldRowProps) {
    return (
        <li className={itemClassName}>
            <label
                className={cn(
                    'flex items-center gap-2 rounded-md px-1 py-1 text-sm',
                    lockReason ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-hover',
                )}
                title={lockReason}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={lockReason !== undefined}
                    onChange={() => onToggle?.(field)}
                    data-testid={`${dataTestId}-field-${getColumnKey(field)}`}
                    className={cn('shrink-0', CHECKBOX_INPUT_CLASS)}
                />
                <span className="min-w-0 flex-1 truncate text-content">{field.fieldLabel}</span>
                {withSourceBadge && <SourceBadge source={field.fieldSource} label={sourceLabel} />}
                {/* The source is what tells two like-named fields apart, so it belongs in the accessible
                    name of every checkbox — carried by the badge where one is rendered. */}
                <span className="sr-only">{withSourceBadge ? lockReason : lockReason ? `${sourceLabel}. ${lockReason}` : sourceLabel}</span>
            </label>
        </li>
    );
}

/**
 * The menu behind the table's trailing **+**: what the table is showing, then the rest of the
 * catalogue as four columns, one per source, each field a checkbox.
 *
 * It applies straight to the table and stores nothing. What it changes leaves the active view
 * dirty, and the view strip's summary bar stays the only thing that writes — which is what makes the
 * control safe on Standard, where a look at a column would otherwise become a permanent edit.
 */
export default function AddColumnMenu({
    fields,
    isCatalogueLoaded = true,
    columns,
    onToggle,
    onReset,
    dataTestId = 'add-column-menu',
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const { shown, sources } = useMemo(() => toMenuContents(fields, columns, search), [fields, columns, search]);

    const onOpenChange = useCallback((open: boolean) => {
        setIsOpen(open);
        if (!open) setSearch('');
    }, []);

    const isLocked = onToggle === undefined;
    const isAtLastColumn = columns.length === 1;

    // The rule in force, named once where it can be read: a disabled checkbox is out of the tab
    // order, so a keyboard user never reaches whatever the control itself might say.
    const lockNotice = isLocked ? LOCKED_WHILE_LOADING : isAtLastColumn ? LOCKED_AT_LAST_COLUMN : undefined;

    return (
        <Popover.Root open={isOpen} onOpenChange={onOpenChange} modal>
            <Popover.Trigger
                type="button"
                aria-label="Add column"
                title="Add column"
                data-testid={`${dataTestId}-trigger`}
                className={cn(
                    'inline-flex items-center rounded-md p-1 text-content-subtle',
                    'hover:bg-surface-hover hover:text-content',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand',
                )}
            >
                <Plus className="size-4" />
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    align="end"
                    sideOffset={4}
                    // Generous at the bottom: the menu grows into the height Radix reports as available,
                    // so this is what keeps it clear of the viewport edge rather than ending flush with it.
                    collisionPadding={{ top: 8, right: 8, bottom: 72, left: 8 }}
                    aria-label="Add column"
                    data-testid={dataTestId}
                    className="z-[100] flex max-h-(--radix-popover-content-available-height) w-[min(56rem,calc(100vw-2rem))] flex-col rounded-lg border-divider bg-surface-raised p-3 shadow-md dark:border"
                >
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-content-subtle"
                                aria-hidden
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={isCatalogueLoaded ? `Search ${fields.length} fields…` : 'Search fields…'}
                                aria-label="Search fields"
                                data-testid={`${dataTestId}-search`}
                                className="w-full rounded-md border border-divider bg-surface-raised py-1.5 ps-8 pe-2.5 text-sm text-content placeholder:text-content-hint focus:border-brand focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                            />
                        </div>

                        {onReset && (
                            <button
                                type="button"
                                onClick={onReset}
                                data-testid={`${dataTestId}-reset`}
                                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-brand hover:bg-brand-subtle focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
                                Reset to standard
                            </button>
                        )}
                    </div>

                    {shown.length > 0 && (
                        <fieldset
                            // Capped and scrollable: a wide view puts enough columns here to push the
                            // catalogue below the popover's own height, and this is the half that can give.
                            className="mt-3 flex max-h-[40%] min-h-0 shrink flex-col overflow-y-auto border-b border-divider pb-2"
                            data-testid={`${dataTestId}-shown`}
                        >
                            <legend className="mb-1 text-xs font-semibold tracking-wide text-content-muted uppercase">
                                Shown on the table
                            </legend>
                            <ul className="m-0 flex list-none flex-wrap p-0">
                                {shown.map((field) => (
                                    <FieldRow
                                        key={getColumnKey(field)}
                                        field={field}
                                        isSelected
                                        sourceLabel={DEFAULT_SOURCE_LABELS[field.fieldSource]}
                                        lockReason={isLocked || isAtLastColumn ? lockNotice : undefined}
                                        withSourceBadge
                                        itemClassName="min-w-0 basis-full sm:basis-1/4"
                                        onToggle={onToggle}
                                        dataTestId={dataTestId}
                                    />
                                ))}
                            </ul>
                        </fieldset>
                    )}

                    <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                        {sources.map((menuColumn) => {
                            const label = DEFAULT_SOURCE_LABELS[menuColumn.source];

                            return (
                                <fieldset
                                    key={menuColumn.source}
                                    className="flex min-h-0 min-w-0 flex-col"
                                    data-testid={`${dataTestId}-source-${menuColumn.source}`}
                                >
                                    <legend className="mb-1">
                                        <Badge
                                            color={SOURCE_COLORS[menuColumn.source]}
                                            size="small"
                                            dataTestId={`${dataTestId}-legend-${menuColumn.source}`}
                                        >
                                            {label}
                                        </Badge>
                                    </legend>

                                    <div className="min-h-0 flex-1 overflow-y-auto">
                                        {menuColumn.fields.length === 0 ? (
                                            <p className="px-1 py-1 text-xs text-content-subtle">
                                                {getEmptyState(menuColumn, isCatalogueLoaded)}
                                            </p>
                                        ) : (
                                            <ul className="m-0 flex list-none flex-col p-0">
                                                {menuColumn.fields.map((field) => (
                                                    <FieldRow
                                                        key={getColumnKey(field)}
                                                        field={field}
                                                        isSelected={false}
                                                        sourceLabel={label}
                                                        lockReason={isLocked ? lockNotice : undefined}
                                                        onToggle={onToggle}
                                                        dataTestId={dataTestId}
                                                    />
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </fieldset>
                            );
                        })}
                    </div>

                    {lockNotice && (
                        <p className="mt-2 text-xs text-content-muted" data-testid={`${dataTestId}-hint`}>
                            {lockNotice}
                        </p>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
