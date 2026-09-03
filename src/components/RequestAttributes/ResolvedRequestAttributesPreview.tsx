import RequestAttributeMappingBadge from 'components/RequestAttributes/RequestAttributeMappingBadge';
import type { AttributeDescriptorModel } from 'types/attributes';
import { isDataAttributeModel } from 'types/attributes';
import { getFieldMapping } from 'utils/requestAttributes';

type Props = Readonly<{
    descriptors: AttributeDescriptorModel[];
    isFetching: boolean;
}>;

/**
 * Read-only preview of a resolved request-attribute set (`GET /v1/certificates/csr/attributes`),
 * shown where an operator decides whether to author their own set instead of inheriting the
 * platform default. One row per attribute: label, required marker and the mapping badge.
 */
export default function ResolvedRequestAttributesPreview({ descriptors, isFetching }: Props) {
    if (isFetching) {
        return (
            <p className="text-sm text-content-subtle" data-testid="resolved-set-loading">
                Loading the resolved request-attribute set&hellip;
            </p>
        );
    }
    if (descriptors.length === 0) {
        return (
            <p className="text-sm text-content-subtle" data-testid="resolved-set-empty">
                The resolved set is currently empty.
            </p>
        );
    }
    return (
        <ul className="space-y-1" data-testid="resolved-set-preview">
            {descriptors.map((descriptor) => (
                <li
                    key={descriptor.uuid ?? descriptor.name}
                    className="flex items-center gap-2 rounded-md border border-divider px-3 py-1.5 text-sm"
                    data-testid="resolved-set-row"
                >
                    <span className="truncate">
                        {isDataAttributeModel(descriptor) ? (descriptor.properties?.label ?? descriptor.name) : descriptor.name}
                    </span>
                    {isDataAttributeModel(descriptor) && descriptor.properties?.required && (
                        <span className="text-xs text-content-subtle">required</span>
                    )}
                    <RequestAttributeMappingBadge fieldMapping={getFieldMapping(descriptor)} />
                </li>
            ))}
        </ul>
    );
}
