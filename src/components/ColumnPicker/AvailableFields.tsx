import { Plus, Search } from 'lucide-react';
import type { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { groupCatalogueFields, isColumnSelected } from 'utils/columnPicker';
import { getColumnKey } from 'utils/tableColumns';
import SourceBadge from './SourceBadge';

type Props = Readonly<{
    fields: SourcedCatalogueField[];
    selected: ColumnDefinition[];
    search: string;
    onSearchChange: (search: string) => void;
    onAdd: (field: SourcedCatalogueField) => void;
    /** True once the selection has reached the cap; add controls go quiet but the list stays browsable. */
    isAtCap: boolean;
    getSourceLabel: (source: FilterFieldSource) => string;
}>;

/**
 * What could be shown. Splitting this from the selected columns gives search a natural home and
 * keeps ordering, renaming and removal on the other side, where position actually means something.
 */
export default function AvailableFields({ fields, selected, search, onSearchChange, onAdd, isAtCap, getSourceLabel }: Props) {
    const groups = groupCatalogueFields(fields, search);

    return (
        <section className="flex min-h-0 flex-col" aria-labelledby="available-fields-heading">
            <h3 id="available-fields-heading" className="mb-2 text-sm font-semibold text-content">
                Available fields
            </h3>

            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute top-1/2 start-2.5 -translate-y-1/2 text-content-subtle"
                    aria-hidden
                />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={`Search ${fields.length} fields...`}
                    aria-label="Search available fields"
                    data-testid="available-fields-search"
                    className="w-full rounded-md border border-divider bg-surface-raised py-1.5 ps-8 pe-2.5 text-sm text-content placeholder:text-content-subtle focus:border-brand focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand"
                />
            </div>

            {isAtCap && (
                <p className="mt-2 text-xs text-warning" data-testid="available-fields-cap-hint">
                    Remove a column before adding another.
                </p>
            )}

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto" data-testid="available-fields-list">
                {groups.length === 0 ? (
                    <p className="px-1 py-3 text-sm text-content-subtle" data-testid="available-fields-empty">
                        {fields.length === 0 ? 'This resource publishes no columns.' : 'No field matches your search.'}
                    </p>
                ) : (
                    groups.map((group) => (
                        <div key={group.source} className="mb-3">
                            <h4 className="mb-1 text-xs font-semibold tracking-wide text-content-muted uppercase">
                                {getSourceLabel(group.source)}
                            </h4>
                            <ul className="m-0 flex list-none flex-col p-0">
                                {group.fields.map((field) => {
                                    const added = isColumnSelected(selected, field);
                                    return (
                                        <li
                                            key={getColumnKey(field)}
                                            className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-surface-hover"
                                            data-testid={`available-field-${getColumnKey(field)}`}
                                        >
                                            <SourceBadge source={field.fieldSource} label={getSourceLabel(field.fieldSource)} />
                                            <span className="min-w-0 flex-1 truncate text-sm text-content">{field.fieldLabel}</span>
                                            {field.sortable !== true && (
                                                <span className="shrink-0 text-xs text-content-subtle" title="This field cannot be sorted">
                                                    not sortable
                                                </span>
                                            )}
                                            {added ? (
                                                <span className="shrink-0 text-xs text-content-muted" data-testid="field-added">
                                                    added
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onAdd(field)}
                                                    disabled={isAtCap}
                                                    // Kept listed and searchable at the cap: hiding what cannot
                                                    // currently be added would make the catalogue look broken.
                                                    className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium text-brand hover:bg-brand-subtle disabled:cursor-not-allowed disabled:text-content-subtle disabled:hover:bg-transparent"
                                                    data-testid={`add-field-${getColumnKey(field)}`}
                                                >
                                                    <Plus size={12} aria-hidden />
                                                    add
                                                    <span className="sr-only">{` ${field.fieldLabel} as a column`}</span>
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
