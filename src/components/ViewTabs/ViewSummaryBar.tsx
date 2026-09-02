import Button from 'components/Button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ColumnDefinition } from 'types/tableColumns';
import { type ColumnSort, getColumnHeading, getSortKey } from 'utils/tableColumns';

type Props = Readonly<{
    columns: ColumnDefinition[];
    sort?: ColumnSort;
    /** Whether the table has drifted from what the active view stores. */
    isDirty: boolean;
    /** Standard has no stored row to save into, so the offer is Save as view… instead. */
    isStandard: boolean;
    isBusy: boolean;
    onRevert: () => void;
    onSave: () => void;
    dataTestId: string;
}>;

/**
 * The row under the tab strip: what the view is showing, and — once it has drifted — the offer to
 * keep the change or drop it.
 *
 * The sort is named here as well as on its own header because the active sort has to stay legible
 * after that header has scrolled out of a twelve-column table.
 */
export default function ViewSummaryBar({ columns, sort, isDirty, isStandard, isBusy, onRevert, onSave, dataTestId }: Props) {
    const sorted = sort ? columns.find((column) => getSortKey(sort) === `${column.fieldSource}:${column.fieldIdentifier}`) : undefined;
    const SortGlyph = sort?.direction === 'desc' ? ArrowDown : ArrowUp;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-2 text-sm text-content-subtle" data-testid={dataTestId}>
            <span data-testid={`${dataTestId}-columns`}>{`${columns.length} ${columns.length === 1 ? 'column' : 'columns'}`}</span>

            {sort && (
                <span className="inline-flex items-center gap-x-1" data-testid={`${dataTestId}-sort`}>
                    {`Sorted by ${sorted ? getColumnHeading(sorted) : sort.fieldIdentifier}`}
                    <SortGlyph className="size-3.5" aria-label={sort.direction === 'desc' ? 'descending' : 'ascending'} />
                </span>
            )}

            {isDirty && (
                <div className="ml-auto flex items-center gap-x-3">
                    <span className="text-content" data-testid={`${dataTestId}-unsaved`}>
                        {isStandard ? 'Unsaved changes — Standard cannot hold them' : 'Unsaved changes to this view'}
                    </span>
                    <Button variant="transparent" color="secondary" onClick={onRevert} data-testid={`${dataTestId}-revert`}>
                        Revert
                    </Button>
                    <Button color="primary" onClick={onSave} disabled={isBusy} data-testid={`${dataTestId}-save`}>
                        {isStandard ? 'Save as view…' : 'Save to view'}
                    </Button>
                </div>
            )}
        </div>
    );
}
