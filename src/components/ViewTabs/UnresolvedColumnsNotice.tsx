import Button from 'components/Button';
import { TriangleAlert } from 'lucide-react';
import type { PickerColumn } from 'types/tableColumns';
import { getColumnHeading } from 'utils/tableColumns';

type Props = Readonly<{
    /** The stored columns this table cannot render, which may be none even when it fell back. */
    unavailable: PickerColumn[];
    /** How many columns the view arrived with, so the notice can say how much of it opened. */
    storedCount: number;
    /** Whether nothing could be rendered, so the table fell back to the platform column set. */
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
 * What a view says when a column it stores cannot be put on the table.
 *
 * Silently skipping it is the tempting option and the wrong one: a heading vanishes with no
 * explanation, and the user's next move is to hunt for a field that is not there. Nothing is deleted
 * server-side either — the stored view keeps the column until someone saves over it.
 *
 * A fallback can reach this with nothing to name, so the two are worded separately. Which cases
 * arrive, and why, is written down beside `resolveView`.
 */
export default function UnresolvedColumnsNotice({ unavailable, storedCount, fellBackToStandard, onReview, dataTestId }: Props) {
    if (unavailable.length === 0 && !fellBackToStandard) return null;

    const named = unavailable.length > 0 ? list(unavailable) : undefined;
    const shown = storedCount - unavailable.length;

    const message = fellBackToStandard
        ? `${named ? `${named} cannot be shown` : "None of this view's columns can be shown"}, so it is showing the standard columns.`
        : `${named} cannot be shown, so this view is showing ${shown} of its ${storedCount} columns.`;

    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warning-surface px-3 py-2 text-sm text-content"
            role="status"
            data-testid={dataTestId}
        >
            <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{message}</span>
            {onReview && (
                <Button variant="transparent" color="secondary" onClick={onReview} data-testid={`${dataTestId}-review`}>
                    Review columns
                </Button>
            )}
        </div>
    );
}
