import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';

import epics from './scheduler-epics';
import { slice } from './scheduler';
import { actions as appRedirectActions } from './app-redirect';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

function makeState() {
    return {
        value: {
            scheduler: {
                schedulerJobs: [
                    { uuid: 'j-1', jobName: 'Job 1' },
                    { uuid: 'j-2', jobName: 'Job 2' },
                ],
            },
        },
    };
}

async function runBulkDeleteEpic(
    action: ReturnType<typeof slice.actions.bulkDeleteSchedulerJobs>,
    depsOverrides: any,
    takeCount: number,
    state = makeState(),
): Promise<any[]> {
    const deps = {
        apiClients: {
            scheduler: {
                deleteScheduledJob: () => of(undefined),
                ...depsOverrides,
            },
        },
    };

    return firstValueFrom((epics[4] as any)(of(action), state as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('scheduler epics', () => {
    test('bulkDeleteSchedulerJobs success emits bulkDeleteSchedulerJobsSuccess', async () => {
        const calls: string[] = [];
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1', 'j-2'] }),
            {
                deleteScheduledJob: ({ uuid }: { uuid: string }) => {
                    calls.push(uuid);
                    return of(undefined);
                },
            },
            1,
        );

        expect(calls).toEqual(['j-1', 'j-2']);
        expect(emitted).toEqual([slice.actions.bulkDeleteSchedulerJobsSuccess({ uuids: ['j-1', 'j-2'] })]);
    });

    test('bulkDeleteSchedulerJobs partial failure emits success, failure and fetchError', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1', 'j-2'] }),
            {
                deleteScheduledJob: ({ uuid }: { uuid: string }) =>
                    uuid === 'j-2' ? throwError(() => new Error('delete failed')) : of(undefined),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteSchedulerJobsSuccess({ uuids: ['j-1'] }),
            slice.actions.bulkDeleteSchedulerJobsFailure({ error: 'Failed to delete 1 scheduled job\nJob 2: delete failed' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 1 scheduled job\nJob 2: delete failed' });
    });

    test('bulkDeleteSchedulerJobs failure shows the reason Core returns', async () => {
        const reason = 'Unable to delete scheduled job while it is executing. Wait for the current run to finish.';
        const executing = new AjaxError('conflict', { status: 422, response: [reason] } as never, {} as never);
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1'] }),
            { deleteScheduledJob: () => throwError(() => executing) },
            3,
        );

        expect(emitted[2].payload).toEqual({ error: undefined, message: `Failed to delete 1 scheduled job\nJob 1: ${reason}` });
    });

    test('bulkDeleteSchedulerJobs names the job even after the list refresh has emptied the store', async () => {
        const state = makeState();
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1'] }),
            {
                deleteScheduledJob: () => {
                    state.value.scheduler.schedulerJobs = [];
                    return throwError(() => new Error('Unable to delete system job.'));
                },
            },
            3,
            state,
        );

        expect(emitted[2].payload).toEqual({
            error: undefined,
            message: 'Failed to delete 1 scheduled job\nJob 1: Unable to delete system job.',
        });
    });

    test('bulkDeleteSchedulerJobs multiple failures uses plural message', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1', 'j-2'] }),
            {
                deleteScheduledJob: () => throwError(() => new Error('delete failed')),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteSchedulerJobsSuccess({ uuids: [] }),
            slice.actions.bulkDeleteSchedulerJobsFailure({
                error: 'Failed to delete 2 scheduled jobs\nJob 1: delete failed\nJob 2: delete failed',
            }),
        ]);
        expect(emitted[2].payload).toEqual({
            error: undefined,
            message: 'Failed to delete 2 scheduled jobs\nJob 1: delete failed\nJob 2: delete failed',
        });
    });

    test('bulkDeleteSchedulerJobs sync throw emits bulkDeleteSchedulerJobsFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteSchedulerJobs({ uuids: ['j-1'] }),
            {
                deleteScheduledJob: () => {
                    throw err;
                },
            },
            2,
        );

        expect(emitted).toEqual([
            slice.actions.bulkDeleteSchedulerJobsFailure({ error: 'Failed to delete Scheduled Jobs. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Scheduled Jobs' }),
        ]);
    });
});
