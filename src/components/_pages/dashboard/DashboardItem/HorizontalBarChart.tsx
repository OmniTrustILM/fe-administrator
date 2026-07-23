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

type YAxisTickProps = Readonly<{
    x?: number;
    y?: number;
    payload?: { value?: string };
    maxChars?: number;
}>;

function YAxisTick({ x, y, payload, maxChars = 12 }: YAxisTickProps) {
    const full = payload?.value ?? '';
    const text = full.length > maxChars ? `${full.slice(0, Math.max(1, maxChars - 1))}…` : full;
    return (
        <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="currentColor">
            <title>{full}</title>
            {text}
        </text>
    );
}

function HorizontalBarChart({ title, data = {}, entity, redirect, onSetFilter, overflowCount, topN = 10, colorOptions }: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const shown = sorted.slice(0, topN);
    const labels = shown.map(([label]) => label);
    const colors = colorOptions?.colors ?? getDonutChartColorsByRandomNumberOfOptions(labels.length).colors;
    const remaining = (overflowCount ?? labels.length) - labels.length;

    const chartData = shown.map(([label, value], index) => ({ label, value, color: colors[index] ?? '#6B7280' }));

    const longestLabel = labels.reduce((max, label) => Math.max(max, label.length), 0);
    const yAxisWidth = Math.min(180, Math.max(80, longestLabel * 7 + 8));
    const yAxisMaxChars = Math.max(6, Math.floor((yAxisWidth - 8) / 7));

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
                        width={yAxisWidth}
                        tick={<YAxisTick maxChars={yAxisMaxChars} />}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        formatter={(value) => [String(value), 'Count']}
                        contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive onClick={(_entry, index) => handleBarClick(index)}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            {remaining > 0 && <div className="text-sm text-gray-500 mt-1">+{remaining} more</div>}
        </Widget>
    );
}

export default HorizontalBarChart;
