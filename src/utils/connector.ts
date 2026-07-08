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

export function inventoryStatus(status: string) {
    switch (status) {
        case 'Success':
            return ['Success', 'var(--status-success-color)'];

        case 'registered':
            return ['Reistered', 'var(--status-success-color)'];

        case 'connected':
            return ['Connected', 'var(--status-success-color)'];

        case 'failed':
            return ['Failed', 'var(--status-danger-color)'];

        case 'Failed':
            return ['Failed', 'var(--status-danger-color)'];

        case 'offline':
            return ['Offline', 'var(--status-danger-color)'];

        case 'waitingForApproval':
            return ['Waiting for Approval', 'var(--status-warning-color)'];

        default:
            return [status || 'Unknown', 'var(--status-gray-color)'];
    }
}
