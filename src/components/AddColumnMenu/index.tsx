import * as Popover from '@radix-ui/react-popover';
import cn from 'classnames';
import { CHECKBOX_INPUT_CLASS } from 'components/Checkbox';
import { DEFAULT_SOURCE_LABELS } from 'components/SourceBadge';
import { Plus, Search } from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { isColumnSelected } from 'utils/columnPicker';
import { getColumnKey } from 'utils/tableColumns';
import { toMenuColumns } from './sourceColumns';

const LOCKED_AT_LAST_COLUMN = 'A view must keep at least one column';
const LOCKED_WHILE_LOADING = 'Columns cannot be changed while the page is loading';

function getEmptyState(isPublishing: boolean, isCatalogueLoaded: boolean): string {
    if (isPublishing) return 'No match';
    return isCatalogueLoaded ? 'None published' : 'Loading…';
}

type Props = Readonly<{
    /** The catalogue fields on offer, already through the picker's displayable and property gates. */
    fields: SourcedCatalogueField[];
    /**
     * Whether the catalogue read has settled. Until it has, an empty `fields` means "not yet", which
     * must not be shown as the answer that this resource publishes nothing.
     */
    isCatalogueLoaded?: boolean;
    /** The columns the table is showing, which is what the checkboxes report. */
    columns: ColumnDefinition[];
    /**
     * Adds the field as the last column, or takes it away when it is already one. Left out while the
     * host cannot yet keep what a toggle produces, which locks every checkbox rather than accept a
     * change something else is about to overwrite.
     */
    onToggle?: (field: SourcedCatalogueField) => void;
    /** Opens the full column dialog, where ordering, renaming and reset live. */
    onEditColumns?: () => void;
    getSourceLabel?: (source: FilterFieldSource) => string;
    /** Lets the host hand focus back to the trigger after a dialog the menu opened has closed. */
    triggerRef?: React.RefObject<HTMLButtonElement | null>;
    dataTestId?: string;
}>;

/**
 * The menu behind the table's trailing **+**: the whole catalogue as four columns, one per source,
 * each field a checkbox.
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
    onEditColumns,
    getSourceLabel,
    triggerRef,
    dataTestId = 'add-column-menu',
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Radix hands focus back to the trigger as the popover unmounts, which would pull it out of the
    // dialog the menu has just opened.
    const isHandingOverToDialog = useRef(false);

    const menuColumns = useMemo(() => toMenuColumns(fields, search), [fields, search]);

    const resolveSourceLabel = useCallback(
        (source: FilterFieldSource) => getSourceLabel?.(source) ?? DEFAULT_SOURCE_LABELS[source],
        [getSourceLabel],
    );

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
                ref={triggerRef}
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
                    collisionPadding={8}
                    aria-label="Add column"
                    data-testid={dataTestId}
                    onCloseAutoFocus={(event) => {
                        if (!isHandingOverToDialog.current) return;
                        isHandingOverToDialog.current = false;
                        event.preventDefault();
                    }}
                    className="z-[100] w-[min(56rem,calc(100vw-2rem))] rounded-lg border-divider bg-surface-raised p-3 shadow-md dark:border"
                >
                    <div className="relative">
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

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                        {menuColumns.map((menuColumn) => {
                            const label = resolveSourceLabel(menuColumn.source);

                            return (
                                <fieldset
                                    key={menuColumn.source}
                                    className="min-w-0"
                                    data-testid={`${dataTestId}-source-${menuColumn.source}`}
                                >
                                    <legend className="mb-1 text-xs font-semibold tracking-wide text-content-muted uppercase">
                                        {label}
                                    </legend>

                                    <div className="max-h-64 overflow-y-auto">
                                        {menuColumn.fields.length === 0 ? (
                                            <p className="px-1 py-1 text-xs text-content-subtle">
                                                {getEmptyState(menuColumn.isPublishing, isCatalogueLoaded)}
                                            </p>
                                        ) : (
                                            <ul className="m-0 flex list-none flex-col p-0">
                                                {menuColumn.fields.map((field) => {
                                                    const key = getColumnKey(field);
                                                    const isSelected = isColumnSelected(columns, field);
                                                    // The API rejects a view with no columns, so the one left standing holds.
                                                    const lockReason = isLocked || (isSelected && isAtLastColumn) ? lockNotice : undefined;

                                                    return (
                                                        <li key={key}>
                                                            <label
                                                                className={cn(
                                                                    'flex items-center gap-2 rounded-md px-1 py-1 text-sm',
                                                                    lockReason
                                                                        ? 'cursor-not-allowed opacity-60'
                                                                        : 'cursor-pointer hover:bg-surface-hover',
                                                                )}
                                                                title={lockReason}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    disabled={lockReason !== undefined}
                                                                    onChange={() => onToggle?.(field)}
                                                                    data-testid={`${dataTestId}-field-${key}`}
                                                                    className={cn('shrink-0', CHECKBOX_INPUT_CLASS)}
                                                                />
                                                                <span className="min-w-0 flex-1 truncate text-content">
                                                                    {field.fieldLabel}
                                                                </span>
                                                                {/* The source is what tells two like-named fields apart, so
                                                                    it belongs in the accessible name of every checkbox. */}
                                                                <span className="sr-only">
                                                                    {lockReason ? `${label}. ${lockReason}` : label}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    );
                                                })}
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

                    {onEditColumns && (
                        <div className="mt-3 flex justify-end border-t border-divider pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    isHandingOverToDialog.current = true;
                                    // Through the same path a dismissal takes, so the search is cleared
                                    // here too: a controlled close does not reach `onOpenChange` itself.
                                    onOpenChange(false);
                                    onEditColumns();
                                }}
                                data-testid={`${dataTestId}-edit-columns`}
                                className="rounded-md px-2 py-1 text-sm font-medium text-brand hover:bg-brand-subtle focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                Edit columns…
                            </button>
                        </div>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
