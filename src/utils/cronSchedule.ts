import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';

/** Core evaluates every scheduled-job cron in UTC, so an authored time is always a UTC time. */
export const CRON_TIME_ZONE = 'UTC';

/** Human description of the schedule, always spelling out the zone Core runs it in. */
export function describeCronInUtc(cronExpression: string | undefined): string | undefined {
    if (!cronExpression) {
        return undefined;
    }
    try {
        return `${cronstrue.toString(cronExpression)} (${CRON_TIME_ZONE})`;
    } catch {
        return undefined;
    }
}

/**
 * `sec min hour <LW|L-N> * <*|?>` — the month-end forms cron-parser rejects but the builder emits.
 * Narrowed to the builder's own shape: a hand-typed `0 0 12 LW 1 MON` restricts month and weekday,
 * which this fallback ignores, so it must fall through to "not previewable" instead of guessing.
 */
const QUARTZ_MONTH_END = /^(\d+) (\d+) (\d+) (LW|L-\d+) \* [*?]$/;

const LOOKAHEAD_MONTHS = 24;

function lastDayOfMonthUtc(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Quartz `LW`: the last Mon–Fri of the month. */
function lastWeekdayOfMonthUtc(year: number, monthIndex: number): number {
    const lastDay = lastDayOfMonthUtc(year, monthIndex);
    for (let day = lastDay; day >= 1; day -= 1) {
        const dayOfWeek = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            return day;
        }
    }
    return lastDay;
}

/**
 * Next firing of a Quartz month-end schedule. cron-parser understands plain `L` but not `LW` or
 * `L-N`, and the Monthly tab emits both, so resolving them here keeps every schedule the builder
 * can produce previewable.
 */
function getNextQuartzMonthEndRun(cronExpression: string, from: Date): Date | undefined {
    const match = QUARTZ_MONTH_END.exec(cronExpression.trim());
    if (!match) {
        return undefined;
    }
    const [, second, minute, hour, dayToken] = match;
    const daysBeforeEnd = dayToken === 'LW' ? 0 : Number(dayToken.slice(2));

    for (let monthOffset = 0; monthOffset < LOOKAHEAD_MONTHS; monthOffset += 1) {
        const year = from.getUTCFullYear();
        const monthIndex = from.getUTCMonth() + monthOffset;
        const probe = new Date(Date.UTC(year, monthIndex, 1));
        const probeYear = probe.getUTCFullYear();
        const probeMonth = probe.getUTCMonth();
        const day =
            dayToken === 'LW' ? lastWeekdayOfMonthUtc(probeYear, probeMonth) : lastDayOfMonthUtc(probeYear, probeMonth) - daysBeforeEnd;
        if (day < 1) {
            continue;
        }
        const candidate = new Date(Date.UTC(probeYear, probeMonth, day, Number(hour), Number(minute), Number(second)));
        if (candidate.getTime() > from.getTime()) {
            return candidate;
        }
    }
    return undefined;
}

/**
 * The next moment the schedule fires, as an absolute instant. Undefined for expressions neither
 * cron-parser nor the Quartz fallback can evaluate (e.g. a hand-typed 7-field expression with a
 * year), so callers must treat the preview as best-effort and fall back to the description alone.
 */
export function getNextCronRun(cronExpression: string | undefined, from: Date = new Date()): Date | undefined {
    if (!cronExpression) {
        return undefined;
    }
    try {
        return CronExpressionParser.parse(cronExpression, { tz: CRON_TIME_ZONE, currentDate: from }).next().toDate();
    } catch {
        return getNextQuartzMonthEndRun(cronExpression, from);
    }
}

/** Short name of the viewer's zone (e.g. `GMT+2`), so the local preview says which zone it is in. */
export function getLocalTimeZoneLabel(date: Date = new Date()): string | undefined {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-07-30 13:36` in the viewer's own zone — the form the UTC schedule actually lands on for them. */
export function formatLocalDateTime(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `2026-07-30 13:36` for the same instant read in UTC. */
export function formatUtcDateTime(date: Date): string {
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/**
 * `Next run: 2026-07-29 23:00 UTC → 2026-07-30 02:00 EEST (your local time)` — both readings of the
 * one instant, so the offset needs no mental arithmetic. Both sides always carry their date: the
 * offset can land them on different days, and a bare time next to a dated one reads as an omission.
 * Undefined when the schedule cannot be evaluated.
 */
export function describeNextCronRunLocally(cronExpression: string | undefined, from: Date = new Date()): string | undefined {
    const nextRun = getNextCronRun(cronExpression, from);
    if (!nextRun) {
        return undefined;
    }
    const zone = getLocalTimeZoneLabel(nextRun);
    const zoneSuffix = zone ? ` ${zone}` : '';
    const local = `${formatLocalDateTime(nextRun)}${zoneSuffix}`;
    return `Next run: ${formatUtcDateTime(nextRun)} ${CRON_TIME_ZONE} → ${local} (your local time)`;
}

/** Both lines joined for places that can only show plain text, such as a tooltip. */
export function describeCronSchedule(cronExpression: string | undefined, from: Date = new Date()): string | undefined {
    const lines = [describeCronInUtc(cronExpression), describeNextCronRunLocally(cronExpression, from)].filter(Boolean);
    return lines.length > 0 ? lines.join('\n') : undefined;
}
