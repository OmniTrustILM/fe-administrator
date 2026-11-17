import type { AppEpic } from 'ducks';
import { from, iif, of } from 'rxjs';
import { catchError, filter, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { objectsKey, slice } from './resource';

const listResources: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listResources.match),
        switchMap(() =>
            deps.apiClients.resources.listResources().pipe(
                map((resources) => slice.actions.listResourcesSuccess({ resourcesList: resources })),
                catchError((err) => of(slice.actions.listResourcesFailure({ error: extractError(err, 'Failed to get resources list') }))),
            ),
        ),
    );
};

const listResourceEvents: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listResourceEvents.match),
        switchMap((action) =>
            deps.apiClients.resources.listResourceEvents({ resource: action.payload.resource }).pipe(
                switchMap((events) => of(slice.actions.listResourceEventsSuccess({ events }))),
                catchError((err) =>
                    of(slice.actions.listResourceEventsFailure({ error: extractError(err, 'Failed to get resource events') })),
                ),
            ),
        ),
    );
};

const listAllResourceEvents: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listAllResourceEvents.match),
        switchMap(() =>
            iif(
                () => state.value.resource.allResourceEvents.length === 0,
                deps.apiClients.resources.listAllResourceEvents().pipe(
                    switchMap((mappedEvents) => of(slice.actions.listAllResourceEventsSuccess({ mappedEvents }))),
                    catchError((err) =>
                        of(slice.actions.listAllResourceEventsFailure({ error: extractError(err, 'Failed to get resource events') })),
                    ),
                ),
                of(slice.actions.listAllResourceEventsSuccess({})),
            ),
        ),
    );
};

/** The most UUIDs `POST /v1/resources/{resource}/objects/allowed-actions` accepts in one request. */
const ALLOWED_ACTIONS_BATCH = 1000;

const inBatches = (uuids: string[]): string[][] =>
    Array.from({ length: Math.ceil(uuids.length / ALLOWED_ACTIONS_BATCH) }, (_, index) =>
        uuids.slice(index * ALLOWED_ACTIONS_BATCH, (index + 1) * ALLOWED_ACTIONS_BATCH),
    );

// Failure is not reported: without an object answer the profile's resource-level grants still decide the controls.
// A newer request for the same set of objects cancels the older one, so a late failure cannot overwrite a fresh answer.
const listObjectAllowedActions: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listObjectAllowedActions.match),
        groupBy(({ payload: { resource, uuids } }) => objectsKey(resource, uuids)),
        mergeMap((sameObjects$) =>
            sameObjects$.pipe(
                switchMap(({ payload: { resource, uuids } }) =>
                    from(inBatches(uuids)).pipe(
                        mergeMap((batch) =>
                            deps.apiClients.resources
                                .listObjectAllowedActions({ resource, objectAllowedActionsRequestDto: { uuids: batch } })
                                .pipe(
                                    map((response) => {
                                        const answered = new Map(
                                            response.items.map((item) => [item.uuid.toLowerCase(), item.allowedActions]),
                                        );
                                        return slice.actions.listObjectAllowedActionsSuccess({
                                            resource,
                                            answers: batch.map((uuid) => ({ uuid, allowedActions: answered.get(uuid.toLowerCase()) })),
                                        });
                                    }),
                                    catchError(() => of(slice.actions.listObjectAllowedActionsFailure({ resource, uuids: batch }))),
                                ),
                        ),
                    ),
                ),
            ),
        ),
    );
};

const epics = [listResources, listResourceEvents, listAllResourceEvents, listObjectAllowedActions];

export default epics;
