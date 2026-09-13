import { Link } from 'react-router';
import Badge from 'components/Badge';
import ConnectorLink from 'components/ConnectorLink';
import type { CellRegistry } from 'components/CustomTable/columns';
import type { DiscoveryResponseModel } from 'types/discoveries';
import { FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ColumnSort } from 'utils/tableColumns';
import DiscoveryStatus from './DiscoveryStatus';
import { connectorInterfaceLabel } from './detail/discoveryDetailHelpers';

export interface BuildDiscoveryCellsOpts {
    dateFormatter: (date: string | Date) => string;
    durationFormatter: (start?: string | null, end?: string | null) => string;
}

/** The ordering the inventory opens on, which it sorted client-side before it was column-driven. */
export const DISCOVERY_DEFAULT_SORT: ColumnSort = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'DISCOVERY_NAME',
    direction: 'asc',
};

/**
 * The platform default column set for the discoveries inventory.
 *
 * `DISCOVERY_DURATION` is not in the filter-field catalogue: it is computed from the start and end times rather than
 * stored, so no `FilterField` resolves it. It is display-only — shown here, absent from the picker, not sortable, and
 * dropped on write by `toStorableColumns`. It keeps a natural identifier so that cataloguing it is the only change
 * needed. `DISCOVERY_CONNECTOR_INTERFACE` is display-only for the same reason: it is what tells an operator at a glance
 * which generation a run used, and the list is where runs are compared.
 */
export const DISCOVERY_COLUMNS: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'DISCOVERY_NAME', catalogueLabel: 'Name', type: FilterFieldType.String },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_CONNECTOR_NAME',
        catalogueLabel: 'Discovery provider',
        label: 'Discovery Provider',
        type: FilterFieldType.String,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_KIND',
        catalogueLabel: 'Kind',
        label: 'Kinds',
        type: FilterFieldType.String,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_CONNECTOR_INTERFACE',
        catalogueLabel: 'Interface',
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_START_TIME',
        catalogueLabel: 'Start time',
        type: FilterFieldType.Date,
        align: 'center',
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'DISCOVERY_DURATION', catalogueLabel: 'Duration', align: 'center' },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_STATUS',
        catalogueLabel: 'Status',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'DISCOVERY_TOTAL_CERT_DISCOVERED',
        catalogueLabel: 'Total certificate discovered',
        label: 'Total Certificates',
        type: FilterFieldType.Number,
        align: 'center',
    },
];

export function buildDiscoveryCellRegistry({
    dateFormatter,
    durationFormatter,
}: BuildDiscoveryCellsOpts): CellRegistry<DiscoveryResponseModel> {
    return {
        'property:DISCOVERY_NAME': (discovery) => <Link to={`./detail/${discovery.uuid}`}>{discovery.name}</Link>,
        'property:DISCOVERY_CONNECTOR_NAME': (discovery) => (
            <ConnectorLink uuid={discovery.connectorUuid} name={discovery.connectorName} fallback="Unassigned" />
        ),
        'property:DISCOVERY_KIND': (discovery) => (discovery.kind ? <Badge color="secondary">{discovery.kind}</Badge> : null),
        'property:DISCOVERY_CONNECTOR_INTERFACE': (discovery) => (
            <Badge color={discovery.connectorInterface ? 'info' : 'gray'}>{connectorInterfaceLabel(discovery.connectorInterface)}</Badge>
        ),
        'property:DISCOVERY_START_TIME': (discovery) =>
            discovery.startTime ? <span className="whitespace-nowrap">{dateFormatter(discovery.startTime)}</span> : null,
        'property:DISCOVERY_DURATION': (discovery) => {
            // The formatter yields nothing for a discovery that has not started, which is an empty cell rather than a
            // zero duration.
            const duration = durationFormatter(discovery.startTime, discovery.endTime);
            return duration ? <span className="whitespace-nowrap">{duration}</span> : null;
        },
        'property:DISCOVERY_STATUS': (discovery) => <DiscoveryStatus status={discovery.status} />,
        'property:DISCOVERY_TOTAL_CERT_DISCOVERED': (discovery) => discovery.totalCertificatesDiscovered?.toString() ?? '0',
        // Beyond the default set: catalogued and renderable, so the picker offers it.
        'property:DISCOVERY_END_TIME': (discovery) =>
            discovery.endTime ? <span className="whitespace-nowrap">{dateFormatter(discovery.endTime)}</span> : null,
    };
}
