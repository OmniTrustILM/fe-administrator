import { Info } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FieldMapping } from 'types/openapi';
import { OidCategory } from 'types/openapi';
import Badge from 'components/Badge';
import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { buildRdnCodeByOid } from 'utils/oid';
import { fieldMappingTokens } from 'utils/requestAttributes';

type Props = {
    fieldMapping?: FieldMapping;
    dataTestId?: string;
};

function RequestAttributeMappingBadge({ fieldMapping, dataTestId = 'request-attribute-mapping-badge' }: Readonly<Props>) {
    const dispatch = useDispatch();
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);

    // System RDNs (CN, O, …) are stored on the mapping as their dotted OID; the fetch is guarded so
    // this dispatch resolves the code list once even though the badge renders per mapped attribute.
    useEffect(() => {
        dispatch(oidActions.listSystemOids());
    }, [dispatch]);

    const rdnCodeByOid = useMemo(
        () =>
            buildRdnCodeByOid([
                ...(systemOidsByCategory[OidCategory.RdnAttributeType] ?? []),
                ...(oidsByCategory[OidCategory.RdnAttributeType] ?? []),
            ]),
        [systemOidsByCategory, oidsByCategory],
    );

    const tokens = fieldMappingTokens(fieldMapping, rdnCodeByOid);
    if (tokens.length === 0) return null;

    const summary = tokens.join(' + ');
    const tooltip = `Maps to: ${tokens.join(', ')}`;

    return (
        <Badge color="info" size="small" title={tooltip} dataTestId={dataTestId}>
            <Info size={12} aria-hidden />
            <span>
                <span aria-hidden>→ </span>
                {summary}
            </span>
        </Badge>
    );
}

export default RequestAttributeMappingBadge;
