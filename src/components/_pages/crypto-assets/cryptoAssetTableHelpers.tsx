import Badge from 'components/Badge';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PqcVerdictBadge from 'components/PqcVerdictBadge';
import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { PlatformEnumMap } from 'types/enums';
import type { CryptographicAssetDto } from 'types/openapi';
import { toFiniteNumber } from 'utils/common-utils';

export interface BuildCryptoAssetRowsOpts {
    typeEnum: PlatformEnumMap;
    pqcVerdictEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
}

export const QUARANTINE_TOOLTIP = 'Sources make contradicting claims about this asset; the record is quarantined pending reconciliation';

// Nothing sorts: paging is served, and core answers 422 to any sort while no field is marked sortable.
export const CRYPTO_ASSET_HEADERS: TableHeader[] = [
    { id: 'name', content: 'Name' },
    { id: 'type', content: 'Type' },
    { id: 'pqcVerdict', content: 'PQC readiness' },
    { id: 'sourceCbomCount', content: 'Source CBOMs', align: 'right' },
    { id: 'occurrenceCount', content: 'Occurrences', align: 'right' },
];

export function buildCryptoAssetRows(
    assets: CryptographicAssetDto[],
    { typeEnum, pqcVerdictEnum, getEnumLabel }: BuildCryptoAssetRowsOpts,
): TableDataRow[] {
    return assets.map((asset) => ({
        id: asset.uuid,
        columns: [
            <span key="name" className="flex items-center gap-2">
                <Link className="font-medium" to={`/cryptoassets/detail/${asset.uuid}`}>
                    {asset.name}
                </Link>
                {asset.quarantined && (
                    <Badge color="warning" title={QUARANTINE_TOOLTIP} dataTestId="crypto-asset-quarantined-badge">
                        <TriangleAlert size={12} strokeWidth={2.2} aria-hidden="true" />
                        Quarantined
                    </Badge>
                )}
            </span>,
            <Badge key="type" color="secondary">
                {getEnumLabel(typeEnum, asset.type)}
            </Badge>,
            <PqcVerdictBadge key="verdict" verdict={asset.pqcVerdict} label={getEnumLabel(pqcVerdictEnum, asset.pqcVerdict)} />,
            <span key="sources" className="tabular-nums">
                {toFiniteNumber(asset.sourceCbomCount).toLocaleString()}
            </span>,
            <span key="occurrences" className="tabular-nums">
                {toFiniteNumber(asset.occurrenceCount).toLocaleString()}
            </span>,
        ],
    }));
}
