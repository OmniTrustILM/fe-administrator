import { FilterX, SearchX, TableProperties } from 'lucide-react';
import Button from 'components/Button';

type Props = Readonly<{
    isSearchMiss: boolean;
    emptyStateDescription: string;
    onClearFilters?: () => void;
}>;

function EmptyState({ isSearchMiss, emptyStateDescription, onClearFilters }: Props) {
    let Icon = TableProperties;
    let title = 'No items to show';
    let description = emptyStateDescription;
    if (isSearchMiss) {
        Icon = SearchX;
        title = 'No matching items';
        description = 'Try adjusting your search or filters to see results';
    } else if (onClearFilters) {
        Icon = FilterX;
        title = 'No items match the filters';
        description = 'Clear the filters to see all items';
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center" role="status" data-testid="table-empty-state">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-sunken">
                <Icon size={32} strokeWidth={1.5} className="text-content-muted" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-base font-semibold text-content">{title}</span>
                <span className="text-sm text-content-muted">{description}</span>
            </div>
            {!isSearchMiss && onClearFilters && (
                <Button variant="outline" color="secondary" onClick={onClearFilters} data-testid="table-empty-state-clear-filters">
                    Clear all
                </Button>
            )}
        </div>
    );
}

export default EmptyState;
