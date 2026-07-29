import { describeCronInUtc, describeNextCronRunLocally } from 'utils/cronSchedule';

type Props = Readonly<{
    cronExpression: string | undefined;
    dataTestId?: string;
}>;

/**
 * Spells out what a schedule means: the description in the zone Core runs it in (UTC) plus the next
 * firing translated into the viewer's own zone, so an offset between the two is visible at a glance.
 */
export default function CronScheduleHint({ cronExpression, dataTestId = 'cron-schedule-hint' }: Props) {
    const description = describeCronInUtc(cronExpression);
    const nextRun = describeNextCronRunLocally(cronExpression);

    if (!description && !nextRun) {
        return null;
    }

    return (
        <div className="space-y-1" data-testid={dataTestId}>
            {description && (
                <p className="text-sm text-gray-600 dark:text-neutral-400" data-testid={`${dataTestId}-description`}>
                    {description}
                </p>
            )}
            {nextRun && (
                <p className="text-sm text-gray-500 dark:text-neutral-400" data-testid={`${dataTestId}-next-run`}>
                    {nextRun}
                </p>
            )}
        </div>
    );
}
