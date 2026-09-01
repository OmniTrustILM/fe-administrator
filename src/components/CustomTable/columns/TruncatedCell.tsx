import { Link } from 'react-router';
import Tooltip from 'components/Tooltip';
import { useIsTruncated } from 'utils/common-hooks';

type Props = Readonly<{
    /** The value the cell shows, and the full value revealed when it does not fit. */
    value: string;
    /** When set, the measured element is a link to this route rather than plain text. */
    to?: string;
    dataTestId?: string;
}>;

/**
 * A single-line cell that reveals its full value only when the column is too narrow to show it. Rows
 * stay comparable only if they are all one line high, so a long value truncates rather than wraps,
 * and the overflow goes into a tooltip so it stays readable. An untruncated value gets none, or
 * every cell of every row would carry a tooltip repeating what is already on screen.
 *
 * The tooltip wrapper is forced to full width: inline-block would shrink to its content, narrowing
 * the element that was just measured and flipping the truncation back off.
 */
export default function TruncatedCell({ value, to, dataTestId }: Props) {
    const [ref, isTruncated] = useIsTruncated<HTMLElement>(value);

    const className = 'block max-w-full overflow-hidden text-ellipsis whitespace-nowrap';

    const text = to ? (
        <Link ref={ref} className={className} to={to} data-testid={dataTestId}>
            {value}
        </Link>
    ) : (
        <span ref={ref} className={className} data-testid={dataTestId}>
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
