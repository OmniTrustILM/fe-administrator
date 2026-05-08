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
 * Maps proxy status to CSS color variable
 * @param status The proxy status
 * @returns CSS color variable string
 */
export function getProxyStatusColor(status: ProxyStatus): string {
    switch (status) {
        case ProxyStatus.Connected:
            return 'var(--status-success-color)';
        case ProxyStatus.Disconnected:
            return 'var(--status-dark-color)';
        case ProxyStatus.Failed:
            return 'var(--status-danger-color)';
        case ProxyStatus.WaitingForInstallation:
            return 'var(--status-warning-color)';
        case ProxyStatus.Provisioning:
            return 'var(--status-gray-color)';
        default:
            return 'var(--status-gray-color)';
    }
}
