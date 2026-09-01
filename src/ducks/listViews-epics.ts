import type { AppEpic } from 'ducks';
import { type Observable, of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap } from 'rxjs/operators';
import type { UnknownAction } from 'redux';
import type { Resource } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { slice } from './listViews';

type FailureAction = (payload: { resource: Resource; error: string }) => UnknownAction;

/**
 * A failed mutation both rolls the strip back and says so.
 *
 * The message goes to an alert rather than to `appRedirectActions.fetchError`, which the sibling
 * ducks use for a read: the tab the user just created has already disappeared again, so the failure
 * has to be readable beside the strip that undid it rather than on a page they were sent to.
 */
function mutationFailed(action: FailureAction, resource: Resource, err: Error, fallback: string): Observable<UnknownAction> {
    const error = extractError(err, fallback);
    return of(action({ resource, error }), alertActions.error(error));
}

const listViews: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listViews.match),
        // switchMap: the strip reads one resource at a time, and a superseded read must not land
        // after the one that replaced it.
        switchMap((action) =>
            deps.apiClients.listViews.listViews({ resource: action.payload.resource }).pipe(
                map((views) => slice.actions.listViewsSuccess({ resource: action.payload.resource, views })),
                catchError((err) =>
                    of(
                        slice.actions.listViewsFailure({
                            resource: action.payload.resource,
                            error: extractError(err, 'Failed to get saved views'),
                        }),
                    ),
                ),
            ),
        ),
    );
};

const createView: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createView.match),
        // concatMap on every mutation: the strip holds a single rollback snapshot, so two writes in
        // flight at once would leave the second able to roll back over the first one's result.
        concatMap((action) =>
            deps.apiClients.listViews.createView({ listViewRequestDto: action.payload.view }).pipe(
                map((view) => slice.actions.createViewSuccess({ resource: action.payload.resource, view })),
                catchError((err) =>
                    mutationFailed(slice.actions.createViewFailure, action.payload.resource, err, 'Failed to create the view'),
                ),
            ),
        ),
    );
};

const updateView: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateView.match),
        concatMap((action) =>
            deps.apiClients.listViews.editView({ uuid: action.payload.uuid, listViewUpdateRequestDto: action.payload.view }).pipe(
                map((view) => slice.actions.updateViewSuccess({ resource: action.payload.resource, view })),
                catchError((err) =>
                    mutationFailed(slice.actions.updateViewFailure, action.payload.resource, err, 'Failed to save the view'),
                ),
            ),
        ),
    );
};

const deleteView: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteView.match),
        concatMap((action) =>
            deps.apiClients.listViews.deleteView({ uuid: action.payload.uuid }).pipe(
                map(() => slice.actions.deleteViewSuccess({ resource: action.payload.resource, uuid: action.payload.uuid })),
                catchError((err) =>
                    mutationFailed(slice.actions.deleteViewFailure, action.payload.resource, err, 'Failed to delete the view'),
                ),
            ),
        ),
    );
};

const epics = [listViews, createView, updateView, deleteView];

export default epics;
