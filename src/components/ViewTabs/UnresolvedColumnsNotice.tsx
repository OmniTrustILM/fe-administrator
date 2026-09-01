import Button from 'components/Button';
import { TriangleAlert } from 'lucide-react';
import type { PickerColumn } from 'types/tableColumns';
import { getColumnHeading } from 'utils/tableColumns';

type Props = Readonly<{
    unavailable: PickerColumn[];
    /** How many columns the view stores in total, so the notice can say how much of it opened. */
    storedCount: number;
    /** Whether nothing resolved at all, so the table fell back to the platform column set. */
    fellBackToStandard: boolean;
    onReview?: () => void;
    dataTestId: string;
}>;

const list = (columns: PickerColumn[]): string => {
    const names = columns.map(getColumnHeading);
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * What a view says when one of its columns names a field the catalogue no longer publishes.
 *
 * Silently skipping the column is the tempting option and the wrong one: a heading vanishes with no
 * explanation, and the user's next move is to hunt for a field that no longer exists. Nothing is
 * deleted server-side either — the stored view keeps the column until someone removes it.
 */
export default function UnresolvedColumnsNotice({ unavailable, storedCount, fellBackToStandard, onReview, dataTestId }: Props) {
    if (unavailable.length === 0) return null;

    const shown = storedCount - unavailable.length;

    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warning-surface px-3 py-2 text-sm text-content"
            role="status"
            data-testid={dataTestId}
        >
            <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
                {fellBackToStandard
                    ? `${list(unavailable)} ${unavailable.length === 1 ? 'is' : 'are'} no longer available, so this view is showing the standard columns.`
                    : `${list(unavailable)} ${unavailable.length === 1 ? 'is' : 'are'} no longer available, so this view is showing ${shown} of its ${storedCount} columns.`}
            </span>
            {onReview && (
                <Button variant="transparent" color="secondary" onClick={onReview} data-testid={`${dataTestId}-review`}>
                    Review columns
                </Button>
            )}
        </div>
    );
}
