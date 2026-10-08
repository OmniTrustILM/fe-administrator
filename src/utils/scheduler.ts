import type { BadgeColor } from 'components/Badge';
import { ScheduledJobScheduleState } from 'types/openapi';

export function getScheduleStateBadgeColor(scheduleState: ScheduledJobScheduleState, oneTime: boolean): BadgeColor {
    switch (scheduleState) {
        case ScheduledJobScheduleState.Scheduled:
            return 'success';

        case ScheduledJobScheduleState.Blocked:
            return 'warning';

        case ScheduledJobScheduleState.Error:
            return 'danger';

        // No trigger is how a one-time job ends once it has run; any other job will not fire until it is registered again.
        case ScheduledJobScheduleState.NotScheduled:
            return oneTime ? 'secondary' : 'warning';

        // `unknown` lands here too: an unreadable scheduler is not a fault of the job.
        default:
            return 'secondary';
    }
}
