import { Link } from 'react-router';
import Badge from 'components/Badge';
import Toggletip from 'components/Toggletip';
import { listCellLinkPath, type ListCellValue } from 'utils/attributes/listCellValues';
import ValueCell from './ValueCell';

const revealed = (value: ListCellValue) => {
    if (value.link) return <Link to={listCellLinkPath(value.link)}>{value.label}</Link>;
    if (value.detail) return `${value.label} (${value.detail})`;
    return value.label;
};

type Props = Readonly<{
    /** Every value the attribute holds, in `item_order`. */
    values: ListCellValue[];
    dataTestId?: string;
}>;

/**
 * A multi-valued attribute in a list cell: the first value on the cell's single line, with the rest
 * behind a `+N` pill. Every value is repeated inside the reveal, so the first one does not have to
 * be read twice, and a value that was navigable in the cell stays navigable there.
 */
export default function MultiValueCell({ values, dataTestId }: Props) {
    const [first, ...rest] = values;

    if (rest.length === 0) return <ValueCell value={first} dataTestId={dataTestId} />;

    return (
        // `items-center` on a nowrap flex row keeps the pill inside the cell's own line box, so a
        // row carrying several values is exactly as tall as one carrying a single value.
        <span className="flex min-w-0 items-center gap-1 whitespace-nowrap" data-testid={dataTestId}>
            <ValueCell value={first} />
            <Toggletip
                ariaLabel={`Show all ${values.length} values`}
                triggerClassName="shrink-0"
                dataTestId={dataTestId ? `${dataTestId}-overflow` : 'multi-value-overflow'}
                triggerContent={
                    <Badge color="secondary" size="small">
                        {`+${rest.length}`}
                    </Badge>
                }
                content={
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {values.map((value, index) => (
                            // Values are free text and may repeat, so a value's position in
                            // item_order is the only stable identity it has here.
                            <li key={`${value.label}-${index}`}>{revealed(value)}</li>
                        ))}
                    </ul>
                }
            />
        </span>
    );
}
