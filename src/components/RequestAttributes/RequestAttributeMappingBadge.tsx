import { Info } from 'lucide-react';
import type { FieldMapping } from 'types/openapi';
import Badge from 'components/Badge';
import { fieldMappingSummary } from 'utils/requestAttributes';

type Props = {
    fieldMapping?: FieldMapping;
    dataTestId?: string;
};

function RequestAttributeMappingBadge({ fieldMapping, dataTestId = 'request-attribute-mapping-badge' }: Readonly<Props>) {
    const summary = fieldMappingSummary(fieldMapping);
    if (!summary) return null;

    const tooltip = `Maps to: ${summary.split(' + ').join(', ')}`;

    return (
        <Badge color="info" size="small" className="mt-1 gap-x-1" title={tooltip} dataTestId={dataTestId}>
            <Info size={12} aria-hidden />
            <span>→ {summary}</span>
        </Badge>
    );
}

export default RequestAttributeMappingBadge;
