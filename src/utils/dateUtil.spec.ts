import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import {
    dateFormatter,
    timeFormatter,
    durationFormatter,
    formatTimeAgo,
    getFormattedDate,
    getFormattedDateTime,
    getFormattedUtc,
    getFormattedDateByType,
    getDateInString,
    getStrongFromCronExpression,
    checkIfFieldAttributeTypeIsDate,
    checkIfFieldTypeIsDate,
    checkIfFieldOperatorIsInterval,
} from './dateUtil';
import { AttributeContentType, FilterFieldType, FilterConditionOperator } from 'types/openapi';

describe('dateUtil', () => {
    describe('dateFormatter', () => {
        test('should format date string', () => {
            const result = dateFormatter('2024-01-15T10:30:45');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        });

        test('should format Date object', () => {
            const date = new Date('2024-06-15T14:25:30');
            const result = dateFormatter(date);
            expect(result).toContain('2024');
            expect(result).toContain('06');
            expect(result).toContain('15');
        });

        test('should pad single digit months and days', () => {
            const result = dateFormatter('2024-01-05T09:05:03');
            expect(result).toMatch(/2024-01-05/);
        });
    });

    describe('timeFormatter', () => {
        test('should format milliseconds as time', () => {
            const oneHour = 60 * 60 * 1000;
            const result = timeFormatter(oneHour);
            expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
        });

        test('should format time with days when duration > 24h', () => {
            const twoDays = 2 * 24 * 60 * 60 * 1000;
            const result = timeFormatter(twoDays);
            expect(result).toMatch(/\d{2}\.\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('durationFormatter', () => {
        test('should return empty string for null/undefined startDate', () => {
            expect(durationFormatter(null, null)).toBe('');
            expect(durationFormatter(undefined, undefined)).toBe('');
        });

        test('should format duration between two dates', () => {
            const start = '2024-01-01T00:00:00';
            const end = '2024-01-01T01:30:00';
            const result = durationFormatter(start, end);
            expect(result).toBeTruthy();
        });
    });

    describe('getFormattedDate', () => {
        test('should format date string as YYYY-MM-DD', () => {
            expect(getFormattedDate('2024-03-15T12:00:00')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('should return original string for invalid date', () => {
            expect(getFormattedDate('invalid')).toBe('invalid');
        });

        test('should keep a date-only value on its calendar day in any time zone', () => {
            const original = process.env.TZ;

            try {
                for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
                    process.env.TZ = zone;
                    expect(getFormattedDate('2026-09-01')).toBe('2026-09-01');
                }
            } finally {
                if (original === undefined) delete process.env.TZ;
                else process.env.TZ = original;
            }
        });
    });

    describe('getFormattedDateTime', () => {
        test('should format date string with time', () => {
            const result = getFormattedDateTime('2024-03-15T14:30:45');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        });

        test('should return original string for invalid date', () => {
            expect(getFormattedDateTime('invalid')).toBe('invalid');
        });
    });

    describe('getDateInString', () => {
        test('should return date with offset in ISO string', () => {
            const result = getDateInString(0);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('checkIfFieldAttributeTypeIsDate', () => {
        test('should return true for Date type', () => {
            expect(checkIfFieldAttributeTypeIsDate({ attributeContentType: AttributeContentType.Date } as any)).toBe(true);
        });

        test('should return true for Datetime type', () => {
            expect(checkIfFieldAttributeTypeIsDate({ attributeContentType: AttributeContentType.Datetime } as any)).toBe(true);
        });

        test('should return false for String type', () => {
            expect(checkIfFieldAttributeTypeIsDate({ attributeContentType: AttributeContentType.String } as any)).toBe(false);
        });
    });

    describe('checkIfFieldTypeIsDate', () => {
        test('should return true for Date', () => {
            expect(checkIfFieldTypeIsDate(FilterFieldType.Date)).toBe(true);
        });

        test('should return true for Datetime', () => {
            expect(checkIfFieldTypeIsDate(FilterFieldType.Datetime)).toBe(true);
        });

        test('should return undefined for Boolean', () => {
            expect(checkIfFieldTypeIsDate(FilterFieldType.Boolean)).toBeUndefined();
        });
    });

    describe('checkIfFieldOperatorIsInterval', () => {
        test('should return true for InNext', () => {
            expect(checkIfFieldOperatorIsInterval(FilterConditionOperator.InNext)).toBe(true);
        });

        test('should return true for InPast', () => {
            expect(checkIfFieldOperatorIsInterval(FilterConditionOperator.InPast)).toBe(true);
        });

        test('should return undefined for Equals', () => {
            expect(checkIfFieldOperatorIsInterval(FilterConditionOperator.Equals)).toBeUndefined();
        });
    });

    describe('getFormattedUtc', () => {
        test('should format datetime type to ISO string', () => {
            const result = getFormattedUtc('datetime' as AttributeContentType, '2024-03-15T14:30:45');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });

        test('should format date type to YYYY-MM-DD', () => {
            const result = getFormattedUtc('date' as AttributeContentType, '2024-03-15T14:30:45');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('should format time with HH:mm to HH:mm:ss', () => {
            const result = getFormattedUtc('time' as AttributeContentType, '14:30');
            expect(result).toBe('14:30:00');
        });

        test('should format time with HH to HH:mm:ss', () => {
            const result = getFormattedUtc('time' as AttributeContentType, '14');
            expect(result).toBe('14:00:00');
        });

        test('should return time unchanged if already HH:mm:ss', () => {
            const result = getFormattedUtc('time' as AttributeContentType, '14:30:45');
            expect(result).toBe('14:30:45');
        });

        test('should return original string for unknown type', () => {
            const result = getFormattedUtc('string' as AttributeContentType, 'some-value');
            expect(result).toBe('some-value');
        });

        test('should handle FilterFieldType.Datetime', () => {
            const result = getFormattedUtc(FilterFieldType.Datetime, '2024-06-20T10:00:00');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });

        test('should handle FilterFieldType.Date', () => {
            const result = getFormattedUtc(FilterFieldType.Date, '2024-06-20T10:00:00');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('getFormattedDateByType', () => {
        test('should format time type correctly', () => {
            const result = getFormattedDateByType('9:5:3', 'time' as AttributeContentType);
            expect(result).toBe('09:05:03');
        });

        test('should format time with leading zeros', () => {
            const result = getFormattedDateByType('14:30:45', 'time' as AttributeContentType);
            expect(result).toBe('14:30:45');
        });

        test('should format datetime type to ISO format without milliseconds', () => {
            const result = getFormattedDateByType('2024-03-15T14:30:45Z', 'datetime' as AttributeContentType);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
        });

        test('should format date type to YYYY-MM-DD', () => {
            const result = getFormattedDateByType('2024-03-15T14:30:45Z', 'date' as AttributeContentType);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('should return original string for unknown type', () => {
            const result = getFormattedDateByType('some-value', 'string' as AttributeContentType);
            expect(result).toBe('some-value');
        });

        test('should use UTC values for datetime formatting', () => {
            // Use a known UTC time
            const result = getFormattedDateByType('2024-12-25T12:30:45Z', 'datetime' as AttributeContentType);
            expect(result).toBe('2024-12-25T12:30:45');
        });

        test('should use UTC values for date formatting', () => {
            const result = getFormattedDateByType('2024-12-25T00:00:00Z', 'date' as AttributeContentType);
            expect(result).toBe('2024-12-25');
        });

        test('should pad single digit date components', () => {
            const result = getFormattedDateByType('2024-01-05T09:05:03Z', 'datetime' as AttributeContentType);
            expect(result).toBe('2024-01-05T09:05:03');
        });

        test('should handle date at month boundary', () => {
            const result = getFormattedDateByType('2024-02-29T23:59:59Z', 'date' as AttributeContentType);
            expect(result).toBe('2024-02-29');
        });
    });

    describe('getStrongFromCronExpression', () => {
        test('should return human-readable string for valid cron expression', () => {
            const result = getStrongFromCronExpression('0 0 * * *');
            expect(result).toBe('At 12:00 AM');
        });

        test('should return human-readable string for every minute', () => {
            const result = getStrongFromCronExpression('* * * * *');
            expect(result).toBe('Every minute');
        });

        test('should return human-readable string for every hour', () => {
            const result = getStrongFromCronExpression('0 * * * *');
            expect(result).toBe('Every hour');
        });

        test('should return human-readable string for specific time', () => {
            const result = getStrongFromCronExpression('30 14 * * *');
            expect(result).toBe('At 02:30 PM');
        });

        test('should return human-readable string for weekly schedule', () => {
            const result = getStrongFromCronExpression('0 9 * * 1');
            expect(result).toBe('At 09:00 AM, only on Monday');
        });

        test('should return human-readable string for monthly schedule', () => {
            const result = getStrongFromCronExpression('0 0 1 * *');
            expect(result).toBe('At 12:00 AM, on day 1 of the month');
        });

        test('should return undefined for invalid cron expression', () => {
            const result = getStrongFromCronExpression('invalid cron');
            expect(result).toBeUndefined();
        });

        test('should return undefined for empty string', () => {
            const result = getStrongFromCronExpression('');
            expect(result).toBeUndefined();
        });

        test('should return undefined for undefined input', () => {
            const result = getStrongFromCronExpression(undefined);
            expect(result).toBeUndefined();
        });

        test('should handle cron with seconds (6 fields)', () => {
            const result = getStrongFromCronExpression('0 0 12 * * *');
            expect(result).toBeTruthy();
        });
    });

    describe('formatTimeAgo', () => {
        beforeEach(() => {
            // Mock Date.now() to return a fixed timestamp
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        test('should format date from 2 years ago', () => {
            const twoYearsAgo = new Date('2022-06-15T12:00:00Z');
            const result = formatTimeAgo(twoYearsAgo);
            expect(result).toBe('2 years ago');
        });

        test('should format date from 1 year ago', () => {
            const oneYearAgo = new Date('2023-06-15T12:00:00Z');
            const result = formatTimeAgo(oneYearAgo);
            expect(result).toBe('1 year ago');
        });

        test('should format date from 3 months ago', () => {
            const threeMonthsAgo = new Date('2024-03-15T12:00:00Z');
            const result = formatTimeAgo(threeMonthsAgo);
            expect(result).toBe('3 months ago');
        });

        test('should format date from 2 weeks ago', () => {
            const twoWeeksAgo = new Date('2024-06-01T12:00:00Z');
            const result = formatTimeAgo(twoWeeksAgo);
            expect(result).toBe('2 weeks ago');
        });

        test('should format date from 5 days ago', () => {
            const fiveDaysAgo = new Date('2024-06-10T12:00:00Z');
            const result = formatTimeAgo(fiveDaysAgo);
            expect(result).toBe('5 days ago');
        });

        test('should format date from 3 hours ago', () => {
            const threeHoursAgo = new Date('2024-06-15T09:00:00Z');
            const result = formatTimeAgo(threeHoursAgo);
            expect(result).toBe('3 hours ago');
        });

        test('should format date from 30 minutes ago', () => {
            const thirtyMinutesAgo = new Date('2024-06-15T11:30:00Z');
            const result = formatTimeAgo(thirtyMinutesAgo);
            expect(result).toBe('30 minutes ago');
        });

        test('should format date in the future (in 2 years)', () => {
            const twoYearsFromNow = new Date('2026-06-15T12:00:00Z');
            const result = formatTimeAgo(twoYearsFromNow);
            expect(result).toBe('in 2 years');
        });

        test('should format date in the future (in 2 days)', () => {
            const twoDaysFromNow = new Date('2024-06-17T12:00:00Z');
            const result = formatTimeAgo(twoDaysFromNow);
            expect(result).toBe('in 2 days');
        });

        test('should format date in the future (in 5 hours)', () => {
            const fiveHoursFromNow = new Date('2024-06-15T17:00:00Z');
            const result = formatTimeAgo(fiveHoursFromNow);
            expect(result).toBe('in 5 hours');
        });

        test('should accept string date input', () => {
            const result = formatTimeAgo('2024-06-10T12:00:00Z');
            expect(result).toBe('5 days ago');
        });

        test('should accept Date object input', () => {
            const date = new Date('2024-06-10T12:00:00Z');
            const result = formatTimeAgo(date);
            expect(result).toBe('5 days ago');
        });

        test('should accept timestamp number input', () => {
            const timestamp = new Date('2024-06-10T12:00:00Z').getTime();
            const result = formatTimeAgo(timestamp);
            expect(result).toBe('5 days ago');
        });

        test('should return undefined for very small time difference (less than 1 second)', () => {
            const almostNow = new Date('2024-06-15T12:00:00.500Z');
            const result = formatTimeAgo(almostNow);
            expect(result).toBeUndefined();
        });
    });
});
