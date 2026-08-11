import type {
    CertificateEventHistoryDtoStatusEnum,
    CertificateState,
    CertificateSubjectType,
    CertificateValidationStatus,
    ComplianceRuleStatus,
    ComplianceStatus,
} from 'types/openapi';
import { getCertificateStatusColor, useGetStatusText } from 'utils/certificate';
import { capitalize } from 'utils/common-utils';
import Badge from 'components/Badge';
import Tooltip from 'components/Tooltip';

interface Props {
    status:
        | CertificateState
        | CertificateValidationStatus
        | CertificateEventHistoryDtoStatusEnum
        | ComplianceStatus
        | ComplianceRuleStatus
        | CertificateSubjectType;
    asIcon?: boolean;
    badgeSize?: 'small' | 'medium' | 'large';
}

function CertificateStatus({ status, badgeSize = 'small', asIcon = false }: Props) {
    const getStatusText = useGetStatusText();

    const color = getCertificateStatusColor(status);
    const text = getStatusText(status);

    return asIcon ? (
        <Tooltip content={capitalize(text)}>
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} data-testid="certificate-status">
                <span className="sr-only">{capitalize(text)}</span>
            </span>
        </Tooltip>
    ) : (
        <Badge size={badgeSize} style={{ backgroundColor: color }} className="text-content-on-brand" dataTestId="certificate-status">
            {capitalize(text)}
        </Badge>
    );
}

export default CertificateStatus;
