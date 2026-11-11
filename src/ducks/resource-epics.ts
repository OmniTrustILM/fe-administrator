import type { AppEpic } from 'ducks';
import { iif, of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { extractError } from 'utils/net';
import { slice } from './resource';

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

// Failure is not reported: without an object answer the profile's resource-level grants still decide the controls.
const listObjectAllowedActions: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listObjectAllowedActions.match),
        mergeMap(({ payload: { resource, uuid } }) =>
            deps.apiClients.resources.listObjectAllowedActions({ resource, objectAllowedActionsRequestDto: { uuids: [uuid] } }).pipe(
                map((response) =>
                    slice.actions.listObjectAllowedActionsSuccess({
                        resource,
                        uuid,
                        allowedActions: response.items.find((item) => item.uuid === uuid)?.allowedActions,
                    }),
                ),
                catchError(() => of(slice.actions.listObjectAllowedActionsFailure({ resource, uuid }))),
            ),
        ),
    );
};

const epics = [listResources, listResourceEvents, listAllResourceEvents, listObjectAllowedActions];

export default epics;
