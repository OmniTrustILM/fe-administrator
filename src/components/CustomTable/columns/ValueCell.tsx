import { Link } from 'react-router';
import Tooltip from 'components/Tooltip';
import type { ListCellValue } from 'utils/attributes/listCellValues';
import TruncatedCell from './TruncatedCell';

type Props = Readonly<{
    value: ListCellValue;
    dataTestId?: string;
}>;

/**
 * One attribute value in a list cell: its label on a single line, linked when it points at an
 * addressable object, and with anything that does not fit the column — the value itself, or a
 * detail such as a file's mime type — reachable without leaving the row.
 */
export default function ValueCell({ value, dataTestId }: Props) {
    if (value.link) {
        return (
            <Link
                className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                to={`/${value.link.resource}/detail/${value.link.uuid}`}
                data-testid={dataTestId}
            >
                {value.label}
            </Link>
        );
    }

    if (value.detail) {
        return (
            <Tooltip content={`${value.label} (${value.detail})`} className="max-w-full align-bottom" triggerClassName="max-w-full">
                <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap" data-testid={dataTestId}>
                    {value.label}
                </span>
            </Tooltip>
        );
    }

    return <TruncatedCell value={value.label} dataTestId={dataTestId} />;
}
