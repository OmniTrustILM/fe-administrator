import { describe, expect, test } from 'vitest';
import { ScheduledJobScheduleState, SchedulerJobExecutionStatus } from 'types/openapi';
import { getExecutionStatusBadgeColor, getScheduleStateBadgeColor } from './scheduler';

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

describe('getExecutionStatusBadgeColor', () => {
    test.each([
        [SchedulerJobExecutionStatus.Started, 'primary'],
        [SchedulerJobExecutionStatus.Succeeded, 'success'],
        [SchedulerJobExecutionStatus.Failed, 'danger'],
        [SchedulerJobExecutionStatus.Cancelled, 'secondary'],
    ])('%s maps to the %s badge', (status, expected) => {
        expect(getExecutionStatusBadgeColor(status)).toBe(expected);
    });

    test('gives every status a colour of its own', () => {
        const colours = Object.values(SchedulerJobExecutionStatus).map(getExecutionStatusBadgeColor);

        expect(new Set(colours).size).toBe(colours.length);
    });
});
