import Badge, { type BadgeColor } from 'components/Badge';
import { ApprovalDetailDtoStatusEnum, ApprovalDtoStatusEnum, ApprovalStepRecipientDtoStatusEnum } from 'types/openapi';

interface Props {
    enabled?: boolean;
    textStatus?: ApprovalDetailDtoStatusEnum | ApprovalDtoStatusEnum | ApprovalStepRecipientDtoStatusEnum;
    style?: React.CSSProperties;
    dataTestId?: string;
}

function StatusBadge({ enabled, style, textStatus, dataTestId }: Props) {
    const badgeProps = {
        style,
        dataTestId: dataTestId || 'status-badge',
    };

    const renderBadge = (color: BadgeColor, children: string) => (
        <Badge {...badgeProps} color={color} fill="surface">
            {children}
        </Badge>
    );

    if (!textStatus) {
        switch (enabled) {
            case true:
                return renderBadge('success', 'Enabled');
            case false:
                return renderBadge('danger', 'Disabled');
            default:
                return renderBadge('secondary', 'Unknown');
        }
    }

    switch (textStatus) {
        case ApprovalDetailDtoStatusEnum.Approved:
        case ApprovalStepRecipientDtoStatusEnum.Approved:
        case ApprovalDtoStatusEnum.Approved:
            return renderBadge('success', 'Approved');

        case ApprovalDetailDtoStatusEnum.Rejected:
        case ApprovalStepRecipientDtoStatusEnum.Rejected:
        case ApprovalDtoStatusEnum.Rejected:
            return renderBadge('danger', 'Rejected');

        case ApprovalDetailDtoStatusEnum.Pending:
        case ApprovalStepRecipientDtoStatusEnum.Pending:
        case ApprovalDtoStatusEnum.Pending:
            return renderBadge('secondary', 'Pending');

        case ApprovalDtoStatusEnum.Expired:
        case ApprovalStepRecipientDtoStatusEnum.Expired:
            return renderBadge('danger', 'Expired');

        default:
            return renderBadge('secondary', 'Unknown');
    }
}

export default StatusBadge;
