import Button from 'components/Button';
import { TriangleAlert } from 'lucide-react';

type Props = Readonly<{
    /** Labels of the fields whose stored filters are withheld, on fields the view has no column for. */
    fields: string[];
    onApply: () => void;
    onRemove: () => void;
    /** Whether a view write is already out. A second one would be built from the first one's optimistic state. */
    isBusy?: boolean;
    dataTestId: string;
}>;

const list = (names: string[]): string => (names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/**
 * What a view says about a stored filter whose attribute Core reports as replaced, on a field the view shows no column
 * for. The returned-columns notice names only columns, so without this the filter would be withheld with nothing
 * naming it, and the view would list more rows than it was saved to. It has no dismissal for the same reason.
 */
export default function HeldFiltersNotice({ fields, onApply, onRemove, isBusy = false, dataTestId }: Props) {
    if (fields.length === 0) return null;

    const subject = fields.length === 1 ? 'the filter on' : 'the filters on';
    const identity =
        fields.length === 1
            ? 'may be a different attribute with the same name and content type'
            : 'may be different attributes with the same names and content types';
    const message = `${list(fields)} ${identity}, so this view is not applying ${subject} ${fields.length === 1 ? 'it' : 'them'}.`;

    return (
        <output
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-warning-surface px-3 py-2 text-sm text-content"
            data-testid={dataTestId}
        >
            <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{message}</span>
            <Button variant="transparent" color="secondary" onClick={onApply} disabled={isBusy} data-testid={`${dataTestId}-apply`}>
                Apply filter
            </Button>
            <Button variant="transparent" color="secondary" onClick={onRemove} disabled={isBusy} data-testid={`${dataTestId}-remove`}>
                Remove filter
            </Button>
        </output>
    );
}
