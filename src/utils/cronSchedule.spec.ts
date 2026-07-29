import { describe, expect, test } from 'vitest';
import { CRON_TIME_ZONE, describeCronInUtc, describeCronSchedule, describeNextCronRunLocally, getNextCronRun } from './cronSchedule';

// Fixed reference point so the expected next firing never depends on when the suite runs.
const FROM = new Date('2026-07-29T10:00:00Z');

describe('cronSchedule', () => {
    describe('describeCronInUtc', () => {
        test('names the zone Core runs the schedule in', () => {
            expect(describeCronInUtc('0 36 11 * * ?')).toBe('At 11:36 AM (UTC)');
        });

        test('returns undefined for a blank or unparseable expression', () => {
            expect(describeCronInUtc(undefined)).toBeUndefined();
            expect(describeCronInUtc('')).toBeUndefined();
            expect(describeCronInUtc('not a cron')).toBeUndefined();
        });
    });

    describe('getNextCronRun', () => {
        test('evaluates the expression in UTC, not in the machine zone', () => {
            // 11:36 is already past 10:00 today, so the next firing is today at 11:36 UTC.
            expect(getNextCronRun('0 36 11 * * ?', FROM)?.toISOString()).toBe('2026-07-29T11:36:00.000Z');
            // 09:00 is behind the reference point, so it rolls to the next day.
            expect(getNextCronRun('0 0 9 * * ?', FROM)?.toISOString()).toBe('2026-07-30T09:00:00.000Z');
        });

        test('handles the Quartz forms the builder emits', () => {
            expect(getNextCronRun('0 0/5 * * * ?', FROM)?.toISOString()).toBe('2026-07-29T10:05:00.000Z');
            expect(getNextCronRun('0 0 12 ? * MON-FRI', FROM)?.toISOString()).toBe('2026-07-29T12:00:00.000Z');
            expect(getNextCronRun('0 0 0 L * ?', FROM)?.toISOString()).toBe('2026-07-31T00:00:00.000Z');
        });

        test('resolves the Quartz month-end forms cron-parser rejects', () => {
            // 31 Jul 2026 is a Friday, so the last weekday of the month is the last day itself.
            expect(getNextCronRun('0 0 12 LW * ?', FROM)?.toISOString()).toBe('2026-07-31T12:00:00.000Z');
            // 3 days before 31 Jul is the 28th, already past the reference point, so it rolls to August.
            expect(getNextCronRun('0 0 12 L-3 * ?', FROM)?.toISOString()).toBe('2026-08-28T12:00:00.000Z');
        });

        test('walks back off a weekend for LW', () => {
            // 31 May 2026 is a Sunday and 30 May a Saturday, so the last weekday is Friday the 29th.
            const may = new Date('2026-05-01T00:00:00Z');
            expect(getNextCronRun('0 0 12 LW * ?', may)?.toISOString()).toBe('2026-05-29T12:00:00.000Z');
        });

        test('rolls the month-end forms forward once this month has passed', () => {
            const afterJulyRun = new Date('2026-07-31T13:00:00Z');
            // 31 Aug 2026 is a Monday.
            expect(getNextCronRun('0 0 12 LW * ?', afterJulyRun)?.toISOString()).toBe('2026-08-31T12:00:00.000Z');
        });

        test('returns undefined for expressions neither path can evaluate', () => {
            // Seven-field (with year) expressions are reachable through the Custom tab.
            expect(getNextCronRun('0 15 10 * * ? 2026', FROM)).toBeUndefined();
            expect(getNextCronRun('nonsense', FROM)).toBeUndefined();
            expect(getNextCronRun(undefined, FROM)).toBeUndefined();
        });
    });

    describe('describeNextCronRunLocally', () => {
        test('shows both readings of the one instant so the offset needs no arithmetic', () => {
            // Asserted against the same instant converted by the runtime, so the test holds in any zone.
            const nextRun = getNextCronRun('0 36 11 * * ?', FROM)!;
            const localHour = String(nextRun.getHours()).padStart(2, '0');
            const localMinute = String(nextRun.getMinutes()).padStart(2, '0');

            const described = describeNextCronRunLocally('0 36 11 * * ?', FROM);
            expect(described).toContain(`2026-07-29 11:36 ${CRON_TIME_ZONE} →`);
            expect(described).toContain(`${localHour}:${localMinute}`);
            expect(described).toContain('your local time');
        });

        test('dates both sides, so a schedule that lands on another day reads unambiguously', () => {
            // Matched on the prefix: in a UTC machine zone the local half spells "UTC" too.
            expect(describeNextCronRunLocally('0 36 11 * * ?', FROM)!.startsWith('Next run: 2026-07-29 11:36 UTC →')).toBe(true);
        });

        test('is undefined when the schedule cannot be evaluated', () => {
            expect(describeNextCronRunLocally('0 15 10 * * ? 2026', FROM)).toBeUndefined();
        });
    });

    describe('describeCronSchedule', () => {
        test('joins the UTC description and the local preview', () => {
            const [description, nextRun] = describeCronSchedule('0 36 11 * * ?', FROM)!.split('\n');
            expect(description).toContain(CRON_TIME_ZONE);
            expect(nextRun).toContain('Next run:');
        });

        test('falls back to the description alone when there is no evaluable next run', () => {
            expect(describeCronSchedule('0 15 10 * * ? 2026', FROM)).toBe('At 10:15 AM, only in 2026 (UTC)');
        });

        test('is undefined when nothing can be said about the expression', () => {
            expect(describeCronSchedule('not a cron', FROM)).toBeUndefined();
        });
    });
});
