import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Badge from 'components/Badge';
import type { CellRegistry } from 'components/CustomTable/columns';
import type { ConnectorResponseModel } from 'types/connectors';
import type { EnumItemModel } from 'types/enums';
import { FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { getConnectorCapabilities, inventoryStatus } from 'utils/connector';
import type { ColumnSort } from 'utils/tableColumns';
import ConnectorCapabilityBadges from './list/ConnectorCapabilityBadges';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

/** The ordering the inventory opens on, which it sorted client-side before it was column-driven. */
export const CONNECTOR_DEFAULT_SORT: ColumnSort = {
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: 'CONNECTOR_NAME',
    direction: 'asc',
};

export interface BuildConnectorCellsOpts {
    interfaceEnum: PlatformEnumMap;
    featureEnum: PlatformEnumMap;
    functionGroupEnum: PlatformEnumMap;
    authTypeEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    onOverflowClick: (connector: ConnectorResponseModel) => void;
}

/**
 * The platform default column set for the connectors inventory, which depends on whether proxies are enabled: the
 * proxy column is not in the filter-field catalogue and is display-only, so a build with proxies off must not ship it
 * at all rather than ship it empty.
 */
export function buildConnectorColumns(isProxiesEnabled: boolean): ColumnDefinition[] {
    return [
        {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'CONNECTOR_NAME',
            catalogueLabel: 'Name',
            type: FilterFieldType.String,
        },
        {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'CONNECTOR_VERSION',
            catalogueLabel: 'Version',
            label: 'Ver',
            type: FilterFieldType.List,
            align: 'center',
        },
        {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'CONNECTOR_INTERFACE',
            catalogueLabel: 'Interface',
            label: 'Interfaces / Function Groups',
            type: FilterFieldType.List,
        },
        {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'CONNECTOR_FEATURES',
            catalogueLabel: 'Features',
            label: 'Features / Kinds',
            type: FilterFieldType.List,
        },
        ...(isProxiesEnabled
            ? [{ fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_PROXY', catalogueLabel: 'Proxy', displayOnly: true }]
            : []),
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CONNECTOR_URL', catalogueLabel: 'URL', type: FilterFieldType.String },
        {
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'CONNECTOR_STATUS',
            catalogueLabel: 'Status',
            type: FilterFieldType.List,
        },
    ];
}

export function buildConnectorCellRegistry({
    interfaceEnum,
    featureEnum,
    functionGroupEnum,
    authTypeEnum,
    getEnumLabel,
    onOverflowClick,
}: BuildConnectorCellsOpts): CellRegistry<ConnectorResponseModel> {
    const capabilities = (connector: ConnectorResponseModel) =>
        getConnectorCapabilities(connector, { interfaceEnum, featureEnum, functionGroupEnum });

    return {
        'property:CONNECTOR_NAME': (connector) => (
            <span className="whitespace-nowrap">
                <Link to={`./detail/${connector.uuid}`}>{connector.name}</Link>
            </span>
        ),
        'property:CONNECTOR_VERSION': (connector) =>
            connector.version ? <span className="whitespace-nowrap">{connector.version}</span> : null,
        'property:CONNECTOR_INTERFACE': (connector) => {
            const { isV2, capabilityLabels } = capabilities(connector);
            return (
                <ConnectorCapabilityBadges
                    labels={capabilityLabels}
                    color="primary"
                    testIdPrefix={`interfaces-${connector.uuid}`}
                    overflowTitle={isV2 ? 'Show all interfaces' : 'Show all function groups'}
                    onOverflowClick={() => onOverflowClick(connector)}
                />
            );
        },
        'property:CONNECTOR_FEATURES': (connector) => {
            const { isV2, featureLabels } = capabilities(connector);
            return (
                <ConnectorCapabilityBadges
                    labels={featureLabels}
                    color="secondary"
                    testIdPrefix={`features-${connector.uuid}`}
                    overflowTitle={isV2 ? 'Show all features' : 'Show all kinds'}
                    onOverflowClick={() => onOverflowClick(connector)}
                />
            );
        },
        'property:CONNECTOR_PROXY': (connector) =>
            connector.proxy ? (
                <span className="whitespace-nowrap">
                    <Link to={`../proxies/detail/${connector.proxy.uuid}`}>{connector.proxy.name}</Link>
                </span>
            ) : null,
        'property:CONNECTOR_URL': (connector) => <span className="whitespace-nowrap">{connector.url}</span>,
        'property:CONNECTOR_STATUS': (connector) => {
            const [label, color] = inventoryStatus(connector.status);
            return <Badge color={color}>{label}</Badge>;
        },
        // Beyond the default set: catalogued and renderable, so the picker offers them.
        'property:CONNECTOR_AUTH_TYPE': (connector) => (connector.authType ? getEnumLabel(authTypeEnum, connector.authType) : null),
        // The interfaces cell renders these only for a v1 connector, so a v2 connector's function groups
        // are reachable nowhere else.
        'property:CONNECTOR_FUNCTION_GROUP': (connector) => {
            const labels = (connector.functionGroups ?? []).map((group) =>
                getEnumLabel(functionGroupEnum, group.functionGroupCode ?? group.name),
            );
            return labels.length > 0 ? labels.join(', ') : null;
        },
    } satisfies Record<string, (connector: ConnectorResponseModel) => ReactNode>;
}
