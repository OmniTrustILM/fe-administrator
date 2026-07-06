import { EMPTY, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import type { AppEpic } from 'ducks';

import { AjaxError } from 'rxjs/ajax';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { slice } from './app-redirect';

const fetchError: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.fetchError.match),
        switchMap((action) => {
            const { error, message } = action.payload;
            if (error instanceof AjaxError && error.status === 401) {
                return EMPTY;
            }
            return of(alertActions.error(error ? extractError(error, message) : message));
        }),
    );
};

export const epics = [fetchError];

export default epics;
