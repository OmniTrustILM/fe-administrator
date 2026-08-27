import { useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from 'components/Dialog';
import type { FilterFieldSource, SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition, PickerColumn, SourcedCatalogueField } from 'types/tableColumns';
import { MAX_COLUMNS, isColumnSelected, moveColumn, resolveColumns, toCatalogueFields, toColumnDefinition } from 'utils/columnPicker';
import AvailableFields from './AvailableFields';
import HeaderPreview from './HeaderPreview';
import SelectedColumns from './SelectedColumns';
import { DEFAULT_SOURCE_LABELS } from './SourceBadge';

export type ColumnPickerProps = Readonly<{
    isOpen: boolean;
    /** Closes without applying anything, discarding every change made in the dialog. */
    onClose: () => void;
    /** Receives the arranged columns. Unavailable ones are already dropped. */
    onSave: (columns: ColumnDefinition[]) => void;
    /** The column catalogue for the resource, i.e. `GET /v1/{resource}/search`. */
    catalogue: SearchFieldDataByGroupDto[];
    /** The columns the view currently holds. */
    columns: ColumnDefinition[];
    /** The platform default set, offered inside the dialog as "Reset to Standard columns". */
    standardColumns?: ColumnDefinition[];
    /** Named in the dialog caption, e.g. "Certificates". */
    resourceLabel?: string;
    /** Resolves a source to its platform label; falls back to the picker's own names. */
    getSourceLabel?: (source: FilterFieldSource) => string;
    dataTestId?: string;
}>;

/**
 * The dialog where a user arranges the columns of a view: what could be shown on the left, what is
 * shown on the right.
 *
 * A single combined list makes "what have I already got?" hard to answer once an organisation has
 * thirty custom attributes, so the two panes are split — search belongs to the left, and ordering,
 * renaming and removal to the right, where position means something. Nothing reaches the API until
 * Save: a half-arranged view must not hit the network on every drag.
 */
export default function ColumnPicker({
    isOpen,
    onClose,
    onSave,
    catalogue,
    columns,
    standardColumns = [],
    resourceLabel,
    getSourceLabel,
    dataTestId = 'column-picker',
}: ColumnPickerProps) {
    const fields = useMemo(() => toCatalogueFields(catalogue), [catalogue]);
    const [draft, setDraft] = useState<PickerColumn[]>([]);
    const [search, setSearch] = useState('');

    // Seeded on open rather than on every change to `columns`, so the dialog holds a working copy
    // and Cancel is simply never reading it back.
    useEffect(() => {
        if (!isOpen) return;
        setDraft(resolveColumns(columns, fields));
        setSearch('');
    }, [isOpen, columns, fields]);

    const resolveSourceLabel = useCallback(
        (source: FilterFieldSource) => getSourceLabel?.(source) ?? DEFAULT_SOURCE_LABELS[source],
        [getSourceLabel],
    );

    const handleAdd = useCallback((field: SourcedCatalogueField) => {
        setDraft((current) => {
            // Selection stops at the cap rather than silently ignoring further additions, and a
            // field already shown is never added twice.
            if (current.length >= MAX_COLUMNS || isColumnSelected(current, field)) return current;
            return [...current, { ...toColumnDefinition(field), available: true }];
        });
    }, []);

    const handleRename = useCallback((index: number, label: string) => {
        setDraft((current) =>
            current.map((column, position) => {
                if (position !== index) return column;
                const trimmed = label.trim();
                // An empty or unchanged heading is not an override: clearing it puts the column back
                // to following the catalogue, which is what `label: null` means in the stored shape.
                const { label: _previous, ...rest } = column;
                return trimmed && trimmed !== column.catalogueLabel ? { ...rest, label: trimmed } : rest;
            }),
        );
    }, []);

    const handleRevert = useCallback((index: number) => {
        setDraft((current) =>
            current.map((column, position) => {
                if (position !== index) return column;
                const { label: _removed, ...rest } = column;
                return rest;
            }),
        );
    }, []);

    const handleRemove = useCallback((index: number) => {
        setDraft((current) => current.filter((_column, position) => position !== index));
    }, []);

    const handleMove = useCallback((from: number, to: number) => {
        setDraft((current) => moveColumn(current, from, to));
    }, []);

    const handleResetToStandard = useCallback(() => {
        setDraft(resolveColumns(standardColumns, fields));
    }, [standardColumns, fields]);

    const handleSave = useCallback(() => {
        // An unresolved column is dropped on save; until then it stayed visible so the user could
        // see what had gone rather than watch a heading disappear.
        onSave(draft.filter((column) => column.available).map(({ available: _available, ...column }) => column));
    }, [draft, onSave]);

    const isAtCap = draft.length >= MAX_COLUMNS;

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            size="xl"
            dataTestId={dataTestId}
            caption={
                <span className="flex flex-col">
                    <span>Edit columns</span>
                    {resourceLabel && (
                        <span className="text-xs font-normal text-content-muted">{`${resourceLabel} · visible only to you`}</span>
                    )}
                </span>
            }
            body={
                <div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <AvailableFields
                            fields={fields}
                            selected={draft}
                            search={search}
                            onSearchChange={setSearch}
                            onAdd={handleAdd}
                            isAtCap={isAtCap}
                            getSourceLabel={resolveSourceLabel}
                        />
                        <SelectedColumns
                            columns={draft}
                            getSourceLabel={resolveSourceLabel}
                            onRename={handleRename}
                            onRevert={handleRevert}
                            onRemove={handleRemove}
                            onMove={handleMove}
                            onResetToStandard={handleResetToStandard}
                        />
                    </div>
                    <HeaderPreview columns={draft} />
                </div>
            }
            buttons={[
                { key: 'cancel', color: 'secondary', variant: 'outline', body: 'Cancel', onClick: onClose },
                // The API rejects an empty column set, so this is the one place the dialog blocks
                // outright rather than warning.
                { key: 'save', color: 'primary', body: 'Save', onClick: handleSave, disabled: draft.length === 0 },
            ]}
        />
    );
}
