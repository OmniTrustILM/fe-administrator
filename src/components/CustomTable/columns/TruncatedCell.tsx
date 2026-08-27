import Tooltip from 'components/Tooltip';
import { useIsTruncated } from 'utils/common-hooks';

type Props = Readonly<{
    /** The value the cell shows, and the full value revealed when it does not fit. */
    value: string;
    dataTestId?: string;
}>;

/**
 * A single-line cell that reveals its full value only when the column is too narrow to show it.
 * Twenty-five rows stay comparable only if every row is the same height, so a long value truncates
 * rather than wraps — and a truncated value the user cannot read back is worse than no column, so
 * the overflow goes into a tooltip. An untruncated value gets none, because a tooltip repeating
 * what is already on screen is noise on every cell of every row.
 *
 * The tooltip wrapper is forced to full width. It is inline-block by default, which would shrink to
 * its content, narrow the span that was just measured, and flip the truncation back off — the
 * measurement would undo the thing it triggered.
 */
export default function TruncatedCell({ value, dataTestId }: Props) {
    const [ref, isTruncated] = useIsTruncated<HTMLSpanElement>(value);

    const text = (
        <span ref={ref} className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" data-testid={dataTestId}>
            {value}
        </span>
    );

    if (!isTruncated) return text;

    return (
        <Tooltip content={value} className="w-full align-bottom" triggerClassName="block w-full">
            {text}
        </Tooltip>
    );
}
