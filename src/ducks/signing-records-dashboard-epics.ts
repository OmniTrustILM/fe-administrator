import { isAnyOf } from '@reduxjs/toolkit';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';

import type { AppEpic } from 'ducks';

import { actions as appRedirectActions } from './app-redirect';
import { slice } from './signing-records-dashboard';

const getSigningRecordStatistics: AppEpic = (action$, _state, deps) => {
    return action$.pipe(
        filter(isAnyOf(slice.actions.getStatistics, slice.actions.setPeriod)),
        switchMap((action) =>
            deps.apiClients.statisticsDashboard.getSigningRecordStatistics({ period: action.payload.period }).pipe(
                map((statistics) => slice.actions.getStatisticsSuccess({ statistics })),
                catchError((error) =>
                    of(
                        slice.actions.getStatisticsFailure(),
                        appRedirectActions.fetchError({ error, message: 'Failed to get signing records dashboard data' }),
                    ),
                ),
            ),
        ),
    );
};

export const epics = [getSigningRecordStatistics];

export default epics;
