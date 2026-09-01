import type { PickerColumn } from 'types/tableColumns';
import { getColumnHeading, getColumnKey } from 'utils/tableColumns';

type Props = Readonly<{
    columns: PickerColumn[];
}>;

/**
 * The header row the current selection would produce, rendered live inside the dialog so a reorder
 * or a rename can be judged without closing anything. Unavailable columns are left out, because
 * they are what the table will not render either.
 */
export default function HeaderPreview({ columns }: Props) {
    const rendered = columns.filter((column) => column.available);

    return (
        <section className="mt-4" aria-labelledby="column-header-preview-label">
            <h3 className="mb-1.5 text-xs font-medium text-content-muted" id="column-header-preview-label">
                Header preview
            </h3>
            <div className="overflow-x-auto rounded-md border border-divider bg-surface-sunken" data-testid="header-preview">
                {rendered.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-content-subtle">No columns to preview.</p>
                ) : (
                    <ul className="m-0 flex list-none items-center gap-4 px-3 py-2">
                        {rendered.map((column) => (
                            <li key={getColumnKey(column)} className="text-xs font-medium whitespace-nowrap text-content">
                                {getColumnHeading(column)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
