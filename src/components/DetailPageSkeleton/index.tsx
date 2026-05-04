import TableSkeleton from 'components/CustomTable/TableSkeleton';
import TabLayoutSkeleton from 'components/Layout/TabLayout/TabLayoutSkeleton';

const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';
const cardClass =
    'relative flex flex-col rounded-xl border border-gray-200 dark:border-neutral-700 p-4 md:p-5 shadow-2xs bg-white dark:bg-neutral-900 w-full';

type SkeletonLayout = 'simple' | 'tabs' | 'split';

interface Props {
    layout?: SkeletonLayout;
    tabCount?: number;
    rowCount?: number;
    buttonsCount?: number;
}

function BreadcrumbSkeleton() {
    return (
        <div className="mb-4 md:mb-8 animate-pulse">
            <div className="flex items-center gap-2">
                <div className={`${barClass} h-5 w-28`} />
                <div className={`${barClass} h-4 w-3 rounded-full`} />
                <div className={`${barClass} h-5 w-40`} />
            </div>
            <div className="mt-4 md:mt-8">
                <div className={`${barClass} h-8 w-56`} />
            </div>
        </div>
    );
}

function WidgetHeaderSkeleton({ buttonsCount = 0 }: { buttonsCount?: number }) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className={`${barClass} h-5 w-36`} />
            {buttonsCount > 0 && (
                <div className="flex items-center gap-2" data-testid="widget-buttons-skeleton">
                    {Array.from({ length: buttonsCount }, (_, i) => (
                        <div key={i} className={`${barClass} h-8 w-8 rounded-lg`} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DetailPageSkeleton({ layout = 'simple', tabCount = 5, rowCount = 8, buttonsCount = 2 }: Props) {
    if (layout === 'simple') {
        return (
            <div data-testid="detail-page-skeleton">
                <BreadcrumbSkeleton />
                <div className="flex flex-col gap-4 md:gap-5 animate-pulse">
                    <div className={cardClass}>
                        <WidgetHeaderSkeleton buttonsCount={buttonsCount} />
                        <TableSkeleton columnsCount={2} hasCheckboxes={false} hasPagination={false} rowCount={rowCount} />
                    </div>
                    <div className={cardClass}>
                        <WidgetHeaderSkeleton />
                        <TableSkeleton columnsCount={2} hasCheckboxes={false} hasPagination={false} rowCount={4} />
                    </div>
                </div>
            </div>
        );
    }

    if (layout === 'split') {
        return (
            <div data-testid="detail-page-skeleton">
                <BreadcrumbSkeleton />
                <div className="animate-pulse flex flex-col gap-4 md:gap-5">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-5">
                        <div className={`${cardClass} md:w-1/2`}>
                            <WidgetHeaderSkeleton buttonsCount={buttonsCount} />
                            <TableSkeleton columnsCount={2} hasCheckboxes={false} hasPagination={false} rowCount={rowCount} />
                        </div>
                        <div className="flex flex-col gap-4 md:gap-5 w-full md:w-1/2">
                            <div className={cardClass}>
                                <WidgetHeaderSkeleton />
                                <TableSkeleton columnsCount={2} hasCheckboxes={false} hasPagination={false} rowCount={5} />
                            </div>
                        </div>
                    </div>
                    <TabLayoutSkeleton tabCount={tabCount} columnsCount={4} hasPagination={false} />
                    <div className={cardClass}>
                        <WidgetHeaderSkeleton />
                        <TableSkeleton columnsCount={3} hasCheckboxes={false} hasPagination={false} rowCount={3} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div data-testid="detail-page-skeleton">
            <BreadcrumbSkeleton />
            <TabLayoutSkeleton tabCount={tabCount} columnsCount={2} hasPagination={false} />
        </div>
    );
}
