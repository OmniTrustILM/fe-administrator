import { useEffect, useRef, useState } from 'react';
import Widget from 'components/Widget';
import { type EntityType, actions } from 'ducks/filters';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import SimpleBar from 'simplebar-react';
import type { SearchFilterModel } from 'types/certificate';
import type { DashboardDict } from 'types/statisticsDashboard';
import { getValues, useGetLabels, getDefaultColors } from 'utils/dashboard';

export interface ColorOptions {
    colors: string[];
}

type Props = Readonly<{
    title: string;
    data?: DashboardDict;
    entity: EntityType;
    redirect: string;
    onSetFilter: (index: number, labels: string[]) => SearchFilterModel[];
    colorOptions?: ColorOptions;
    showValuesInLegend?: boolean;
    interactiveLegend?: boolean;
    chartSize?: 'full' | 'fixed';
    showCenterLabel?: boolean;
    shrinkOnSmallScreen?: boolean;
}>;

type DonutTooltipProps = Readonly<{
    active?: boolean;
    payload?: { name?: string; value?: number; payload?: { color?: string } }[];
}>;

function DonutTooltip({ active, payload }: DonutTooltipProps) {
    if (!active || !payload?.length) return null;
    const { name, value, payload: entry } = payload[0];
    return (
        <div className="py-1 px-2 bg-[var(--tooltip-background-color)] text-xs font-medium text-white shadow-2xs dark:bg-neutral-700 border-[var(--tooltip-background-color)]">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry?.color }} />
                <span>
                    {name}: {value}
                </span>
            </div>
        </div>
    );
}

function DonutChart({
    title,
    colorOptions,
    data = {},
    entity,
    redirect,
    onSetFilter: onLegendClick,
    showValuesInLegend = false,
    interactiveLegend = true,
    chartSize = 'fixed',
    showCenterLabel = false,
    shrinkOnSmallScreen = true,
}: Props) {
    const labels = useGetLabels(data);
    const values = getValues(data);
    const total = values.reduce((sum, value) => sum + Number(value ?? 0), 0);
    const totalText = String(total);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const chartColors = colorOptions?.colors || getDefaultColors();
    const isFixedChartSize = chartSize === 'fixed';
    const [chartDiameter, setChartDiameter] = useState(isFixedChartSize ? 100 : 200);
    const totalCharsOverBase = Math.max(totalText.length - 3, 0);
    const normalizedDiameter = Math.max(chartDiameter, isFixedChartSize ? 90 : 110);
    const overlayWidth = Math.round(chartDiameter * 0.68);
    const totalValueFontSize = Math.max(
        isFixedChartSize ? 12 : 14,
        Math.min(isFixedChartSize ? 30 : 40, Math.round(normalizedDiameter * (isFixedChartSize ? 0.28 : 0.2) - totalCharsOverBase * 2.2)),
    );
    const totalLabelFontSize = Math.max(
        isFixedChartSize ? 10 : 12,
        Math.min(isFixedChartSize ? 18 : 24, Math.round(normalizedDiameter * (isFixedChartSize ? 0.13 : 0.1))),
    );
    let chartContainerClassName = 'relative aspect-square w-[200px] max-w-full';
    let layoutClassName =
        'grid h-full grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)] md:justify-items-stretch';

    if (isFixedChartSize) {
        chartContainerClassName = 'relative h-[100px] w-[100px]';
        layoutClassName =
            'grid h-full grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-[100px_minmax(0,1fr)] md:justify-items-stretch';
    } else if (shrinkOnSmallScreen) {
        chartContainerClassName = 'relative aspect-square w-full min-w-[96px] max-w-[200px]';
        layoutClassName =
            'grid h-full grid-cols-1 items-center justify-items-center gap-4 md:grid-cols-[minmax(96px,40%)_minmax(0,1fr)] md:justify-items-stretch';
    }

    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const nextDiameter = Math.min(entry.contentRect.width, entry.contentRect.height);
            if (!Number.isFinite(nextDiameter) || nextDiameter <= 0) return;

            setChartDiameter(Math.round(nextDiameter));
        });

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, []);

    const pieData = labels.map((label, index) => ({
        label,
        value: Number(values[index] ?? 0),
        color: chartColors[index] || '#6B7280',
    }));

    return (
        <Widget title={title} titleBoldness="bold" className="flex-1">
            <div className={layoutClassName}>
                <div ref={chartContainerRef} className={chartContainerClassName} data-testid="donut-chart-container">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <PieChart width={chartDiameter} height={chartDiameter}>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="label"
                                innerRadius="70%"
                                outerRadius="100%"
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={1}
                                stroke="none"
                                isAnimationActive
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<DonutTooltip />} />
                        </PieChart>
                    </div>
                    {showCenterLabel && (
                        <div
                            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                            style={{ margin: 'auto', width: `${overlayWidth}px` }}
                        >
                            <span className="font-semibold leading-none text-center" style={{ fontSize: `${totalValueFontSize}px` }}>
                                {total}
                            </span>
                            <span className="font-medium leading-none text-center" style={{ fontSize: `${totalLabelFontSize}px` }}>
                                Total
                            </span>
                        </div>
                    )}
                </div>
                <SimpleBar forceVisible="y" style={{ height: '180px', width: '100%' }}>
                    <div className={isFixedChartSize ? 'flex-1 flex justify-end md:justify-center' : 'flex-1'}>
                        <div
                            className={
                                isFixedChartSize
                                    ? 'space-y-1.5 h-full w-full md:w-auto md:max-w-[220px] overflow-y-auto'
                                    : 'space-y-1.5 h-full w-full overflow-y-auto'
                            }
                        >
                            {labels.map((label, index) => (
                                <button
                                    type="button"
                                    key={label}
                                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-transparent border-none p-0 text-left ${
                                        interactiveLegend ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                    onClick={() => {
                                        if (!interactiveLegend) return;
                                        dispatch(actions.setCurrentFilters({ entity, currentFilters: onLegendClick(index, labels) }));
                                        navigate(redirect);
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: chartColors[index] || '#6B7280' }}
                                    />
                                    <span className="text-md text-one-row-ellipsis" title={label}>
                                        {label}
                                    </span>
                                    {showValuesInLegend && <span className="text-md text-left min-w-[28px]">{values[index] ?? 0}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                </SimpleBar>
            </div>
        </Widget>
    );
}

export default DonutChart;
