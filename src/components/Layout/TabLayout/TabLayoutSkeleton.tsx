import Widget from 'components/Widget';
import TableSkeleton from 'components/CustomTable/TableSkeleton';

const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';
const tabWidths = ['w-16', 'w-20', 'w-24', 'w-14', 'w-20'];

type Props = {
    tabCount?: number;
    columnsCount?: number;
    noBorder?: boolean;
    hasPagination?: boolean;
};

function TabLayoutSkeleton({ tabCount = 2, columnsCount = 4, noBorder = false, hasPagination = true }: Props) {
    return (
        <Widget noBorder={noBorder} dataTestId="tab-layout-skeleton">
            <div className="animate-pulse flex gap-x-2 mb-1">
                {Array.from({ length: tabCount }, (_, i) => (
                    <div key={i} className={`${barClass} h-11 ${tabWidths[i % tabWidths.length]}`} />
                ))}
            </div>
            <hr className="my-4 border-gray-200" />
            <TableSkeleton columnsCount={columnsCount} hasCheckboxes={false} hasPagination={hasPagination} />
        </Widget>
    );
}

export default TabLayoutSkeleton;
