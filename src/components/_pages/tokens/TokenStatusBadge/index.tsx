import Badge from 'components/Badge';
import { TokenInstanceStatus } from 'types/openapi';

type Props = Readonly<{
    status: TokenInstanceStatus;
}>;

function TokenStatusBadge({ status }: Props) {
    switch (status) {
        case TokenInstanceStatus.Activated:
            return <Badge color="success">Activated</Badge>;

        case TokenInstanceStatus.Deactivated:
            return <Badge color="danger">Deactivated</Badge>;

        default:
            return <Badge color="secondary">{status}</Badge>;
    }
}

export default TokenStatusBadge;
