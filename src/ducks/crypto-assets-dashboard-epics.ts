import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './crypto-assets-dashboard';

const getCryptoAssetStatistics: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getStatistics.match),
        switchMap(() =>
            deps.apiClients.statisticsDashboard.getCryptographicAssetStatistics().pipe(
                map((statistics) => slice.actions.getStatisticsSuccess({ statistics })),
                catchError((err) =>
                    of(
                        slice.actions.getStatisticsFailure({ error: extractError(err, 'Failed to get crypto asset statistics') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get crypto asset dashboard data' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [getCryptoAssetStatistics];

export default epics;
