import Badge from 'components/Badge';
import { type CellRegistry, TruncatedCell } from 'components/CustomTable/columns';
import PqcVerdictBadge from 'components/PqcVerdictBadge';
import { TriangleAlert } from 'lucide-react';
import type { PlatformEnumMap } from 'types/enums';
import { type CryptographicAssetDto, FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { toFiniteNumber } from 'utils/common-utils';

export interface BuildCryptoAssetCellsOpts {
    typeEnum: PlatformEnumMap;
    pqcVerdictEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    getEnumDescription: (enumMap: PlatformEnumMap, key: string | undefined) => string | undefined;
}

export const QUARANTINE_TOOLTIP = 'Sources make contradicting claims about this asset; the record is quarantined pending reconciliation';

/**
 * The platform default column set for the crypto asset inventory.
 *
 * `CBOM_ASSET_OCCURRENCE_COUNT` is not in the filter-field catalogue, so it is display-only — shown here, absent from
 * the picker, not sortable, and dropped on write by `toStorableColumns`. It keeps a natural identifier so that
 * cataloguing it is the only change needed.
 */
export const CRYPTO_ASSET_COLUMNS: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CBOM_ASSET_NAME', catalogueLabel: 'Name', type: FilterFieldType.String },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CBOM_ASSET_TYPE',
        catalogueLabel: 'Asset Type',
        label: 'Type',
        type: FilterFieldType.List,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CBOM_ASSET_PQC_VERDICT',
        catalogueLabel: 'PQC Readiness',
        label: 'PQC readiness',
        type: FilterFieldType.List,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CBOM_ASSET_SOURCE_COUNT',
        catalogueLabel: 'Source CBOMs',
        type: FilterFieldType.Number,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CBOM_ASSET_OCCURRENCE_COUNT',
        catalogueLabel: 'Occurrences',
        type: FilterFieldType.Number,
    },
];

function countCell(count: number | undefined) {
    return <span className="tabular-nums">{toFiniteNumber(count).toLocaleString()}</span>;
}

export function buildCryptoAssetCellRegistry({
    typeEnum,
    pqcVerdictEnum,
    getEnumLabel,
    getEnumDescription,
}: BuildCryptoAssetCellsOpts): CellRegistry<CryptographicAssetDto> {
    return {
        'property:CBOM_ASSET_NAME': (asset) => (
            <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0">
                    <TruncatedCell
                        value={asset.name ?? asset.uuid}
                        to={`/cryptoassets/detail/${asset.uuid}`}
                        dataTestId="crypto-asset-name"
                    />
                </span>
                {asset.quarantined && (
                    <Badge className="shrink-0" color="warning" title={QUARANTINE_TOOLTIP} dataTestId="crypto-asset-quarantined-badge">
                        <TriangleAlert size={12} strokeWidth={2.2} aria-hidden="true" />
                        Quarantined
                    </Badge>
                )}
            </span>
        ),
        'property:CBOM_ASSET_TYPE': (asset) => <Badge color="secondary">{getEnumLabel(typeEnum, asset.type)}</Badge>,
        'property:CBOM_ASSET_PQC_VERDICT': (asset) => (
            <PqcVerdictBadge
                verdict={asset.pqcVerdict}
                label={getEnumLabel(pqcVerdictEnum, asset.pqcVerdict)}
                title={getEnumDescription(pqcVerdictEnum, asset.pqcVerdict)}
            />
        ),
        'property:CBOM_ASSET_SOURCE_COUNT': (asset) => countCell(asset.sourceCbomCount),
        'property:CBOM_ASSET_OCCURRENCE_COUNT': (asset) => countCell(asset.occurrenceCount),
    };
}
