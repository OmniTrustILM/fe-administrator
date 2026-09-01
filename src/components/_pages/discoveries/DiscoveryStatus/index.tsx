import Badge from 'components/Badge';
import type { BadgeColor } from 'components/Badge';
import { DiscoveryStatus } from 'types/openapi';

type Props = Readonly<{
    status: DiscoveryStatus | undefined;
}>;

export default function DiscoveryStatusBadge({ status }: Props) {
    const statusMap: { [key in DiscoveryStatus]: { color: BadgeColor; text: string } } = {
        [DiscoveryStatus.Completed]: { color: 'success', text: 'Completed' },
        [DiscoveryStatus.Failed]: { color: 'danger', text: 'Failed' },
        [DiscoveryStatus.InProgress]: { color: 'secondary', text: 'In Progress' },
        [DiscoveryStatus.Processing]: { color: 'info', text: 'Processing' },
        [DiscoveryStatus.Warning]: { color: 'warning', text: 'Warning' },
        [DiscoveryStatus.Stopped]: { color: 'gray', text: 'Stopped' },
        [DiscoveryStatus.Cancelled]: { color: 'gray', text: 'Cancelled' },
    };

    const _default = { color: 'secondary' as BadgeColor, text: 'Unknown' };

    const { color, text } = status ? statusMap[status] || _default : _default;

    return <Badge color={color}>{text}</Badge>;
}
