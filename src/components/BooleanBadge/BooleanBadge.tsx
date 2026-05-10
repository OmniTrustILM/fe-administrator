import Badge from 'components/Badge';

interface Props {
    value: boolean;
    invertColor?: boolean;
    dataTestId?: string;
}

const BooleanBadge = ({ value, invertColor, dataTestId }: Props) => {
    const color = value === !invertColor ? 'success' : 'danger';
    return (
        <Badge color={color} dataTestId={dataTestId || 'boolean-badge'}>
            {value ? 'Yes' : 'No'}
        </Badge>
    );
};

export default BooleanBadge;
