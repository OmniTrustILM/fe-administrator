import { describe, expect, test } from 'vitest';
import { of, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { SigningRecordStatisticsPeriod } from 'types/openapi';
import epics from './signing-records-dashboard-epics';
import { slice } from './signing-records-dashboard';

const [getSigningRecordStatistics] = epics;

function createDeps(getSigningRecordStatisticsImpl: (req: any) => any) {
    return { apiClients: { statisticsDashboard: { getSigningRecordStatistics: getSigningRecordStatisticsImpl } } } as any;
}

describe('signing-records-dashboard epics', () => {
    test('getStatistics success emits getStatisticsSuccess', async () => {
        const stats = { totalRetained: 7 };
        const deps = createDeps(() => of(stats));
        const action$ = of(slice.actions.getStatistics({ period: SigningRecordStatisticsPeriod._24h }));
        const emitted = await (getSigningRecordStatistics as any)(action$, of({}) as any, deps)
            .pipe(toArray())
            .toPromise();
        expect(emitted).toEqual([slice.actions.getStatisticsSuccess({ statistics: stats as any })]);
    });

    test('setPeriod success forwards the chosen period to the API and emits success', async () => {
        let calledWith: any;
        const deps = createDeps((req: any) => {
            calledWith = req;
            return of({ totalRetained: 1 });
        });
        const action$ = of(slice.actions.setPeriod({ period: SigningRecordStatisticsPeriod._90d }));
        await (getSigningRecordStatistics as any)(action$, of({}) as any, deps)
            .pipe(toArray())
            .toPromise();
        expect(calledWith).toEqual({ period: SigningRecordStatisticsPeriod._90d });
    });

    test('failure emits getStatisticsFailure then fetchError', async () => {
        const deps = createDeps(() => throwError(() => new Error('boom')));
        const action$ = of(slice.actions.getStatistics({ period: SigningRecordStatisticsPeriod._7d }));
        const emitted = await (getSigningRecordStatistics as any)(action$, of({}) as any, deps)
            .pipe(toArray())
            .toPromise();
        expect(emitted[0]).toEqual(slice.actions.getStatisticsFailure());
        expect(emitted[1].type).toContain('fetchError');
    });
});
