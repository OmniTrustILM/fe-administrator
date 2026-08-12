import Badge from 'components/Badge';
import type { ProxyStatus } from 'types/openapi';
import { getProxyStatusColor, getProxyStatus } from 'utils/proxy';

interface ProxyStatusBadgeProps {
    status: ProxyStatus;
}

/**
 * Badge component for displaying proxy status
 * Maps status to appropriate color and formatted label
 */
export const ProxyStatusBadge = ({ status }: ProxyStatusBadgeProps) => {
    const statusColor = getProxyStatusColor(status);
    const statusLabel = getProxyStatus(status);

    return <Badge color={statusColor}>{statusLabel}</Badge>;
};
