import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { ConnectorStatus, PlatformEnum } from 'types/openapi';
import Badge, { type BadgeColor } from 'components/Badge';

type Props = Readonly<{
    status: ConnectorStatus | undefined;
}>;

export default function InventoryStatusBadge({ status }: Props) {
    const connectorStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConnectorStatus));
    const statusText = status ? getEnumLabel(connectorStatusEnum, status) : undefined;
    const getStatus = (status: ConnectorStatus): { color: BadgeColor; text: string | undefined } | undefined => {
        switch (status) {
            case ConnectorStatus.Connected:
                return { color: 'success', text: statusText };
            case ConnectorStatus.Failed:
                return { color: 'danger', text: statusText };
            case ConnectorStatus.Offline:
                return { color: 'secondary', text: statusText };
            case ConnectorStatus.WaitingForApproval:
                return { color: 'info', text: statusText };
        }
    };

    const _default: { color: BadgeColor; text: string } = { color: 'secondary', text: 'Unknown' };

    const { color, text } = status ? getStatus(status) || _default : _default;

    return <Badge color={color}>{text}</Badge>;
}
