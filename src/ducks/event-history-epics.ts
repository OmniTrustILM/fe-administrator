import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, exhaustMap, filter, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';

import { slice } from './event-history';
import { transformSearchFieldListDtoToModel } from './transform/certificates';

const getPlatformSettingsEventHistory: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getPlatformSettingsEventHistory.match),
        switchMap((action) =>
            deps.apiClients.events
                .getPlatformSettingsEventHistory({
                    event: action.payload.event,
                    eventHistoryRequestDto: action.payload.request,
                })
                .pipe(
                    map((eventHistory) => slice.actions.getPlatformSettingsEventHistorySuccess({ eventHistory })),
                    catchError((err) =>
                        of(
                            slice.actions.getPlatformSettingsEventHistoryFailure({
                                error: extractError(err, 'Failed to get event history'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getObjectEventHistory: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getObjectEventHistory.match),
        switchMap((action) =>
            deps.apiClients.events
                .getObjectEventHistory({
                    resource: action.payload.resource,
                    uuid: action.payload.uuid,
                    itemsPerPage: action.payload.itemsPerPage,
                    pageNumber: action.payload.pageNumber,
                })
                .pipe(
                    map((objectEventHistory) => slice.actions.getObjectEventHistorySuccess({ objectEventHistory })),
                    catchError((err) =>
                        of(
                            slice.actions.getObjectEventHistoryFailure({
                                error: extractError(err, 'Failed to get object event history'),
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getConditionFilterFields: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getConditionFilterFields.match),
        groupBy((action) => action.payload.resource),
        mergeMap((perResource$) =>
            perResource$.pipe(
                exhaustMap((action) =>
                    deps.apiClients.resources.listResourceRuleFilterFields({ resource: action.payload.resource }).pipe(
                        map((filterFields) =>
                            slice.actions.getConditionFilterFieldsSuccess({
                                resource: action.payload.resource,
                                filterFields: filterFields.map(transformSearchFieldListDtoToModel),
                            }),
                        ),
                        catchError((err) =>
                            of(
                                slice.actions.getConditionFilterFieldsFailure({
                                    resource: action.payload.resource,
                                    error: extractError(err, 'Failed to get condition filter fields'),
                                }),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const epics = [getPlatformSettingsEventHistory, getObjectEventHistory, getConditionFilterFields];

export default epics;
