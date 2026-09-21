import { firstValueFrom, type Observable, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, test } from 'vitest';
import cryptoAssetsDashboardEpics from './crypto-assets-dashboard-epics';
import { slice } from './crypto-assets-dashboard';

const [getCryptoAssetStatistics] = cryptoAssetsDashboardEpics;

const statistics = { totalAssets: 12418 };

type RunnableEpic = (action$: unknown, state$: unknown, deps: unknown) => Observable<unknown>;

const run = (action: unknown, deps: unknown, count: number): Promise<unknown[]> =>
    firstValueFrom((getCryptoAssetStatistics as unknown as RunnableEpic)(of(action), of({}), deps).pipe(take(count), toArray()));

const createDeps = (getCryptographicAssetStatistics: () => unknown) =>
    ({ apiClients: { statisticsDashboard: { getCryptographicAssetStatistics } } }) as never;

describe('crypto asset dashboard epics', () => {
    test('getStatistics reads the cross-CBOM statistics endpoint', async () => {
        const deps = createDeps(() => of(statistics));

        const emitted = await run(slice.actions.getStatistics(), deps, 1);

        expect(emitted).toEqual([slice.actions.getStatisticsSuccess({ statistics: statistics as never })]);
    });

    test('a failed read reports the failure and the platform error, leaving the page to keep what it had', async () => {
        const error = { status: 500 };
        const deps = createDeps(() => throwError(() => error));

        const emitted = await run(slice.actions.getStatistics(), deps, 2);

        expect(slice.actions.getStatisticsFailure.match(emitted[0] as never)).toBe(true);
        expect((emitted[1] as { type: string }).type).toBe('appRedirect/fetchError');
    });
});
