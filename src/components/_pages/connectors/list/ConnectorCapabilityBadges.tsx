import Badge from 'components/Badge';

const MAX_VISIBLE_BADGES = 3;

type Props = Readonly<{
    labels: string[];
    color: 'primary' | 'secondary';
    testIdPrefix: string;
    overflowTitle: string;
    onOverflowClick: () => void;
}>;

export default function ConnectorCapabilityBadges({ labels, color, testIdPrefix, overflowTitle, onOverflowClick }: Props) {
    if (labels.length === 0) return '—';

    const hasOverflow = labels.length > MAX_VISIBLE_BADGES;
    const visible = hasOverflow ? labels.slice(0, MAX_VISIBLE_BADGES) : labels;
    const hiddenCount = labels.length - visible.length;

    const renderBadge = (label: string, index: number) => (
        <Badge key={`${testIdPrefix}-${label}-${index}`} color={color}>
            {label}
        </Badge>
    );

    if (!hasOverflow) {
        return <div className="flex flex-wrap items-center gap-1">{visible.map((label, index) => renderBadge(label, index))}</div>;
    }

    const lastIndex = visible.length - 1;

    return (
        <div className="flex flex-wrap items-center gap-1">
            {visible.slice(0, lastIndex).map((label, index) => renderBadge(label, index))}
            {/* Keep the last badge and the +N trigger on the same line so +N never wraps alone */}
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {renderBadge(visible[lastIndex], lastIndex)}
                <Badge color={color} onClick={onOverflowClick} title={overflowTitle} dataTestId={`${testIdPrefix}-overflow`}>
                    {`+${hiddenCount}`}
                </Badge>
            </span>
        </div>
    );
}
