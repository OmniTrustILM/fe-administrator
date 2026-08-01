import type { BadgeColor } from 'components/Badge';
import { getEnumLabel } from 'ducks/enums';
import type { ConnectorResponseModel } from 'types/connectors';
import { ConnectorVersion } from 'types/openapi';

type PlatformEnumMap = Parameters<typeof getEnumLabel>[0];

export interface ConnectorCapabilities {
    isV2: boolean;
    caption: string;
    capabilityLabels: string[];
    featureLabels: string[];
}

/**
 * Derives the capability badges shown on the connector listing.
 * v2 connectors expose interfaces + feature flags, v1 connectors function groups + kinds.
 */
export function getConnectorCapabilities(
    connector: Pick<ConnectorResponseModel, 'version' | 'interfaces' | 'functionGroups'>,
    enums: { interfaceEnum: PlatformEnumMap; featureEnum: PlatformEnumMap; functionGroupEnum: PlatformEnumMap },
): ConnectorCapabilities {
    const isV2 = connector.version === ConnectorVersion.V2;
    const interfaces = connector.interfaces ?? [];
    const functionGroups = connector.functionGroups ?? [];

    const capabilityLabels = isV2
        ? [...new Set(interfaces.map((iface) => iface.code))].map((code) => getEnumLabel(enums.interfaceEnum, code))
        : functionGroups.map((group) => getEnumLabel(enums.functionGroupEnum, group.functionGroupCode ?? group.name));

    const featureLabels = isV2
        ? [...new Set(interfaces.flatMap((iface) => iface.features ?? []))].map((feature) => getEnumLabel(enums.featureEnum, feature))
        : [...new Set(functionGroups.flatMap((group) => group.kinds ?? []))];

    return {
        isV2,
        caption: isV2 ? 'Supported Interfaces' : 'Function Groups',
        capabilityLabels,
        featureLabels,
    };
}

export function inventoryStatus(status: string): [string, BadgeColor] {
    switch (status) {
        case 'Success':
            return ['Success', 'success'];

        case 'registered':
            return ['Reistered', 'success'];

        case 'connected':
            return ['Connected', 'success'];

        case 'failed':
            return ['Failed', 'danger'];

        case 'Failed':
            return ['Failed', 'danger'];

        case 'offline':
            return ['Offline', 'danger'];

        case 'waitingForApproval':
            return ['Waiting for Approval', 'warning'];

        default:
            return [status || 'Unknown', 'secondary'];
    }
}
