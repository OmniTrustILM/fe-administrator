import Badge from 'components/Badge';
import Toggletip from 'components/Toggletip';
import type { ListCellValue } from 'utils/attributes/listCellValues';
import ValueCell from './ValueCell';

type Props = Readonly<{
    /** Every value the attribute holds, in `item_order`. */
    values: ListCellValue[];
    dataTestId?: string;
}>;

/**
 * A multi-valued attribute in a list cell: the first value plus a `+N` pill that reveals the rest.
 * Joining values with `', '` — which the certificates Groups cell does today — turns five values
 * into one ever-widening line, and that does not survive a user adding ten more columns. The `+N`
 * treatment is the connector capability cell's, adopted rather than reinvented.
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
                            <li key={`${value.label}-${index}`}>{value.detail ? `${value.label} (${value.detail})` : value.label}</li>
                        ))}
                    </ul>
                }
            />
        </span>
    );
}
