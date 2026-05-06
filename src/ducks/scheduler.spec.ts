import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './scheduler';

describe('scheduler slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isFetchingDetail: true, schedulerJob: { uuid: 'x' } } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('listSchedulerJobs clears list', () => {
        const pre = { ...initialState, schedulerJobs: [{ uuid: 'j-1' } as any] };
        const next = reducer(pre, actions.listSchedulerJobs({} as any));
        expect(next.schedulerJobs).toEqual([]);
    });

    test('listSchedulerJobsSuccess populates list', () => {
        const jobs = [{ uuid: 'j-1' } as any, { uuid: 'j-2' } as any];
        const next = reducer(initialState, actions.listSchedulerJobsSuccess(jobs));
        expect(next.schedulerJobs).toEqual(jobs);
    });

    test('listSchedulerJobHistory clears history', () => {
        const pre = { ...initialState, schedulerJobHistory: [{ uuid: 'h-1' } as any] };
        const next = reducer(pre, actions.listSchedulerJobHistory({ uuid: 'j-1', pagination: {} as any }));
        expect(next.schedulerJobHistory).toEqual([]);
    });

    test('listSchedulerJobHistorySuccess populates history', () => {
        const history = [{ uuid: 'h-1' } as any];
        const next = reducer(initialState, actions.listSchedulerJobHistorySuccess(history));
        expect(next.schedulerJobHistory).toEqual(history);
    });

    test('getSchedulerJobDetail / success (existing) / failure flags', () => {
        let next = reducer(
            { ...initialState, schedulerJobs: [{ uuid: 'j-1' } as any], schedulerJob: { uuid: 'j-1' } as any },
            actions.getSchedulerJobDetail({ uuid: 'j-1' }),
        );
        expect(next.schedulerJob).toBeUndefined();
        expect(next.isFetchingDetail).toBe(true);

        next = reducer(next, actions.getSchedulerJobDetailSuccess({ uuid: 'j-1', enabled: true } as any));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.schedulerJob).toEqual({ uuid: 'j-1', enabled: true });
        expect(next.schedulerJobs[0]).toEqual({ uuid: 'j-1', enabled: true });

        next = reducer({ ...next, isFetchingDetail: true }, actions.getSchedulerJobDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getSchedulerJobDetailSuccess pushes new job when not in list', () => {
        const next = reducer({ ...initialState, schedulerJobs: [] }, actions.getSchedulerJobDetailSuccess({ uuid: 'j-99' } as any));
        expect(next.schedulerJobs).toHaveLength(1);
        expect(next.schedulerJobs[0].uuid).toBe('j-99');
    });

    test('deleteSchedulerJob / success (in list + current) / failure', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1' } as any, { uuid: 'j-2' } as any],
            schedulerJob: { uuid: 'j-1' } as any,
        };

        let next = reducer(pre, actions.deleteSchedulerJob({ uuid: 'j-1', redirect: false }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.schedulerJobs).toHaveLength(1);
        expect(next.schedulerJobs[0].uuid).toBe('j-2');
        expect(next.schedulerJob).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteSchedulerJobFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('deleteSchedulerJobSuccess does not clear schedulerJob when uuid differs', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1' } as any],
            schedulerJob: { uuid: 'j-2' } as any,
        };
        const next = reducer(pre, actions.deleteSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.schedulerJob).toBeDefined();
    });

    test('bulkDeleteSchedulerJobs / success removes only deleted jobs / failure', () => {
        const items = [{ uuid: 'j-1' } as any, { uuid: 'j-2' } as any, { uuid: 'j-3' } as any];
        const schedulerJob = { uuid: 'j-2' } as any;

        let next = reducer(
            { ...initialState, schedulerJobs: items, schedulerJob },
            actions.bulkDeleteSchedulerJobs({ uuids: ['j-1', 'j-2'] }),
        );
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteSchedulerJobsSuccess({ uuids: ['j-1'] }));
        expect(next.isDeleting).toBe(false);
        expect(next.schedulerJobs).toEqual([{ uuid: 'j-2' }, { uuid: 'j-3' }]);
        expect(next.schedulerJob).toEqual(schedulerJob);

        next = reducer({ ...next, isDeleting: true }, actions.bulkDeleteSchedulerJobsFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('bulkDeleteSchedulerJobsSuccess clears schedulerJob when its uuid is deleted', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1' } as any],
            schedulerJob: { uuid: 'j-1' } as any,
        };
        const next = reducer(pre, actions.bulkDeleteSchedulerJobsSuccess({ uuids: ['j-1'] }));
        expect(next.schedulerJob).toBeUndefined();
    });

    test('bulkEnableSchedulerJobs / success marks uuids enabled / failure', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: false } as any, { uuid: 'j-2', enabled: false } as any],
        };

        let next = reducer(pre, actions.bulkEnableSchedulerJobs({ uuids: ['j-1'] }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableSchedulerJobsSuccess({ uuids: ['j-1'] }));
        expect(next.isEnabling).toBe(false);
        expect(next.schedulerJobs[0].enabled).toBe(true);
        expect(next.schedulerJobs[1].enabled).toBe(false);

        next = reducer({ ...next, isEnabling: true }, actions.bulkEnableSchedulerJobsFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('enableSchedulerJob / success updates list and detail / failure', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: false } as any],
            schedulerJob: { uuid: 'j-1', enabled: false } as any,
        };

        let next = reducer(pre, actions.enableSchedulerJob({ uuid: 'j-1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.schedulerJobs[0].enabled).toBe(true);
        expect(next.schedulerJob?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableSchedulerJobFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('enableSchedulerJobSuccess does not update schedulerJob when uuid differs', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: false } as any],
            schedulerJob: { uuid: 'j-2', enabled: false } as any,
        };
        const next = reducer(pre, actions.enableSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.schedulerJob?.enabled).toBe(false);
    });

    test('bulkDisableSchedulerJobs / success marks uuids disabled / failure', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: true } as any, { uuid: 'j-2', enabled: true } as any],
        };

        let next = reducer(pre, actions.bulkDisableSchedulerJobs({ uuids: ['j-1'] }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.bulkDisableSchedulerJobsSuccess({ uuids: ['j-1'] }));
        expect(next.isEnabling).toBe(false);
        expect(next.schedulerJobs[0].enabled).toBe(false);
        expect(next.schedulerJobs[1].enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.bulkDisableSchedulerJobsFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableSchedulerJob / success updates list and detail / failure', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: true } as any],
            schedulerJob: { uuid: 'j-1', enabled: true } as any,
        };

        let next = reducer(pre, actions.disableSchedulerJob({ uuid: 'j-1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.disableSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.schedulerJobs[0].enabled).toBe(false);
        expect(next.schedulerJob?.enabled).toBe(false);

        next = reducer({ ...next, isEnabling: true }, actions.disableSchedulerJobFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableSchedulerJobSuccess does not update schedulerJob when uuid differs', () => {
        const pre = {
            ...initialState,
            schedulerJobs: [{ uuid: 'j-1', enabled: true } as any],
            schedulerJob: { uuid: 'j-2', enabled: true } as any,
        };
        const next = reducer(pre, actions.disableSchedulerJobSuccess({ uuid: 'j-1' }));
        expect(next.schedulerJob?.enabled).toBe(true);
    });

    test('updateSchedulerJobCron / success updates cronExpression / failure', () => {
        const pre = {
            ...initialState,
            schedulerJob: { uuid: 'j-1', cronExpression: '0 * * * *' } as any,
        };

        let next = reducer(pre, actions.updateSchedulerJobCron({ uuid: 'j-1', cronExpression: '0 0 * * *' }));
        expect(next.isUpdatingCron).toBe(true);

        next = reducer(next, actions.updateSchedulerJobCronSuccess({ uuid: 'j-1', updateScheduledJob: { cronExpression: '0 0 * * *' } }));
        expect(next.isUpdatingCron).toBe(false);
        expect(next.schedulerJob?.cronExpression).toBe('0 0 * * *');

        next = reducer({ ...next, isUpdatingCron: true }, actions.updateSchedulerJobCronFailure({ error: 'err' }));
        expect(next.isUpdatingCron).toBe(false);
    });

    test('updateSchedulerJobCronSuccess does not change schedulerJob when uuid differs', () => {
        const pre = {
            ...initialState,
            schedulerJob: { uuid: 'j-2', cronExpression: '0 * * * *' } as any,
        };
        const next = reducer(
            pre,
            actions.updateSchedulerJobCronSuccess({ uuid: 'j-1', updateScheduledJob: { cronExpression: '0 0 * * *' } }),
        );
        expect(next.schedulerJob?.cronExpression).toBe('0 * * * *');
    });

    test('updateSchedulerJobCronSuccess uses empty string when cronExpression is missing', () => {
        const pre = {
            ...initialState,
            schedulerJob: { uuid: 'j-1', cronExpression: '0 * * * *' } as any,
        };
        const next = reducer(pre, actions.updateSchedulerJobCronSuccess({ uuid: 'j-1', updateScheduledJob: {} }));
        expect(next.schedulerJob?.cronExpression).toBe('');
    });
});

describe('scheduler selectors', () => {
    test('all selectors read correct values from store', () => {
        const featureState = {
            ...initialState,
            schedulerJob: { uuid: 'j-1' },
            schedulerJobs: [{ uuid: 'j-1' }, { uuid: 'j-2' }],
            schedulerJobHistory: [{ uuid: 'h-1' }],
            isFetchingDetail: true,
            isDeleting: true,
            isEnabling: true,
            isUpdatingCron: true,
        } as any;

        const state = { scheduler: featureState } as any;

        expect(selectors.schedulerJob(state)).toEqual({ uuid: 'j-1' });
        expect(selectors.schedulerJobs(state)).toHaveLength(2);
        expect(selectors.schedulerJobHistory(state)).toHaveLength(1);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isUpdatingCron(state)).toBe(true);
        expect(selectors.state(state)).toBe(featureState);
    });
});
