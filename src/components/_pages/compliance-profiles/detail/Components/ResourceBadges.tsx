import Badge from 'components/Badge';

type ResourceBadgesProps<T extends string> = Readonly<{
    resources: T[];
    selected: T | null;
    onSelect: (resource: T) => void;
    getLabel: (resource: T) => string;
}>;

export function ResourceBadges<T extends string>({ resources, selected, onSelect, getLabel }: ResourceBadgesProps<T>) {
    return (
        <div
            data-testid="resource-badges"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                padding: '0 0 10px 0',
            }}
        >
            {resources.map((resource) => (
                <Badge
                    key={resource}
                    color={selected === resource ? 'primary' : 'secondary'}
                    onClick={() => onSelect(resource)}
                    style={{
                        cursor: 'pointer',
                        margin: '10px 4px 0 4px',
                        fontSize: '14px',
                    }}
                >
                    {getLabel(resource)}
                </Badge>
            ))}
        </div>
    );
}
