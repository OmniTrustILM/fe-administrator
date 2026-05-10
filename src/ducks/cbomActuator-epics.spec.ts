import { describe, expect, test } from 'vitest';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import cbomActuatorEpics from './cbomActuator-epics';
import { actions } from './cbomActuator';

const runHealthEpic = async (url: string | undefined) => {
    const epic = cbomActuatorEpics[0] as (...args: any[]) => Observable<unknown>;
    const output$ = epic(of(actions.health(url)), of({}), {});
    const results = await firstValueFrom(output$.pipe(take(1), toArray()));
    return results[0];
};

const withMockedFetch = async (fetchMock: typeof fetch, run: () => Promise<void>) => {
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = fetchMock;

    try {
        await run();
    } finally {
        (globalThis as any).fetch = originalFetch;
    }
};

describe('cbomActuator epics', () => {
    test('returns healthFailure when cbom url is missing', async () => {
        const emitted = await runHealthEpic(undefined);
        expect(emitted).toEqual(actions.healthFailure({ error: 'CBOM URL not provided.' }));
    });

    test('uses /v1/health when url ends with /api', async () => {
        await withMockedFetch(
            (async (url: string) => {
                expect(url).toBe('https://cbom-repo.otilm.com/api/v1/health');
                return {
                    status: 200,
                    json: async () => ({ status: 'UP' }),
                } as any;
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com/api/');
                expect(emitted).toEqual(actions.healthSuccess({ status: 'UP' }));
            },
        );
    });

    test('uses /v1/health when url does not end with /api', async () => {
        await withMockedFetch(
            (async (url: string) => {
                expect(url).toBe('https://cbom-repo.otilm.com/api/v1/health');
                return {
                    status: 200,
                    json: async () => ({ status: 'UP' }),
                } as any;
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com');
                expect(emitted).toEqual(actions.healthSuccess({ status: 'UP' }));
            },
        );
    });

    test('trims multiple trailing slashes before appending /v1/health', async () => {
        await withMockedFetch(
            (async (url: string) => {
                expect(url).toBe('https://cbom-repo.otilm.com/api/v1/health');
                return {
                    status: 200,
                    json: async () => ({ status: 'UP' }),
                } as any;
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com/api////');
                expect(emitted).toEqual(actions.healthSuccess({ status: 'UP' }));
            },
        );
    });

    test('returns healthFailure when response is not UP', async () => {
        await withMockedFetch(
            (async () => {
                return {
                    status: 200,
                    json: async () => ({ status: 'DOWN' }),
                } as any;
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com');
                expect(emitted).toEqual(actions.healthFailure({ error: 'Failed to get CBOM health status.' }));
            },
        );
    });

    test('returns healthFailure when fetch throws', async () => {
        await withMockedFetch(
            (async () => {
                throw new Error('network down');
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com');
                expect(emitted).toEqual(actions.healthFailure({ error: 'Failed to get CBOM health.. network down' }));
            },
        );
    });

    test('returns healthFailure when fetch throws synchronously', async () => {
        await withMockedFetch(
            ((_: string) => {
                throw new Error('sync crash');
            }) as any,
            async () => {
                const emitted = await runHealthEpic('https://cbom-repo.otilm.com');
                expect(emitted).toEqual(actions.healthFailure({ error: 'Failed to get CBOM health.. sync crash' }));
            },
        );
    });
});
