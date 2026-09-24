import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { CellRegistry } from 'components/CustomTable/columns';
import type { EnumItemModel } from 'types/enums';
import type { CbomDto } from 'types/openapi';
import { FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { toFiniteNumber } from 'utils/common-utils';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

export interface BuildCbomCellsOpts {
    assetSyncStateEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    dateFormatter: (date: string | Date) => string;
    renderActions: (cbom: CbomDto) => ReactNode;
}

/** A centred numeric column. Every count this inventory shows is one, differing only in its identifier and headings. */
function countColumn(fieldIdentifier: string, catalogueLabel: string, label: string): ColumnDefinition {
    return {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier,
        catalogueLabel,
        label,
        type: FilterFieldType.Number,
        align: 'center',
    };
}

/** The platform default column set for the CBOM inventory: what the page shipped before the picker. */
export const CBOM_COLUMNS: ColumnDefinition[] = [
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CBOM_SERIAL_NUMBER',
        catalogueLabel: 'Serial Number',
        label: 'Serial number',
        type: FilterFieldType.String,
    },
    countColumn('CBOM_VERSION', 'Version', 'Ver.'),
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CBOM_SOURCE', catalogueLabel: 'Source', type: FilterFieldType.String },
    countColumn('CBOM_ALGORITHMS_COUNT', 'Algorithms Count', 'Alg.'),
    countColumn('CBOM_CERTIFICATES_COUNT', 'Certificates Count', 'Certs'),
    countColumn('CBOM_PROTOCOLS_COUNT', 'Protocols Count', 'Proto.'),
    countColumn('CBOM_CRYPTO_MATERIAL_COUNT', 'Crypto Material Count', 'Material'),
    countColumn('CBOM_TOTAL_ASSETS_COUNT', 'Total Assets Count', 'Assets'),
];

export function buildCbomCellRegistry({
    assetSyncStateEnum,
    getEnumLabel,
    dateFormatter,
    renderActions,
}: BuildCbomCellsOpts): CellRegistry<CbomDto> {
    return {
        // The row actions ride in this cell rather than a column of their own: an uncatalogued column is stripped
        // from a saved view on write and the picker cannot offer it back, which would leave every view without them.
        'property:CBOM_SERIAL_NUMBER': (cbom) => (
            <span className="flex items-center gap-2 whitespace-nowrap">
                <Link to={`./detail/${cbom.uuid}`}>{cbom.serialNumber}</Link>
                {renderActions(cbom)}
            </span>
        ),
        'property:CBOM_VERSION': (cbom) => toFiniteNumber(cbom.version),
        'property:CBOM_SOURCE': (cbom) => cbom.source,
        'property:CBOM_ALGORITHMS_COUNT': (cbom) => toFiniteNumber(cbom.algorithms),
        'property:CBOM_CERTIFICATES_COUNT': (cbom) => toFiniteNumber(cbom.certificates),
        'property:CBOM_PROTOCOLS_COUNT': (cbom) => toFiniteNumber(cbom.protocols),
        'property:CBOM_CRYPTO_MATERIAL_COUNT': (cbom) => toFiniteNumber(cbom.cryptoMaterial),
        'property:CBOM_TOTAL_ASSETS_COUNT': (cbom) => toFiniteNumber(cbom.totalAssets),
        // Beyond the default set: catalogued and renderable, so the picker offers them.
        'property:CBOM_TIMESTAMP': (cbom) =>
            cbom.timestamp ? <span className="whitespace-nowrap">{dateFormatter(cbom.timestamp)}</span> : null,
        'property:CBOM_ASSET_SYNC_STATE': (cbom) => (cbom.assetSyncState ? getEnumLabel(assetSyncStateEnum, cbom.assetSyncState) : null),
        'property:CBOM_ASSETS_SYNCED_AT': (cbom) =>
            cbom.assetSyncedAt ? <span className="whitespace-nowrap">{dateFormatter(cbom.assetSyncedAt)}</span> : null,
        'property:CBOM_ASSET_SYNC_ERROR': (cbom) => cbom.assetSyncError ?? null,
    };
}
