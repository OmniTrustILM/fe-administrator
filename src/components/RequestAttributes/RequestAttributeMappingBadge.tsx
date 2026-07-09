import { Info } from 'lucide-react';
import type { FieldMapping } from 'types/openapi';
import Badge from 'components/Badge';
import { fieldMappingTokens } from 'utils/requestAttributes';

type Props = {
    fieldMapping?: FieldMapping;
    dataTestId?: string;
};

function RequestAttributeMappingBadge({ fieldMapping, dataTestId = 'request-attribute-mapping-badge' }: Readonly<Props>) {
    const tokens = fieldMappingTokens(fieldMapping);
    if (tokens.length === 0) return null;

    const summary = tokens.join(' + ');
    const tooltip = `Maps to: ${tokens.join(', ')}`;

    return (
        <Badge color="info" size="small" className="mt-1" title={tooltip} dataTestId={dataTestId}>
            <Info size={12} aria-hidden />
            <span>
                <span aria-hidden>→ </span>
                {summary}
            </span>
        </Badge>
    );
}

export default RequestAttributeMappingBadge;
