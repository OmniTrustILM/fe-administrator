import Widget from 'components/Widget';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SigningRecordStatisticsPeriod } from 'types/openapi';
import type { SearchFilterModel } from 'types/certificate';
import type { ColorOptions } from './DonutChart';

type Props = Readonly<{
    title: string;
    data?: { [key: string]: number };
    entity: EntityType;
    redirect: string;
    period: SigningRecordStatisticsPeriod;
    onPeriodChange: (period: SigningRecordStatisticsPeriod) => void;
    onSetFilter: (bucketStartIso: string, bucketEndIso: string) => SearchFilterModel[];
    isLoading?: boolean;
    colorOptions?: ColorOptions;
}>;

const PERIOD_OPTIONS: SigningRecordStatisticsPeriod[] = [
    SigningRecordStatisticsPeriod._24h,
    SigningRecordStatisticsPeriod._7d,
    SigningRecordStatisticsPeriod._30d,
    SigningRecordStatisticsPeriod._90d,
];

function TimeSeriesChart({
    title,
    data = {},
    entity,
    redirect,
    period,
    onPeriodChange,
    onSetFilter,
    isLoading = false,
    colorOptions,
}: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const isoKeys = Object.keys(data);
    const isHourly = period === SigningRecordStatisticsPeriod._24h;
    const color = colorOptions?.colors?.[0] ?? '#1473b5';

    const chartData = isoKeys.map((iso) => {
        const d = new Date(iso);
        const label = isHourly
            ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return { iso, label, value: data[iso] };
    });

    const bucketEndIso = (index: number): string => {
        if (index + 1 < isoKeys.length) return isoKeys[index + 1];
        const startMs = new Date(isoKeys[index]).getTime();
        const intervalMs = isoKeys.length > 1 ? new Date(isoKeys[1]).getTime() - new Date(isoKeys[0]).getTime() : 3600_000;
        return new Date(startMs + intervalMs).toISOString();
    };

    const handleBucketClick = (index: number) => {
        if (index < 0 || index >= isoKeys.length) return;
        const filters = onSetFilter(isoKeys[index], bucketEndIso(index));
        dispatch(filterActions.setCurrentFilters({ entity, currentFilters: filters }));
        navigate(redirect);
    };

    return (
        <Widget title={title} titleBoldness="bold" className="col-span-full" busy={isLoading}>
            <div className="flex justify-end mb-2">
                <div className="inline-flex rounded-md border border-gray-200 dark:border-neutral-700 overflow-hidden" role="group">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                if (option !== period) onPeriodChange(option);
                            }}
                            className={`px-3 py-1 text-sm ${
                                option === period
                                    ? 'bg-[var(--primary-blue-color)] text-white'
                                    : 'bg-transparent text-gray-600 dark:text-neutral-300'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                    onClick={(state) => {
                        const rawIndex = (state as { activeTooltipIndex?: number | string | null })?.activeTooltipIndex;
                        if (rawIndex == null) return;
                        const index = Number(rawIndex);
                        if (Number.isInteger(index) && index >= 0) handleBucketClick(index);
                    }}
                >
                    <defs>
                        <linearGradient id="timeSeriesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="90%" stopColor={color} stopOpacity={0.05} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-color, #e5e7eb)" strokeDasharray="4" />
                    <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        minTickGap={24}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(value: number) => String(Math.round(value))}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                    />
                    <Tooltip cursor={{ stroke: color, strokeDasharray: '4' }} contentStyle={{ fontSize: 12 }} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill="url(#timeSeriesGradient)"
                        activeDot={{ r: 4, cursor: 'pointer' }}
                        isAnimationActive
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Widget>
    );
}

export default TimeSeriesChart;
