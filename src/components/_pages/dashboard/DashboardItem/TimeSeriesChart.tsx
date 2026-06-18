import Widget from 'components/Widget';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import ReactApexChart from 'react-apexcharts';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
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
    const values = isoKeys.map((k) => data[k]);
    const isHourly = period === SigningRecordStatisticsPeriod._24h;
    const color = colorOptions?.colors?.[0] ?? '#1473b5';

    const categories = isoKeys.map((iso) => {
        const d = new Date(iso);
        return isHourly
            ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
            events: {
                markerClick: (_e, _ctx, { dataPointIndex }: any) => handleBucketClick(dataPointIndex),
                dataPointSelection: (_e, _ctx, { dataPointIndex }: any) => handleBucketClick(dataPointIndex),
            },
        },
        colors: [color],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
        },
        xaxis: { categories, tickAmount: Math.min(categories.length, 12), labels: { rotate: 0, hideOverlappingLabels: true } },
        yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
        grid: { borderColor: 'var(--border-color, #e5e7eb)', strokeDashArray: 4 },
        tooltip: { x: { show: true } },
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
            <ReactApexChart options={options} series={[{ name: 'Signings', data: values }]} type="area" height={260} width="100%" />
        </Widget>
    );
}

export default TimeSeriesChart;
