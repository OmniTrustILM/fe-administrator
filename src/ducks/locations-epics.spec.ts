import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import epics from './locations-epics';
import { slice } from './locations';
import { actions as appRedirectActions } from './app-redirect';

vi.mock('../App', () => ({
    store: {
        dispatch: vi.fn(),
        getState: vi.fn(() => ({})),
    },
}));

async function runBulkDeleteEpic(
    action: ReturnType<typeof slice.actions.bulkDeleteLocations>,
    depsOverrides: any,
    takeCount: number,
): Promise<any[]> {
    const deps = {
        apiClients: {
            locations: {
                deleteLocation: () => of(undefined),
                ...depsOverrides,
            },
        },
    };

    return firstValueFrom((epics[5] as any)(of(action), of({}) as any, deps as any).pipe(take(takeCount), toArray())) as Promise<any[]>;
}

describe('locations epics', () => {
    test('bulkDeleteLocations success emits bulkDeleteLocationsSuccess', async () => {
        const calls: string[] = [];
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteLocations({
                locations: [
                    { entityUuid: 'entity-1', uuid: 'l-1' },
                    { entityUuid: 'entity-2', uuid: 'l-2' },
                ],
            }),
            {
                deleteLocation: ({ locationUuid }: { locationUuid: string }) => {
                    calls.push(locationUuid);
                    return of(undefined);
                },
            },
            1,
        );

        expect(calls).toEqual(['l-1', 'l-2']);
        expect(emitted).toEqual([slice.actions.bulkDeleteLocationsSuccess({ uuids: ['l-1', 'l-2'] })]);
    });

    test('bulkDeleteLocations partial failure emits success, failure and fetchError', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteLocations({
                locations: [
                    { entityUuid: 'entity-1', uuid: 'l-1' },
                    { entityUuid: 'entity-2', uuid: 'l-2' },
                ],
            }),
            {
                deleteLocation: ({ locationUuid }: { locationUuid: string }) =>
                    locationUuid === 'l-2' ? throwError(() => new Error('delete failed')) : of(undefined),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteLocationsSuccess({ uuids: ['l-1'] }),
            slice.actions.bulkDeleteLocationsFailure({ error: 'Failed to delete 1 location' }),
        ]);
        expect(emitted[2].type).toBe(appRedirectActions.fetchError.type);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 1 location' });
    });

    test('bulkDeleteLocations multiple failures uses plural message', async () => {
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteLocations({
                locations: [
                    { entityUuid: 'entity-1', uuid: 'l-1' },
                    { entityUuid: 'entity-2', uuid: 'l-2' },
                ],
            }),
            {
                deleteLocation: () => throwError(() => new Error('delete failed')),
            },
            3,
        );

        expect(emitted.slice(0, 2)).toEqual([
            slice.actions.bulkDeleteLocationsSuccess({ uuids: [] }),
            slice.actions.bulkDeleteLocationsFailure({ error: 'Failed to delete 2 locations' }),
        ]);
        expect(emitted[2].payload).toEqual({ error: undefined, message: 'Failed to delete 2 locations' });
    });

    test('bulkDeleteLocations sync throw emits bulkDeleteLocationsFailure and fetchError', async () => {
        const err = new Error('sync fail');
        const emitted = await runBulkDeleteEpic(
            slice.actions.bulkDeleteLocations({
                locations: [{ entityUuid: 'entity-1', uuid: 'l-1' }],
            }),
            {
                deleteLocation: () => {
                    throw err;
                },
            },
            2,
        );

        expect(emitted).toEqual([
            slice.actions.bulkDeleteLocationsFailure({ error: 'Failed to delete Locations. sync fail' }),
            appRedirectActions.fetchError({ error: err, message: 'Failed to delete Locations' }),
        ]);
    });
});
