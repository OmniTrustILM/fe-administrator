import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import * as slice from './inspections';

const inspectFile: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.inspectFile.match),
        switchMap((action) =>
            deps.apiClients.inspections.inspect({ inspectionRequestDto: action.payload.inspectionRequestDto }).pipe(
                map((inspection) => slice.actions.inspectFileSuccess({ inspection })),

                catchError((error) =>
                    of(
                        slice.actions.inspectFileFailure({
                            error: extractError(error, 'Failed to read the uploaded file'),
                            status: error instanceof AjaxError ? error.status : undefined,
                        }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [inspectFile];

export default epics;
