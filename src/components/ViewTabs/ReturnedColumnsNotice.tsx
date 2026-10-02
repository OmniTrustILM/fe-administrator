import Button from 'components/Button';
import { TriangleAlert } from 'lucide-react';
import type { PickerColumn } from 'types/tableColumns';
import { getColumnHeading } from 'utils/tableColumns';

type Props = Readonly<{
    returned: PickerColumn[];
    /** The returned columns whose stored filters are withheld as well. */
    unfiltered?: PickerColumn[];
    onShow: () => void;
    onRemove?: () => void;
    /** Whether a view write is already out. A second one would be built from the first one's optimistic state. */
    isBusy?: boolean;
    dataTestId: string;
}>;

const list = (names: string[]): string => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/**
 * What a view says when an attribute column it held while the attribute was gone resolves again.
 *
 * A column names its attribute only by name and content type, so the attribute now answering may be a
 * different one created under the same pair. The column stays off the table until the user chooses, and
 * the notice has no dismissal, because dismissing it would leave the column hidden with nothing naming it.
 */
export default function ReturnedColumnsNotice({ returned, unfiltered = [], onShow, onRemove, isBusy = false, dataTestId }: Props) {
    if (returned.length === 0) return null;

    const names = returned.map(getColumnHeading);
    const subject = names.length === 1 ? `${names[0]} is` : `${list(names)} are`;
    const pronoun = names.length === 1 ? 'it' : 'them';
    const identity =
        names.length === 1
            ? 'may be a different attribute with the same name and content type'
            : 'may be different attributes with the same names and content types';
    const withheld =
        unfiltered.length === 0
            ? `showing ${pronoun}`
            : unfiltered.length === returned.length
              ? `showing or filtering by ${pronoun}`
              : `showing ${pronoun}, and is not filtering by ${list(unfiltered.map(getColumnHeading))}`;
    const message = `${subject} available again, but ${identity}, so this view is not ${withheld}.`;

    return (
        <output
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warning-surface px-3 py-2 text-sm text-content"
            data-testid={dataTestId}
        >
            <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{message}</span>
            <Button variant="transparent" color="secondary" onClick={onShow} data-testid={`${dataTestId}-show`}>
                Show in view
            </Button>
            {onRemove && (
                <Button variant="transparent" color="secondary" onClick={onRemove} disabled={isBusy} data-testid={`${dataTestId}-remove`}>
                    Remove from view
                </Button>
            )}
        </output>
    );
}
