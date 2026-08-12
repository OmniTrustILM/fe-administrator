import Badge from 'components/Badge';
import { Check, HelpCircle, X } from 'lucide-react';

type Props = {
    status?: boolean;
};

function StatusCircle({ status }: Readonly<Props>) {
    switch (status) {
        case true:
            return (
                <Badge color="success" fill="solid">
                    <Check size={16} />
                </Badge>
            );

        case false:
            return (
                <Badge color="danger" fill="solid">
                    <X size={16} />
                </Badge>
            );

        default:
            return (
                <Badge color="gray">
                    <HelpCircle size={16} />
                </Badge>
            );
    }
}

export default StatusCircle;
