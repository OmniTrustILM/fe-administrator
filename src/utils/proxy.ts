import type { BadgeColor } from 'components/Badge';
import { ProxyStatus } from 'types/openapi';

const PROXY_STATUS_LABELS: Record<ProxyStatus, string> = {
    [ProxyStatus.Initialized]: 'Initialized',
    [ProxyStatus.Provisioning]: 'Provisioning',
    [ProxyStatus.Failed]: 'Failed',
    [ProxyStatus.WaitingForInstallation]: 'Waiting for installation',
    [ProxyStatus.Connected]: 'Connected',
    [ProxyStatus.Disconnected]: 'Disconnected',
};

export const PROXY_STATUS_OPTIONS = Object.entries(PROXY_STATUS_LABELS).map(([value, label]) => ({
    value: value as ProxyStatus,
    label,
}));

export function getProxyStatus(status: ProxyStatus): string {
    return PROXY_STATUS_LABELS[status] || status;
}

/**
 * Maps proxy status to a semantic badge color
 * @param status The proxy status
 * @returns Badge color token
 */
export function getProxyStatusColor(status: ProxyStatus): BadgeColor {
    switch (status) {
        case ProxyStatus.Connected:
            return 'success';
        case ProxyStatus.Disconnected:
            return 'gray';
        case ProxyStatus.Failed:
            return 'danger';
        case ProxyStatus.WaitingForInstallation:
            return 'warning';
        case ProxyStatus.Provisioning:
            return 'secondary';
        default:
            return 'secondary';
    }
}
