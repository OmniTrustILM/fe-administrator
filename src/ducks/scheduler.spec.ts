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

    describe.each([
        {
            name: 'enable',
            bulkRequest: actions.bulkEnableSchedulerJobs,
            bulkSuccess: actions.bulkEnableSchedulerJobsSuccess,
            bulkFailure: actions.bulkEnableSchedulerJobsFailure,
            request: actions.enableSchedulerJob,
            success: actions.enableSchedulerJobSuccess,
            failure: actions.enableSchedulerJobFailure,
        },
        {
            name: 'disable',
            bulkRequest: actions.bulkDisableSchedulerJobs,
            bulkSuccess: actions.bulkDisableSchedulerJobsSuccess,
            bulkFailure: actions.bulkDisableSchedulerJobsFailure,
            request: actions.disableSchedulerJob,
            success: actions.disableSchedulerJobSuccess,
            failure: actions.disableSchedulerJobFailure,
        },
    ])('$name', ({ bulkRequest, bulkSuccess, bulkFailure, request, success, failure }) => {
        const stale = { uuid: 'j-1', enabled: false, scheduleState: 'paused' } as any;
        const fresh = { uuid: 'j-1', enabled: true, scheduleState: 'scheduled' } as any;

        test('bulk success asks for the list to be re-read and patches no row', () => {
            const pre = { ...initialState, schedulerJobs: [stale, { uuid: 'j-2' } as any] };

            let next = reducer(pre, bulkRequest({ uuids: ['j-1'] }));
            expect(next.isEnabling).toBe(true);

            next = reducer(next, bulkSuccess({ uuids: ['j-1'] }));
            expect(next.isEnabling).toBe(false);
            expect(next.listRefreshToken).toBe(pre.listRefreshToken + 1);
            expect(next.schedulerJobs).toEqual(pre.schedulerJobs);

            next = reducer({ ...next, isEnabling: true }, bulkFailure({ error: 'err' }));
            expect(next.isEnabling).toBe(false);
        });

        test('success replaces the detail and its list row with the re-read job', () => {
            const pre = { ...initialState, schedulerJobs: [stale, { uuid: 'j-2' } as any], schedulerJob: stale };

            let next = reducer(pre, request({ uuid: 'j-1' }));
            expect(next.isEnabling).toBe(true);

            next = reducer(next, success({ uuid: 'j-1', schedulerJob: fresh }));
            expect(next.isEnabling).toBe(false);
            expect(next.schedulerJob).toEqual(fresh);
            expect(next.schedulerJobs).toEqual([fresh, { uuid: 'j-2' }]);

            next = reducer({ ...next, isEnabling: true }, failure({ error: 'err' }));
            expect(next.isEnabling).toBe(false);
        });

        test('success leaves another job open in the detail alone', () => {
            const other = { uuid: 'j-2', enabled: false } as any;
            const next = reducer({ ...initialState, schedulerJob: other }, success({ uuid: 'j-1', schedulerJob: fresh }));
            expect(next.schedulerJob).toEqual(other);
            expect(next.schedulerJobs).toEqual([]);
        });

        test('success without a re-read job drops the stale detail and keeps the list row', () => {
            const pre = { ...initialState, isEnabling: true, schedulerJobs: [stale], schedulerJob: stale };
            const next = reducer(pre, success({ uuid: 'j-1' }));
            expect(next.isEnabling).toBe(false);
            expect(next.schedulerJob).toBeUndefined();
            expect(next.schedulerJobs).toEqual([stale]);
        });
    });

    test('updateSchedulerJobCron / success takes the whole job from the response / failure', () => {
        const stale = { uuid: 'j-1', cronExpression: '0 * * * *', nextFireTime: '2026-10-05T10:00:00Z' } as any;
        const fresh = { uuid: 'j-1', cronExpression: '0 0 * * *', nextFireTime: '2026-10-06T00:00:00Z' } as any;
        const pre = { ...initialState, schedulerJobs: [stale], schedulerJob: stale };

        let next = reducer(pre, actions.updateSchedulerJobCron({ uuid: 'j-1', cronExpression: '0 0 * * *' }));
        expect(next.isUpdatingCron).toBe(true);

        next = reducer(next, actions.updateSchedulerJobCronSuccess({ uuid: 'j-1', schedulerJob: fresh }));
        expect(next.isUpdatingCron).toBe(false);
        expect(next.schedulerJob).toEqual(fresh);
        expect(next.schedulerJobs).toEqual([fresh]);

        next = reducer({ ...next, isUpdatingCron: true }, actions.updateSchedulerJobCronFailure({ error: 'err' }));
        expect(next.isUpdatingCron).toBe(false);
    });

    test('updateSchedulerJobCronSuccess does not change schedulerJob when uuid differs', () => {
        const other = { uuid: 'j-2', cronExpression: '0 * * * *' } as any;
        const next = reducer(
            { ...initialState, schedulerJob: other },
            actions.updateSchedulerJobCronSuccess({ uuid: 'j-1', schedulerJob: { uuid: 'j-1', cronExpression: '0 0 * * *' } as any }),
        );
        expect(next.schedulerJob).toEqual(other);
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
            listRefreshToken: 3,
        } as any;

        const state = { scheduler: featureState } as any;

        expect(selectors.schedulerJob(state)).toEqual({ uuid: 'j-1' });
        expect(selectors.schedulerJobs(state)).toHaveLength(2);
        expect(selectors.schedulerJobHistory(state)).toHaveLength(1);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isUpdatingCron(state)).toBe(true);
        expect(selectors.listRefreshToken(state)).toBe(3);
        expect(selectors.state(state)).toBe(featureState);
    });
});
