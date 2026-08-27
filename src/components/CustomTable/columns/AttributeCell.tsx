import cn from 'classnames';
import type { BaseAttributeContentModel } from 'types/attributes';
import { AttributeContentType } from 'types/openapi';
import { getListCellValues } from 'utils/attributes/listCellValues';
import EmptyCell from './EmptyCell';
import MultiValueCell from './MultiValueCell';

type Props = Readonly<{
    contentType: AttributeContentType | undefined;
    content: BaseAttributeContentModel[] | undefined;
    dataTestId?: string;
}>;

/** Content types whose digits should line up down the column. */
const TABULAR_CONTENT_TYPES: ReadonlySet<AttributeContentType> = new Set([
    AttributeContentType.Integer,
    AttributeContentType.Float,
    AttributeContentType.Date,
    AttributeContentType.Time,
    AttributeContentType.Datetime,
]);

/**
 * An attribute-sourced cell. Absence is answered first — a row simply may not have the attribute —
 * and only then does the content type decide how the values are rendered.
 */
export default function AttributeCell({ contentType, content, dataTestId }: Props) {
    // A column whose catalogue entry carries no content type cannot be interpreted; that is a
    // missing value as far as the row is concerned, not a reason to render something arbitrary.
    const values = contentType ? getListCellValues(contentType, content) : [];

    if (values.length === 0) return <EmptyCell />;

    const isTabular = contentType !== undefined && TABULAR_CONTENT_TYPES.has(contentType);

    return (
        <span className={cn('block min-w-0', { 'tabular-nums': isTabular })}>
            <MultiValueCell values={values} dataTestId={dataTestId} />
        </span>
    );
}
