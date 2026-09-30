import type { AppEpic } from 'ducks';
import { concat, from, iif, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, filter, map, mergeMap, switchMap, toArray } from 'rxjs/operators';
import { bulkDeleteFailureMessage, deleteSequentially } from 'utils/bulk-delete';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';

import { store } from '../App';
import { LockWidgetNameEnum } from 'types/user-interface';
import { EntityType } from './filters';
import { actions as pagingActions } from './paging';
import { selectors, slice } from './scheduler';
import { transformSearchRequestModelToDto } from './transform/certificates';
import {
    transformSchedulerJobDetailDtoToModel,
    transformSchedulerJobDtoToModel,
    transformSchedulerJobHistoryDtoToModel,
} from './transform/scheduler';

const listSchedulerJobs: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSchedulerJobs.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.SCHEDULER));
            return deps.apiClients.scheduler.listScheduledJobs(transformSearchRequestModelToDto(action.payload)).pipe(
                mergeMap((response) =>
                    of(
                        slice.actions.listSchedulerJobsSuccess(response.scheduledJobs.map(transformSchedulerJobDtoToModel)),
                        pagingActions.listSuccess({ entity: EntityType.SCHEDULER, totalItems: response.totalItems }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfScheduler),
                    ),
                ),

                catchError((err) =>
                    of(
                        pagingActions.listFailure(EntityType.SCHEDULER),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfScheduler),
                    ),
                ),
            );
        }),
    );
};

const getSchedulerJob: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getSchedulerJobDetail.match),

        switchMap((action) =>
            deps.apiClients.scheduler.getScheduledJobDetail({ uuid: action.payload.uuid }).pipe(
                switchMap((response) =>
                    of(
                        slice.actions.getSchedulerJobDetailSuccess(transformSchedulerJobDetailDtoToModel(response)),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.SchedulerJobDetail),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getSchedulerJobDetailFailure({ error: extractError(err, 'Failed to get Scheduled Job detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.SchedulerJobDetail),
                    ),
                ),
            ),
        ),
    );
};

const listSchedulerJobHistory: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSchedulerJobHistory.match),
        switchMap((action) => {
            store.dispatch(pagingActions.list(EntityType.SCHEDULER_HISTORY));
            return deps.apiClients.scheduler
                .getScheduledJobHistory({
                    uuid: action.payload.uuid,
                    ...transformSearchRequestModelToDto(action.payload.pagination),
                })
                .pipe(
                    mergeMap((response) =>
                        of(
                            slice.actions.listSchedulerJobHistorySuccess(
                                response.scheduledJobHistory.map(transformSchedulerJobHistoryDtoToModel),
                            ),
                            pagingActions.listSuccess({ entity: EntityType.SCHEDULER_HISTORY, totalItems: response.totalItems }),
                            userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfSchedulerHistory),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            pagingActions.listFailure(EntityType.SCHEDULER_HISTORY),
                            userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfSchedulerHistory),
                        ),
                    ),
                );
        }),
    );
};

const deleteSchedulerJob: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteSchedulerJob.match),
        switchMap((action) =>
            deps.apiClients.scheduler.deleteScheduledJob({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    iif(
                        () => action.payload.redirect,
                        of(
                            slice.actions.deleteSchedulerJobSuccess({ uuid: action.payload.uuid }),
                            appRedirectActions.redirect({ url: '../../jobs' }),
                        ),
                        of(slice.actions.deleteSchedulerJobSuccess({ uuid: action.payload.uuid })),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteSchedulerJobFailure({ error: extractError(err, 'Failed to delete Scheduled Job') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Scheduled Job' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteSchedulerJobs: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteSchedulerJobs.match),
        exhaustMap((action) => {
            // Read now: the list refresh that follows a delete empties the store before a failure comes back.
            const jobs = selectors.schedulerJobs(state$.value).map((job) => ({ uuid: job.uuid, name: job.jobName }));
            return deleteSequentially(action.payload.uuids, (uuid) => deps.apiClients.scheduler.deleteScheduledJob({ uuid })).pipe(
                mergeMap(({ deletedUuids, failures }) => {
                    if (failures.length === 0) {
                        return of(slice.actions.bulkDeleteSchedulerJobsSuccess({ uuids: deletedUuids }));
                    }

                    const message = bulkDeleteFailureMessage(failures, 'scheduled job', jobs);
                    return of(
                        slice.actions.bulkDeleteSchedulerJobsSuccess({ uuids: deletedUuids }),
                        slice.actions.bulkDeleteSchedulerJobsFailure({ error: message }),
                        appRedirectActions.fetchError({ error: undefined, message }),
                    );
                }),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteSchedulerJobsFailure({ error: extractError(err, 'Failed to delete Scheduled Jobs') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Scheduled Jobs' }),
                    ),
                ),
            );
        }),
    );
};

const enableSchedulerJob: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableSchedulerJob.match),
        switchMap((action) =>
            deps.apiClients.scheduler.enableScheduledJob({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.enableSchedulerJobSuccess({ uuid: action.payload.uuid })),

                catchError((err) =>
                    of(
                        slice.actions.enableSchedulerJobFailure({ error: extractError(err, 'Failed to enable Scheduled Job') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable Scheduled Job' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkEnableSchedulerJobs: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableSchedulerJobs.match),
        switchMap((action) => {
            return from(action.payload.uuids).pipe(
                concatMap((uuid) =>
                    deps.apiClients.scheduler.enableScheduledJob({ uuid }).pipe(
                        map(() => slice.actions.enableSchedulerJobSuccess({ uuid })),
                        catchError((err) =>
                            of(
                                slice.actions.enableSchedulerJobFailure({ error: extractError(err, 'Failed to enable Scheduled Job') }),
                                appRedirectActions.fetchError({ error: err, message: 'Failed to enable Scheduled Job' }),
                            ),
                        ),
                    ),
                ),
                toArray(),
                map(() => {
                    store.dispatch(slice.actions.bulkEnableSchedulerJobsSuccess({ uuids: action.payload.uuids }));
                    return alertActions.success('Successfully enabled selected Scheduled jobs');
                }),
                catchError((err) => {
                    return concat(
                        of(slice.actions.bulkEnableSchedulerJobsFailure({ error: 'There was some problem' })),
                        of(appRedirectActions.fetchError({ error: err, message: 'Failed to enable Scheduled Jobs' })),
                    );
                }),
            );
        }),
    );
};

const disableSchedulerJob: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableSchedulerJob.match),
        switchMap((action) =>
            deps.apiClients.scheduler.disableScheduledJob({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.disableSchedulerJobSuccess({ uuid: action.payload.uuid })),

                catchError((err) =>
                    of(
                        slice.actions.disableSchedulerJobFailure({ error: extractError(err, 'Failed to disable Scheduled Job') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable Scheduled Job' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableSchedulerJobs: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableSchedulerJobs.match),
        switchMap((action) => {
            return from(action.payload.uuids).pipe(
                concatMap((uuid) =>
                    deps.apiClients.scheduler.disableScheduledJob({ uuid }).pipe(
                        map(() => slice.actions.disableSchedulerJobSuccess({ uuid })),
                        catchError((err) =>
                            of(
                                slice.actions.disableSchedulerJobFailure({
                                    error: extractError(err, 'Failed to disable Scheduled Job'),
                                }),
                                appRedirectActions.fetchError({ error: err, message: 'Failed to disable Scheduled Job' }),
                            ),
                        ),
                    ),
                ),
                toArray(),
                map(() => {
                    store.dispatch(slice.actions.bulkDisableSchedulerJobsSuccess({ uuids: action.payload.uuids }));
                    return alertActions.success('Successfully disabled selected Scheduled jobs');
                }),
                catchError((err) => {
                    return concat(
                        of(slice.actions.bulkDisableSchedulerJobsFailure({ error: 'There was some problem' })),
                        of(appRedirectActions.fetchError({ error: err, message: 'Failed to enable Scheduled Jobs' })),
                    );
                }),
            );
        }),
    );
};

const updateSchedulerJobCron: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateSchedulerJobCron.match),
        switchMap((action) =>
            deps.apiClients.scheduler
                .updateScheduledJob({
                    uuid: action.payload.uuid,
                    updateScheduledJob: { cronExpression: action.payload.cronExpression },
                })
                .pipe(
                    mergeMap((response) =>
                        of(
                            slice.actions.updateSchedulerJobCronSuccess({
                                uuid: action.payload.uuid,
                                updateScheduledJob: response,
                            }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateSchedulerJobCronFailure({
                                error: extractError(err, 'Failed to update cron expression'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to update cron expression',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [
    listSchedulerJobs,
    listSchedulerJobHistory,
    getSchedulerJob,
    deleteSchedulerJob,
    bulkDeleteSchedulerJobs,
    enableSchedulerJob,
    disableSchedulerJob,
    bulkEnableSchedulerJobs,
    bulkDisableSchedulerJobs,
    updateSchedulerJobCron,
];

export default epics;
