import { describe, expect, test } from 'vitest';
import { ScheduledJobScheduleState } from 'types/openapi';
import { getScheduleStateBadgeColor } from './scheduler';

describe('getScheduleStateBadgeColor', () => {
    test.each([
        [ScheduledJobScheduleState.Scheduled, 'success'],
        [ScheduledJobScheduleState.Paused, 'secondary'],
        [ScheduledJobScheduleState.Blocked, 'warning'],
        [ScheduledJobScheduleState.Error, 'danger'],
        [ScheduledJobScheduleState.Complete, 'secondary'],
        [ScheduledJobScheduleState.NotScheduled, 'warning'],
        [ScheduledJobScheduleState.Unknown, 'secondary'],
    ])('%s maps to the %s badge on a recurring job', (scheduleState, expected) => {
        expect(getScheduleStateBadgeColor(scheduleState, false)).toBe(expected);
    });

    test('a one-time job without a trigger is neutral: it has run and left the scheduler', () => {
        expect(getScheduleStateBadgeColor(ScheduledJobScheduleState.NotScheduled, true)).toBe('secondary');
    });

    test.each(Object.values(ScheduledJobScheduleState).filter((scheduleState) => scheduleState !== ScheduledJobScheduleState.NotScheduled))(
        '%s reads the same on a one-time job',
        (scheduleState) => {
            expect(getScheduleStateBadgeColor(scheduleState, true)).toBe(getScheduleStateBadgeColor(scheduleState, false));
        },
    );

    test('a state this build does not know is neutral, not a fault', () => {
        expect(getScheduleStateBadgeColor('somethingCoreAddedLater' as ScheduledJobScheduleState, false)).toBe('secondary');
    });
});
