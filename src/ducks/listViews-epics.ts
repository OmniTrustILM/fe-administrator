import type { AppEpic } from 'ducks';
import { type Observable, of } from 'rxjs';
import { catchError, concatMap, filter, groupBy, map, mergeMap, switchMap } from 'rxjs/operators';
import type { UnknownAction } from 'redux';
import type { Resource } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { slice } from './listViews';

type Dependencies = Parameters<AppEpic>[2];

type FailureAction = (payload: { resource: Resource; error: string }) => UnknownAction;

/**
 * A failed request both settles the strip and says so.
 *
 * The message goes to an alert rather than to `appRedirectActions.fetchError`, which the sibling
 * ducks use for a read: the strip is one widget on a page that lists rows of its own, so sending the
 * whole page to an error screen because its saved views could not be read is out of proportion — and
 * for a mutation, the tab the user just created has already disappeared again, so the failure has to
 * be readable beside the strip that undid it rather than on a page they were sent to.
 */
function requestFailed(action: FailureAction, resource: Resource, err: Error, fallback: string): Observable<UnknownAction> {
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
                    // Without the alert a failed read is indistinguishable from a user who has saved
                    // nothing: the strip settles on Standard alone and offers to create beside it.
                    requestFailed(slice.actions.listViewsFailure, action.payload.resource, err, 'Failed to get saved views'),
                ),
            ),
        ),
    );
};

type MutationAction =
    | ReturnType<typeof slice.actions.createView>
    | ReturnType<typeof slice.actions.updateView>
    | ReturnType<typeof slice.actions.deleteView>;

function isMutation(action: UnknownAction): action is MutationAction {
    return slice.actions.createView.match(action) || slice.actions.updateView.match(action) || slice.actions.deleteView.match(action);
}

function runMutation(action: MutationAction, deps: Dependencies): Observable<UnknownAction> {
    const { resource } = action.payload;

    if (slice.actions.createView.match(action)) {
        return deps.apiClients.listViews.createView({ listViewRequestDto: action.payload.view }).pipe(
            map((view) => slice.actions.createViewSuccess({ resource, view })),
            catchError((err) => requestFailed(slice.actions.createViewFailure, resource, err, 'Failed to create the view')),
        );
    }

    if (slice.actions.updateView.match(action)) {
        return deps.apiClients.listViews.editView({ uuid: action.payload.uuid, listViewUpdateRequestDto: action.payload.view }).pipe(
            map((view) => slice.actions.updateViewSuccess({ resource, view })),
            catchError((err) => requestFailed(slice.actions.updateViewFailure, resource, err, 'Failed to save the view')),
        );
    }

    const { uuid } = action.payload;
    return deps.apiClients.listViews.deleteView({ uuid }).pipe(
        map(() => slice.actions.deleteViewSuccess({ resource, uuid })),
        catchError((err) => requestFailed(slice.actions.deleteViewFailure, resource, err, 'Failed to delete the view')),
    );
}

/**
 * Every create, edit and delete of one resource, run one at a time.
 *
 * They share a pipeline rather than owning one each because the rollback snapshot and the
 * `isMutating` flag are single per resource: two writes in flight together — of any kinds, not only
 * two of the same kind — would let the second snapshot the first one's optimistic state and then
 * restore or clear it. `groupBy` keeps the serialisation per resource, which is the granularity the
 * state is keyed at, so one resource's slow write does not hold up another's.
 */
const mutateViews: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(isMutation),
        groupBy((action) => action.payload.resource),
        mergeMap((perResource) => perResource.pipe(concatMap((action) => runMutation(action, deps)))),
    );
};

const epics = [listViews, mutateViews];

export default epics;
