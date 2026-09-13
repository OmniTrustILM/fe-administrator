import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { type CellRegistry, renderCell } from 'components/CustomTable/columns';
import type { ConnectorResponseModel } from 'types/connectors';
import type { DiscoveryResponseModel } from 'types/discoveries';
import { ConnectorVersion, FilterFieldSource, Resource, type SearchFieldDataByGroupDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { durationFormatter } from 'utils/dateUtil';
import { toCreateRequest, toStandardSlice } from 'utils/listViews';
import { buildCbomCellRegistry, CBOM_COLUMNS } from './cboms/cbomTableHelpers';
import { buildConnectorCellRegistry, buildConnectorColumns } from './connectors/connectorTableHelpers';
import { buildDiscoveryCellRegistry, DISCOVERY_COLUMNS } from './discoveries/discoveryTableHelpers';
import { buildSecretCellRegistry, SECRET_COLUMNS } from './secrets/secretTableHelpers';
import { buildSigningRecordCellRegistry, SIGNING_RECORD_COLUMNS } from './signing-records/signingRecordTableHelpers';

const noop = () => '';
const enums = { getEnumLabel: noop, dateFormatter: noop, durationFormatter: noop };

/**
 * Each inventory's default column set beside the identifiers core's `FilterField` publishes for that resource, and the
 * identifiers deliberately absent from it. A column outside both lists is the failure this guards: it would either
 * render blank or make a saved view fail validation.
 */
const inventories = [
    {
        name: 'discoveries',
        resource: Resource.Discoveries,
        columns: DISCOVERY_COLUMNS,
        registry: buildDiscoveryCellRegistry(enums),
        catalogued: [
            'DISCOVERY_NAME',
            'DISCOVERY_START_TIME',
            'DISCOVERY_END_TIME',
            'DISCOVERY_STATUS',
            'DISCOVERY_TOTAL_CERT_DISCOVERED',
            'DISCOVERY_CONNECTOR_NAME',
            'DISCOVERY_KIND',
        ],
        displayOnly: ['DISCOVERY_CONNECTOR_INTERFACE', 'DISCOVERY_DURATION'],
    },
    {
        name: 'connectors',
        resource: Resource.Connectors,
        columns: buildConnectorColumns(true),
        registry: buildConnectorCellRegistry({
            interfaceEnum: undefined,
            featureEnum: undefined,
            functionGroupEnum: undefined,
            authTypeEnum: undefined,
            getEnumLabel: noop,
            onOverflowClick: () => undefined,
        }),
        catalogued: [
            'CONNECTOR_NAME',
            'CONNECTOR_VERSION',
            'CONNECTOR_URL',
            'CONNECTOR_AUTH_TYPE',
            'CONNECTOR_STATUS',
            'CONNECTOR_INTERFACE',
            'CONNECTOR_FEATURES',
            'CONNECTOR_FUNCTION_GROUP',
        ],
        displayOnly: ['CONNECTOR_PROXY'],
    },
    {
        name: 'secrets',
        resource: Resource.Secrets,
        columns: SECRET_COLUMNS,
        registry: buildSecretCellRegistry({
            secretTypeEnum: undefined,
            secretStateEnum: undefined,
            getEnumLabel: noop,
            vaultProfiles: [],
        }),
        catalogued: [
            'SECRET_NAME',
            'SECRET_TYPE',
            'SECRET_STATE',
            'SECRET_ENABLED',
            'SECRET_GROUP_NAME',
            'SECRET_OWNER',
            'SECRET_COMPLIANCE_STATUS',
            'SECRET_SOURCE_VAULT_PROFILE',
            'SECRET_SYNC_VAULT_PROFILE',
        ],
        displayOnly: ['SECRET_VERSION'],
    },
    {
        name: 'cboms',
        resource: Resource.Cboms,
        columns: CBOM_COLUMNS,
        registry: buildCbomCellRegistry({
            assetSyncStateEnum: undefined,
            getEnumLabel: noop,
            dateFormatter: noop,
            renderActions: () => null,
        }),
        catalogued: [
            'CBOM_SERIAL_NUMBER',
            'CBOM_VERSION',
            'CBOM_TIMESTAMP',
            'CBOM_SOURCE',
            'CBOM_ALGORITHMS_COUNT',
            'CBOM_CERTIFICATES_COUNT',
            'CBOM_PROTOCOLS_COUNT',
            'CBOM_CRYPTO_MATERIAL_COUNT',
            'CBOM_TOTAL_ASSETS_COUNT',
            'CBOM_ASSET_SYNC_STATE',
            'CBOM_ASSETS_SYNCED_AT',
        ],
        displayOnly: [],
    },
    {
        name: 'signing records',
        resource: Resource.SigningRecords,
        columns: SIGNING_RECORD_COLUMNS,
        registry: buildSigningRecordCellRegistry({ signingProtocolEnum: undefined, getEnumLabel: noop, dateFormatter: noop }),
        catalogued: [
            'SIGNING_RECORD_NAME',
            'SIGNING_RECORD_SIGNING_PROFILE',
            'SIGNING_RECORD_PROTOCOL',
            'SIGNING_RECORD_SIGNING_PROFILE_VERSION',
            'SIGNING_RECORD_SIGNING_TIME',
            'SIGNING_RECORD_SIGNED_DOCUMENT_RETRIEVED_AT',
            'SIGNING_RECORD_CREATED',
        ],
        displayOnly: [],
    },
];

function catalogueOf(identifiers: readonly string[]): SearchFieldDataByGroupDto[] {
    return [
        {
            filterFieldSource: FilterFieldSource.Property,
            searchFieldData: identifiers.map((fieldIdentifier) => ({ fieldIdentifier, fieldLabel: fieldIdentifier, conditions: [] })),
        },
    ] as unknown as SearchFieldDataByGroupDto[];
}

function identifiersOf(columns: readonly ColumnDefinition[]): string[] {
    return columns.map((column) => column.fieldIdentifier);
}

describe.each(inventories)('$name default columns', ({ resource, columns, registry, catalogued, displayOnly }) => {
    it('renders every column it ships, so none of them is blank', () => {
        const missing = columns.filter((column) => registry[`${column.fieldSource}:${column.fieldIdentifier}`] === undefined);

        expect(identifiersOf(missing)).toEqual([]);
    });

    it('names only known display-only columns outside the catalogue', () => {
        expect(identifiersOf(columns).filter((identifier) => !catalogued.includes(identifier))).toEqual(displayOnly);
    });

    it('saves as a view, dropping only the display-only columns', () => {
        const request = toCreateRequest('Standard (copy)', resource, toStandardSlice(columns), catalogueOf(catalogued));

        expect(request.columns.map((column) => column.fieldIdentifier)).toEqual(
            identifiersOf(columns).filter((identifier) => !displayOnly.includes(identifier)),
        );
    });

    it('registers no renderer for a field that exists nowhere, which would never be reached', () => {
        const known = [...catalogued, ...displayOnly];
        const stray = Object.keys(registry)
            .map((key) => key.slice(key.indexOf(':') + 1))
            .filter((identifier) => !known.includes(identifier));

        expect(stray).toEqual([]);
    });
});

/**
 * A cell that always returns an element renders blank rather than reaching the shared empty state, because
 * `renderCell` only substitutes it for a renderer that returned nothing. These are the default columns whose value
 * can be absent while the cell around it carries markup of its own.
 */
describe('cells whose value can be absent', () => {
    const connectorRegistry = buildConnectorCellRegistry({
        interfaceEnum: undefined,
        featureEnum: undefined,
        functionGroupEnum: undefined,
        authTypeEnum: undefined,
        getEnumLabel: noop,
        onOverflowClick: () => undefined,
    });
    const discoveryRegistry = buildDiscoveryCellRegistry({ dateFormatter: () => 'a date', durationFormatter });

    function render<TRow extends object>(row: TRow, columns: ColumnDefinition[], registry: CellRegistry<TRow>, identifier: string) {
        const column = columns.find((candidate) => candidate.fieldIdentifier === identifier);
        if (!column) throw new Error(`the default set no longer ships ${identifier}`);
        return renderToStaticMarkup(renderCell(row, column, registry));
    }

    const connectorColumns = buildConnectorColumns(true);

    function connectorVersion(connector: Partial<ConnectorResponseModel>) {
        return render(connector as ConnectorResponseModel, connectorColumns, connectorRegistry, 'CONNECTOR_VERSION');
    }

    function discoveryDuration(discovery: Partial<DiscoveryResponseModel>) {
        return render(discovery as DiscoveryResponseModel, DISCOVERY_COLUMNS, discoveryRegistry, 'DISCOVERY_DURATION');
    }

    function discoveryInterface(discovery: Partial<DiscoveryResponseModel>) {
        return render(discovery as DiscoveryResponseModel, DISCOVERY_COLUMNS, discoveryRegistry, 'DISCOVERY_CONNECTOR_INTERFACE');
    }

    it('reaches the empty state for a connector carrying no version', () => {
        expect(connectorVersion({ uuid: 'connector-1' })).toContain('No value');
    });

    it('shows the version a connector carries', () => {
        expect(connectorVersion({ uuid: 'connector-1', version: ConnectorVersion.V2 })).toContain(ConnectorVersion.V2);
    });

    it('reaches the empty state for a discovery that has not started', () => {
        expect(discoveryDuration({ uuid: 'discovery-1' })).toContain('No value');
    });

    it('names the generation a run was driven by, legacy included', () => {
        expect(discoveryInterface({ uuid: 'discovery-1' })).toContain('Legacy (v1)');
        expect(
            discoveryInterface({ uuid: 'discovery-1', connectorInterface: { uuid: 'iface-1', code: 'discovery' as any, version: 'v2' } }),
        ).toContain('Discovery (v2)');
    });

    it('shows the duration a started discovery has run for', () => {
        const markup = discoveryDuration({ uuid: 'discovery-1', startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T00:00:05Z' });

        expect(markup).not.toContain('No value');
        expect(markup).toContain('05');
    });
});
