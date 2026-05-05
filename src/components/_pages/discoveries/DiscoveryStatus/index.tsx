import Badge from 'components/Badge';
import { DiscoveryStatus } from 'types/openapi';

type Props = Readonly<{
    status: DiscoveryStatus | undefined;
}>;

export default function DiscoveryStatusBadge({ status }: Props) {
    const statusMap: { [key in DiscoveryStatus]: { color: string; text: string } } = {
        [DiscoveryStatus.Completed]: { color: 'var(--status-success-color)', text: 'Completed' },
        [DiscoveryStatus.Failed]: { color: 'var(--status-danger-color)', text: 'Failed' },
        [DiscoveryStatus.InProgress]: { color: 'var(--status-secondary-color)', text: 'In Progress' },
        [DiscoveryStatus.Processing]: { color: 'var(--status-info-color)', text: 'Processing' },
        [DiscoveryStatus.Warning]: { color: 'var(--status-warning-color)', text: 'Warning' },
    };

    const _default = { color: 'var(--status-secondary-color)', text: 'Unknown' };

    const { color, text } = status ? statusMap[status] || _default : _default;

    return (
        <Badge color="secondary" style={{ backgroundColor: color }}>
            {text}
        </Badge>
    );
}
