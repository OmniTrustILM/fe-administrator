import Badge from 'components/Badge';

export type BooleanCellProps = Readonly<{
    value: boolean | undefined;
    /** Rendered when the value is `true` / `false`. Defaults to Yes / No. */
    trueLabel?: string;
    falseLabel?: string;
    dataTestId?: string;
}>;

/**
 * A yes/no cell for a boolean column.
 *
 * `undefined` is not `false`: an entry that does not carry the field renders `null`, which the row
 * turns into the shared empty state. Answering "No" for an absent value would state something the
 * listing never said.
 *
 * Both states are badges rather than plain text, because a column of bare "No" reads as a column of
 * failures; the colour is what separates "not set that way" from "something is wrong".
 */
export default function BooleanCell({ value, trueLabel = 'Yes', falseLabel = 'No', dataTestId }: BooleanCellProps) {
    if (value === undefined) return null;

    return (
        <Badge color={value ? 'success' : 'gray'} size="small" dataTestId={dataTestId}>
            {value ? trueLabel : falseLabel}
        </Badge>
    );
}
