import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Badge from 'components/Badge';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { actions, selectors } from 'ducks/scheduler';

import BooleanBadge from 'components/BooleanBadge/BooleanBadge';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import type { SearchRequestModel } from 'types/certificate';
import { PlatformEnum, SchedulerJobExecutionStatus } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';

function SchedulerJobsList() {
    const dispatch = useDispatch();

    const schedulerJobs = useSelector(selectors.schedulerJobs);
    const isDeleting = useSelector(selectors.isDeleting);
    const isEnabling = useSelector(selectors.isEnabling);
    const isBusy = isDeleting || isEnabling;

    const schedulerJobExecutionStatusEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.SchedulerJobExecutionStatus));

    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.SCHEDULER));

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableSchedulerJobs({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableSchedulerJobs({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'check',
                disabled: isBusy || checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: isBusy || checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [isBusy, checkedRows.length, onDisableClick, onEnableClick],
    );

    const schedulerJobsRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'name',
                width: 'auto',
            },
            {
                content: 'Job Type',
                sortable: true,
                sort: 'asc',
                id: 'jobtype',
                width: 'auto',
            },
            {
                content: 'Cron Expression',
                id: 'cron',
                width: '60%',
            },
            {
                content: 'Last Execution Status',
                sortable: true,
                sort: 'asc',
                id: 'status',
                width: 'auto',
            },
            {
                content: 'System',
                sortable: true,
                sort: 'asc',
                id: 'system',
                width: 'auto',
            },
            {
                content: 'One Time Only',
                sortable: true,
                sort: 'asc',
                id: 'onetime',
                width: 'auto',
            },
            {
                content: 'Enabled',
                sortable: true,
                sort: 'asc',
                id: 'enabled',
                width: 'auto',
            },
        ],
        [],
    );

    const schedulerJobList: TableDataRow[] = useMemo(
        () =>
            schedulerJobs.map((schedulerJob) => ({
                id: schedulerJob.uuid,
                columns: [
                    <Link key="name" to={`./detail/${schedulerJob.uuid}`}>
                        {schedulerJob.jobName}
                    </Link>,
                    schedulerJob.jobType,
                    schedulerJob.cronExpression,
                    <Badge
                        key="status"
                        color={(() => {
                            if (schedulerJob.lastExecutionStatus === SchedulerJobExecutionStatus.Failed) return 'danger';
                            return schedulerJob.lastExecutionStatus === SchedulerJobExecutionStatus.Succeeded ? 'success' : 'primary';
                        })()}
                    >
                        {getEnumLabel(schedulerJobExecutionStatusEnum, schedulerJob.lastExecutionStatus)}
                    </Badge>,
                    <BooleanBadge key="system" value={schedulerJob.system} />,
                    <BooleanBadge key="oneTime" value={schedulerJob.oneTime} />,
                    <BooleanBadge key="enabled" value={schedulerJob.enabled} />,
                ],
            })),
        [schedulerJobs, schedulerJobExecutionStatusEnum],
    );

    const onListCallback = useCallback((pagination: SearchRequestModel) => dispatch(actions.listSchedulerJobs(pagination)), [dispatch]);

    return (
        <PagedList
            entity={EntityType.SCHEDULER}
            onListCallback={onListCallback}
            onDeleteCallback={(uuids) => dispatch(actions.bulkDeleteSchedulerJobs({ uuids }))}
            headers={schedulerJobsRowHeaders}
            data={schedulerJobList}
            isBusy={isBusy}
            addHidden={true}
            title="Scheduled Jobs Store"
            entityNameSingular="a Scheduled Job"
            entityNamePlural="Scheduled Jobs"
            pageWidgetLockName={LockWidgetNameEnum.ListOfScheduler}
            additionalButtons={buttons}
        />
    );
}

export default SchedulerJobsList;
