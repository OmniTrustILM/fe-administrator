import { type CertificateStatusLike, getCertificateStatusBadgeColor, getCertificateStatusColor, useGetStatusText } from 'utils/certificate';
import { capitalize } from 'utils/common-utils';
import Badge from 'components/Badge';
import Tooltip from 'components/Tooltip';

interface Props {
    status: CertificateStatusLike;
    asIcon?: boolean;
    badgeSize?: 'small' | 'medium' | 'large';
}

function CertificateStatus({ status, badgeSize = 'small', asIcon = false }: Props) {
    const getStatusText = useGetStatusText();

    const text = getStatusText(status);

    return asIcon ? (
        <Tooltip content={capitalize(text)}>
            <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: getCertificateStatusColor(status) }}
                data-testid="certificate-status"
            >
                <span className="sr-only">{capitalize(text)}</span>
            </span>
        </Tooltip>
    ) : (
        <Badge size={badgeSize} color={getCertificateStatusBadgeColor(status)} dataTestId="certificate-status">
            {capitalize(text)}
        </Badge>
    );
}

export default CertificateStatus;
