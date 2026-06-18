import Widget from 'components/Widget';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import ReactApexChart from 'react-apexcharts';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import type { SearchFilterModel } from 'types/certificate';
import { getDonutChartColorsByRandomNumberOfOptions } from 'utils/dashboard';
import type { ColorOptions } from './DonutChart';

type Props = Readonly<{
    title: string;
    data?: { [key: string]: number };
    entity: EntityType;
    redirect: string;
    onSetFilter: (label: string) => SearchFilterModel[];
    overflowCount?: number;
    topN?: number;
    colorOptions?: ColorOptions;
}>;

function HorizontalBarChart({ title, data = {}, entity, redirect, onSetFilter, overflowCount, topN = 10, colorOptions }: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const shown = sorted.slice(0, topN);
    const labels = shown.map(([label]) => label);
    const values = shown.map(([, value]) => value);
    const colors = colorOptions?.colors ?? getDonutChartColorsByRandomNumberOfOptions(labels.length).colors;
    const remaining = (overflowCount ?? labels.length) - labels.length;

    const handleBarClick = (index: number) => {
        if (index < 0 || index >= labels.length) return;
        dispatch(filterActions.setCurrentFilters({ entity, currentFilters: onSetFilter(labels[index]) }));
        navigate(redirect);
    };

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            events: { dataPointSelection: (_e, _ctx, { dataPointIndex }: any) => handleBarClick(dataPointIndex) },
        },
        plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 2 } },
        colors,
        dataLabels: { enabled: false },
        legend: { show: false },
        xaxis: { categories: labels, labels: { formatter: (v: string) => String(Math.round(Number(v))) } },
        grid: { borderColor: 'var(--border-color, #e5e7eb)', strokeDashArray: 4 },
        tooltip: { y: { formatter: (v: number) => String(v) } },
    };

    return (
        <Widget title={title} titleBoldness="bold" className="flex-1">
            <ReactApexChart options={options} series={[{ name: 'Signings', data: values }]} type="bar" height={220} width="100%" />
            {remaining > 0 && <div className="text-sm text-gray-500 mt-1">+{remaining} more</div>}
        </Widget>
    );
}

export default HorizontalBarChart;
