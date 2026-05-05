import Widget from 'components/Widget';
import TableSkeleton from 'components/CustomTable/TableSkeleton';

const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';
const tabWidths = ['w-16', 'w-20', 'w-24', 'w-14', 'w-20'];

type Props = Readonly<{
    tabCount?: number;
    columnsCount?: number;
    noBorder?: boolean;
    hasPagination?: boolean;
    rowCount?: number;
    buttonsCount?: number;
}>;

function TabLayoutSkeleton({ tabCount = 2, columnsCount = 4, noBorder = false, hasPagination = true, rowCount, buttonsCount = 0 }: Props) {
    return (
        <Widget noBorder={noBorder} dataTestId="tab-layout-skeleton">
            {buttonsCount > 0 && (
                <div className="animate-pulse flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className={`${barClass} h-5 w-36`} />
                    <div className="flex items-center gap-2">
                        {Array.from({ length: buttonsCount }, (_, i) => (
                            <div key={i} className={`${barClass} h-8 w-8 rounded-lg`} />
                        ))}
                    </div>
                </div>
            )}
            <div className="animate-pulse flex gap-x-2 mb-1">
                {Array.from({ length: tabCount }, (_, i) => (
                    <div key={i} className={`${barClass} h-11 ${tabWidths[i % tabWidths.length]}`} />
                ))}
            </div>
            <hr className="my-4 border-gray-200" />
            <TableSkeleton columnsCount={columnsCount} hasCheckboxes={false} hasPagination={hasPagination} rowCount={rowCount} />
        </Widget>
    );
}

export default TabLayoutSkeleton;
