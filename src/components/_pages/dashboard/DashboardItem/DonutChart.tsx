import { useEffect, useRef, useState } from 'react';
import Widget from 'components/Widget';
import { type EntityType, actions } from 'ducks/filters';
import ReactApexChart from 'react-apexcharts';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
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

    const options: ApexCharts.ApexOptions = {
        labels: labels,
        fill: {
            type: 'solid',
        },
        dataLabels: {
            enabled: false,
            formatter: (val: any, opts: any) => opts.w.config.series[opts.seriesIndex],
        },
        chart: {
            width: '100%',
            height: '100%',
            toolbar: {
                show: false,
            },
        },
        legend: {
            show: false,
        },
        plotOptions: {
            pie: {
                expandOnClick: false,
            },
        },
        tooltip: {
            enabled: true,
            custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
                const label = w.globals.labels[seriesIndex];
                const value = series[seriesIndex];
                const color = w.globals.colors[seriesIndex];

                return `
                    <div class="py-1 px-2 bg-[var(--tooltip-background-color)] text-xs font-medium text-white shadow-2xs dark:bg-neutral-700 border-[var(--tooltip-background-color)]">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
                            <span>${label}: ${value}</span>
                        </div>
                    </div>
                `;
            },
            style: {
                fontSize: '14px',
                fontFamily: 'inherit',
            },
            theme: 'light',
            cssClass: 'apexcharts-custom-tooltip',
        },
        markers: {
            size: 4,
            hover: {
                sizeOffset: 0,
            },
        },
        states: {
            active: {
                filter: {
                    type: 'none',
                },
            },
        },
    };

    const chartLabels = useGetLabels(data);
    const chartColors = colorOptions?.colors || getDefaultColors();
    const isFixedChartSize = chartSize === 'fixed';
    const [chartDiameter, setChartDiameter] = useState(isFixedChartSize ? 100 : 200);
    const [overlayCenter, setOverlayCenter] = useState({ x: 0, y: 0 });
    const [overlayWidth, setOverlayWidth] = useState(Math.round((isFixedChartSize ? 100 : 200) * 0.68));
    const totalCharsOverBase = Math.max(totalText.length - 3, 0);
    const normalizedDiameter = Math.max(chartDiameter, isFixedChartSize ? 90 : 110);
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

        const updateOverlayMetrics = () => {
            const containerRect = container.getBoundingClientRect();
            if (containerRect.width <= 0 || containerRect.height <= 0) return;

            const pieElement = container.querySelector('.apexcharts-pie') as SVGGraphicsElement | null;
            const svgElement = container.querySelector('svg') as SVGSVGElement | null;
            const targetRect = pieElement?.getBoundingClientRect() ?? svgElement?.getBoundingClientRect() ?? containerRect;

            const targetDiameter = Math.min(targetRect.width, targetRect.height);
            const nextCenterX = targetRect.left - containerRect.left + targetRect.width / 2;
            const nextCenterY = targetRect.top - containerRect.top + targetRect.height / 2;

            if (Number.isFinite(nextCenterX) && Number.isFinite(nextCenterY)) {
                setOverlayCenter({ x: Math.round(nextCenterX), y: Math.round(nextCenterY) });
            }

            if (Number.isFinite(targetDiameter) && targetDiameter > 0) {
                setOverlayWidth(Math.round(targetDiameter * 0.68));
            }
        };

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const nextDiameter = Math.min(entry.contentRect.width, entry.contentRect.height);
            if (!Number.isFinite(nextDiameter) || nextDiameter <= 0) return;

            setChartDiameter(Math.round(nextDiameter));
            updateOverlayMetrics();
        });

        observer.observe(container);

        const raf = requestAnimationFrame(updateOverlayMetrics);
        const delayedUpdate = globalThis.setTimeout(updateOverlayMetrics, 120);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(raf);
            globalThis.clearTimeout(delayedUpdate);
        };
    }, [chartSize, shrinkOnSmallScreen]);

    options.colors = chartColors;

    return (
        <Widget title={title} titleBoldness="bold" className="flex-1">
            <div className={layoutClassName}>
                <div ref={chartContainerRef} className={chartContainerClassName} data-testid="donut-chart-container">
                    <ReactApexChart options={options} series={values} type="donut" height="100%" width="100%" />
                    {showCenterLabel && (
                        <div
                            className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center"
                            style={{ left: `${overlayCenter.x}px`, top: `${overlayCenter.y}px`, width: `${overlayWidth}px` }}
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
                            {chartLabels.map((label, index) => (
                                <button
                                    type="button"
                                    key={label}
                                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-transparent border-none p-0 text-left ${
                                        interactiveLegend ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                    onClick={() => {
                                        if (!interactiveLegend) return;
                                        dispatch(actions.setCurrentFilters({ entity, currentFilters: onLegendClick(index, chartLabels) }));
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
