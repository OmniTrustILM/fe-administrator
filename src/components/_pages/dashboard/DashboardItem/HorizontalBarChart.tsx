import Widget from 'components/Widget';
import { type EntityType, actions as filterActions } from 'ducks/filters';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

    const chartData = shown.map(([label, value], index) => ({ label, value, color: colors[index] ?? '#6B7280' }));

    const handleBarClick = (index: number) => {
        if (index < 0 || index >= labels.length) return;
        dispatch(filterActions.setCurrentFilters({ entity, currentFilters: onSetFilter(labels[index]) }));
        navigate(redirect);
    };

    return (
        <Widget title={title} titleBoldness="bold" className="flex-1">
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-color, #e5e7eb)" strokeDasharray="4" />
                    <XAxis
                        type="number"
                        tickFormatter={(value: number) => String(Math.round(value))}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={80}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: number) => [String(value), 'Signings']}
                        contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive onClick={(_entry, index) => handleBarClick(index)}>
                        {chartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} cursor="pointer" />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            {remaining > 0 && <div className="text-sm text-gray-500 mt-1">+{remaining} more</div>}
        </Widget>
    );
}

export default HorizontalBarChart;
