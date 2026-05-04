import { FilterWidgetSkeleton } from 'components/FilterWidget';
import TableSkeleton from 'components/CustomTable/TableSkeleton';

const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';
const cardClass =
    'relative flex flex-col rounded-xl border border-gray-200 dark:border-neutral-700 p-4 md:p-5 shadow-2xs bg-white dark:bg-neutral-900 w-full';

interface Props {
    hasFilter?: boolean;
    filterTitle?: string;
    buttonsCount?: number;
    columnsCount?: number;
    hasCheckboxes?: boolean;
    hasExtraFilter?: boolean;
}

function PagedListSkeleton({
    hasFilter = false,
    filterTitle,
    buttonsCount = 1,
    columnsCount = 4,
    hasCheckboxes = true,
    hasExtraFilter = false,
}: Props) {
    return (
        <div className="flex flex-col gap-4 md:gap-8" data-testid="paged-list-skeleton">
            {hasFilter && <FilterWidgetSkeleton title={filterTitle} dataTestId="filter-widget-skeleton" hasExtraFilter={hasExtraFilter} />}
            <section className={cardClass}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 animate-pulse">
                    <div className="flex items-center gap-2">
                        <div className={`${barClass} h-5 w-36`} />
                        <div className={`${barClass} h-6 w-6`} />
                    </div>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: buttonsCount }, (_, i) => (
                            <div key={i} className={`${barClass} h-8 w-8`} />
                        ))}
                    </div>
                </div>
                <TableSkeleton columnsCount={columnsCount} hasCheckboxes={hasCheckboxes} />
            </section>
        </div>
    );
}

export default PagedListSkeleton;
