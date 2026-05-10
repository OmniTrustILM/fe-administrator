import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Checkbox from 'components/Checkbox';
import Label from 'components/Label';
import TabLayout from 'components/Layout/TabLayout';
import NumberInput from 'components/NumberInput';
import RadioRow from 'components/RadioRow';
import TextInput from 'components/TextInput';
import { getStrongFromCronExpression } from 'utils/dateUtil';
import Container from 'components/Container';
import { buildCron, parseCron, DAYS_OF_WEEK, TABS } from './cronUtils';
import type { CronState } from './cronUtils';

function StartTimePicker({
    atHour,
    atMinute,
    onHourChange,
    onMinuteChange,
}: Readonly<{
    atHour: number;
    atMinute: number;
    onHourChange: (v: number) => void;
    onMinuteChange: (v: number) => void;
}>) {
    return (
        <div className="flex items-center gap-2 mt-1 justify-center">
            <Label className="!mb-0 text-gray-500 whitespace-nowrap">Start time</Label>
            <NumberInput value={atHour} onChange={onHourChange} min={0} max={23} zeroPad />
            <span className="text-gray-400 font-bold">:</span>
            <NumberInput value={atMinute} onChange={onMinuteChange} min={0} max={59} zeroPad />
        </div>
    );
}

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export default function CronBuilder({ value, onChange }: Readonly<Props>) {
    const [state, setState] = useState<CronState>(() => parseCron(value));
    const lastEmittedRef = useRef<string>(value);

    useLayoutEffect(() => {
        if (value === lastEmittedRef.current) return;
        setState(parseCron(value));
    }, [value]);

    const update = useCallback(
        (patch: Partial<CronState>) => {
            setState((prev) => {
                const next = { ...prev, ...patch };
                const cron = buildCron(next);
                lastEmittedRef.current = cron;
                onChange(cron);
                return next;
            });
        },
        [onChange],
    );

    const handleTabChange = useCallback(
        (index: number) => {
            const newTab = TABS[index].id;
            setState((prev) => {
                const next: CronState = { ...prev, tab: newTab };
                if (newTab === 'custom') next.customExpression = buildCron(prev);
                const cron = buildCron(next);
                lastEmittedRef.current = cron;
                onChange(cron);
                return next;
            });
        },
        [onChange],
    );

    const currentCron = buildCron(state);
    const description = getStrongFromCronExpression(currentCron);

    const tabs = useMemo(
        () => [
            {
                title: 'Minutes',
                content: (
                    <div className="flex items-center gap-2 min-h-16 justify-center">
                        <Label className="!mb-0 whitespace-nowrap">Every</Label>
                        <NumberInput value={state.everyMinutes} onChange={(v) => update({ everyMinutes: v })} min={1} max={59} />
                        <Label className="!mb-0 whitespace-nowrap">minute(s)</Label>
                    </div>
                ),
            },
            {
                title: 'Hourly',
                content: (
                    <Container gap={4}>
                        <RadioRow checked={state.hourlyMode === 'everyN'} onSelect={() => update({ hourlyMode: 'everyN' })} maxWidth={500}>
                            <Label className="!mb-0 whitespace-nowrap">Every</Label>
                            <NumberInput
                                value={state.everyHours}
                                onChange={(v) => update({ hourlyMode: 'everyN', everyHours: v })}
                                min={1}
                                max={23}
                            />
                            <Label className="!mb-0 whitespace-nowrap">hour(s) at minute</Label>
                            <NumberInput
                                value={state.atMinute}
                                onChange={(v) => update({ hourlyMode: 'everyN', atMinute: v })}
                                min={0}
                                max={59}
                            />
                        </RadioRow>
                        <RadioRow checked={state.hourlyMode === 'atTime'} onSelect={() => update({ hourlyMode: 'atTime' })} maxWidth={500}>
                            <Label className="!mb-0 whitespace-nowrap">At</Label>
                            <NumberInput
                                value={state.atHour}
                                onChange={(v) => update({ hourlyMode: 'atTime', atHour: v })}
                                min={0}
                                max={23}
                                zeroPad
                            />
                            <NumberInput
                                value={state.atMinute}
                                onChange={(v) => update({ hourlyMode: 'atTime', atMinute: v })}
                                min={0}
                                max={59}
                                zeroPad
                            />
                        </RadioRow>
                    </Container>
                ),
            },
            {
                title: 'Daily',
                content: (
                    <Container gap={4}>
                        <RadioRow checked={state.dailyMode === 'everyN'} onSelect={() => update({ dailyMode: 'everyN' })} maxWidth={500}>
                            <Label className="!mb-0 whitespace-nowrap">Every</Label>
                            <NumberInput
                                value={state.everyDays}
                                onChange={(v) => update({ dailyMode: 'everyN', everyDays: v })}
                                min={1}
                                max={31}
                            />
                            <Label className="!mb-0 whitespace-nowrap">day(s)</Label>
                        </RadioRow>
                        <RadioRow
                            checked={state.dailyMode === 'weekdays'}
                            onSelect={() => update({ dailyMode: 'weekdays' })}
                            maxWidth={500}
                        >
                            <Label className="!mb-0">Every week day</Label>
                        </RadioRow>
                        <StartTimePicker
                            atHour={state.atHour}
                            atMinute={state.atMinute}
                            onHourChange={(v) => update({ atHour: v })}
                            onMinuteChange={(v) => update({ atMinute: v })}
                        />
                    </Container>
                ),
            },
            {
                title: 'Weekly',
                content: (
                    <div className="flex flex-col gap-4 max-w-96 m-auto">
                        <div className="grid grid-cols-2 gap-4">
                            {DAYS_OF_WEEK.map((day) => (
                                <Checkbox
                                    key={day.value}
                                    id={`cron-dow-${day.value}`}
                                    label={day.label}
                                    checked={state.weekDays.includes(day.value)}
                                    onChange={(checked) => {
                                        const days = checked
                                            ? [...state.weekDays, day.value]
                                            : state.weekDays.filter((d) => d !== day.value);
                                        update({ weekDays: days.length > 0 ? days : [day.value] });
                                    }}
                                />
                            ))}
                        </div>
                        <StartTimePicker
                            atHour={state.atHour}
                            atMinute={state.atMinute}
                            onHourChange={(v) => update({ atHour: v })}
                            onMinuteChange={(v) => update({ atMinute: v })}
                        />
                    </div>
                ),
            },
            {
                title: 'Monthly',
                content: (
                    <Container gap={4}>
                        <RadioRow checked={state.monthlyMode === 'dayN'} onSelect={() => update({ monthlyMode: 'dayN' })} maxWidth={500}>
                            <Label className="!mb-0 whitespace-nowrap">Day</Label>
                            <NumberInput
                                value={state.monthDay}
                                onChange={(v) => update({ monthlyMode: 'dayN', monthDay: v })}
                                min={1}
                                max={31}
                            />
                            <Label className="!mb-0 whitespace-nowrap">of every month(s)</Label>
                        </RadioRow>
                        <RadioRow
                            checked={state.monthlyMode === 'lastDay'}
                            onSelect={() => update({ monthlyMode: 'lastDay' })}
                            maxWidth={500}
                        >
                            <Label className="!mb-0">Last day of every month</Label>
                        </RadioRow>
                        <RadioRow
                            checked={state.monthlyMode === 'lastWeekday'}
                            onSelect={() => update({ monthlyMode: 'lastWeekday' })}
                            maxWidth={500}
                        >
                            <Label className="!mb-0">On the last weekday of every month</Label>
                        </RadioRow>
                        <RadioRow
                            checked={state.monthlyMode === 'daysBeforeEnd'}
                            onSelect={() => update({ monthlyMode: 'daysBeforeEnd' })}
                            maxWidth={500}
                        >
                            <NumberInput
                                value={state.daysBeforeEnd}
                                onChange={(v) => update({ monthlyMode: 'daysBeforeEnd', daysBeforeEnd: v })}
                                min={1}
                                max={30}
                            />
                            <Label className="!mb-0 whitespace-nowrap">day(s) before the end of the month</Label>
                        </RadioRow>
                        <RadioRow
                            checked={state.monthlyMode === 'everyN'}
                            onSelect={() => update({ monthlyMode: 'everyN' })}
                            maxWidth={500}
                        >
                            <NumberInput
                                value={state.monthlyEveryN}
                                onChange={(v) => update({ monthlyMode: 'everyN', monthlyEveryN: v })}
                                min={1}
                                max={31}
                            />
                            <Label className="!mb-0 whitespace-nowrap">day(s) of every month</Label>
                        </RadioRow>
                        <StartTimePicker
                            atHour={state.atHour}
                            atMinute={state.atMinute}
                            onHourChange={(v) => update({ atHour: v })}
                            onMinuteChange={(v) => update({ atMinute: v })}
                        />
                    </Container>
                ),
            },
            {
                title: 'Custom',
                content: (
                    <div className="flex items-center justify-center gap-2 min-h-16">
                        <Label className="!mb-0 whitespace-nowrap text-[var(--dark-gray-color)]">Expression</Label>
                        <div>
                            <TextInput
                                id="cron-custom"
                                value={state.customExpression}
                                onChange={(v) => update({ customExpression: v })}
                                placeholder="0 0 12 * * ?"
                                className="w-auto"
                            />
                        </div>
                    </div>
                ),
            },
        ],
        [state, update],
    );

    return (
        <div className="space-y-4">
            <TabLayout tabs={tabs} selectedTab={TABS.findIndex((t) => t.id === state.tab)} onTabChange={handleTabChange} noBorder />
            <div className="flex items-center gap-2 px-1">
                <code className="flex-1 text-sm font-mono bg-gray-100 dark:bg-neutral-800 text-[var(--dark-gray-color)] dark:text-neutral-300 px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700">
                    {description && <p className="text-sm text-gray-500 px-1 text-inherit">{description}</p>}
                </code>
            </div>
            <div className="flex items-center gap-2 px-1">
                <code className="flex-1 text-sm font-mono bg-gray-100 dark:bg-neutral-800 text-[var(--dark-gray-color)] dark:text-neutral-300 px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700">
                    {currentCron || '—'}
                </code>
            </div>
        </div>
    );
}
