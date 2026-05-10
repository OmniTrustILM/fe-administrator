const cardClass =
    'rounded-xl border border-gray-200 dark:border-neutral-700 p-4 md:p-5 shadow-2xs bg-white dark:bg-neutral-900 animate-pulse';
const barClass = 'rounded bg-gray-200 dark:bg-neutral-700';

const legendWidths = ['75%', '55%', '85%', '60%', '70%'];

function CountBadgeSkeleton({ withSwitch = false }: Readonly<{ withSwitch?: boolean }>) {
    return (
        <div className={`${cardClass} h-full`} data-testid="count-badge-skeleton">
            <div className={`${barClass} h-5 w-28 mb-4`} />
            <div className={`${barClass} h-9 w-20`} />
            {withSwitch && (
                <div className="flex items-center gap-2 mt-5" data-testid="switch-skeleton">
                    <div className={`${barClass} h-4 w-28 rounded-full`} />
                    <div className={`${barClass} h-7 w-12 rounded-full`} />
                </div>
            )}
        </div>
    );
}

function DonutChartSkeleton() {
    return (
        <div className={cardClass} data-testid="donut-chart-skeleton">
            <div className={`${barClass} h-4 w-44 mb-4`} />
            <div className="grid grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:justify-items-stretch">
                {/* Donut ring */}
                <div className="h-[90px] w-[90px] rounded-full border-[14px] border-gray-200 dark:border-neutral-700 flex-shrink-0" />
                {/* Legend */}
                <div
                    className="flex flex-col gap-4 overflow-hidden w-full ml-auto md:mx-auto"
                    style={{ height: '180px', maxWidth: '220px' }}
                >
                    {legendWidths.map((w) => (
                        <div key={w} className="flex items-center gap-2">
                            <div className={`${barClass} h-2 w-2 rounded-full flex-shrink-0`} />
                            <div className={`${barClass} h-4`} style={{ width: w }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

type Props = Readonly<{
    countBadges: number;
    charts: number;
    firstBadgeWithSwitch?: boolean;
}>;

function DashboardSkeleton({ countBadges, charts, firstBadgeWithSwitch = false }: Props) {
    return (
        <div>
            <div className="flex flex-row gap-4 md:gap-8 mb-4 md:mb-8 flex-wrap">
                {Array.from({ length: countBadges }).map((_, i) => (
                    <div key={`badge-${i}`} className="flex-1 min-w-[180px]">
                        <CountBadgeSkeleton withSwitch={i === 0 && firstBadgeWithSwitch} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
                {Array.from({ length: charts }).map((_, i) => (
                    <DonutChartSkeleton key={`chart-${i}`} />
                ))}
            </div>
        </div>
    );
}

export default DashboardSkeleton;
