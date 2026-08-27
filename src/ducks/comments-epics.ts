import type { AppEpic, AppState, EpicDependencies } from 'ducks';
import type { UnknownAction } from 'redux';
import { type Observable, of } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { catchError, filter, map, mergeMap } from 'rxjs/operators';
import type { Resource } from 'types/openapi';
import { LockTypeEnum, type WidgetLockErrorModel } from 'types/user-interface';
import { extractError, getLockWidgetObject } from 'utils/net';
import { actions as alertActions } from './alerts';
import { type CommentRefPayload, panelKey, REPLIES_PAGE_SIZE, slice, THREADS_PAGE_SIZE } from './comments';

const status = (err: unknown) => (err instanceof AjaxError ? err.status : undefined);

/** 422 is a message about the request, not a denied-access state, so it never reaches the widget lock. */
const isValidationError = (err: unknown) => status(err) === 422;
const isDenied = (err: unknown) => status(err) === 403;

const networkLock: WidgetLockErrorModel = {
    lockTitle: 'Comments unavailable',
    lockText: 'Comments could not be loaded',
    lockType: LockTypeEnum.NETWORK,
};

const toLock = (err: unknown): WidgetLockErrorModel => (err instanceof AjaxError ? getLockWidgetObject(err) : networkLock);

const deniedMessage = (err: unknown, fallback: string) =>
    err instanceof AjaxError && typeof err.response?.message === 'string' ? err.response.message : fallback;

/** Re-reads the page the panel is on, stepping back a page when the last item on it was just removed. */
const refreshThreads = (state: AppState, resource: Resource, objectUuid: string, removed = false): UnknownAction => {
    const threads = state.comments?.threads[panelKey(resource, objectUuid)];
    const pageNumber = threads?.pageNumber ?? 1;
    const steppedBack = removed && threads?.comments.length === 1 && pageNumber > 1 ? pageNumber - 1 : pageNumber;
    return slice.actions.listThreads({ resource, objectUuid, pageNumber: steppedBack, itemsPerPage: threads?.itemsPerPage });
};

const refreshReplies = (state: AppState, rootUuid: string, removed = false): UnknownAction => {
    const replies = state.comments?.replies[rootUuid];
    const pageNumber = replies?.pageNumber ?? 1;
    const steppedBack = removed && replies?.comments.length === 1 && pageNumber > 1 ? pageNumber - 1 : pageNumber;
    return slice.actions.listReplies({ rootUuid, pageNumber: steppedBack, itemsPerPage: replies?.itemsPerPage });
};

/** Everything that changed: the thread of a reply (if any) and always the root list, whose replyCount moved too. */
const refreshAfterChange = (
    state: AppState,
    resource: Resource,
    objectUuid: string,
    parentUuid?: string,
    removed = false,
): UnknownAction[] => [
    ...(parentUuid ? [refreshReplies(state, parentUuid, removed)] : []),
    refreshThreads(state, resource, objectUuid, removed && !parentUuid),
];

const listThreads: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listThreads.match),
        // mergeMap rather than switchMap: two panels may list concurrently and neither may cancel the other.
        mergeMap((action) => {
            const { resource, objectUuid, pageNumber, itemsPerPage = THREADS_PAGE_SIZE } = action.payload;
            const key = panelKey(resource, objectUuid);
            return deps.apiClients.comments.listComments({ resource, objectUuid, pageNumber, itemsPerPage }).pipe(
                map((page) => slice.actions.listThreadsSuccess({ key, page })),
                catchError((err) =>
                    isValidationError(err)
                        ? of(slice.actions.listThreadsFailure({ key }), alertActions.error(extractError(err, 'Failed to list comments')))
                        : of(slice.actions.listThreadsFailure({ key, lock: toLock(err) })),
                ),
            );
        }),
    );
};

const listReplies: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listReplies.match),
        mergeMap((action) => {
            const { rootUuid, pageNumber, itemsPerPage = REPLIES_PAGE_SIZE } = action.payload;
            return deps.apiClients.comments.listReplies({ uuid: rootUuid, pageNumber, itemsPerPage }).pipe(
                map((page) => slice.actions.listRepliesSuccess({ rootUuid, page })),
                catchError((err) =>
                    of(slice.actions.listRepliesFailure({ rootUuid }), alertActions.error(extractError(err, 'Failed to list replies'))),
                ),
            );
        }),
    );
};

const createComment: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createComment.match),
        mergeMap((action) => {
            const { resource, objectUuid, body, parentUuid } = action.payload;
            const key = panelKey(resource, objectUuid);
            return deps.apiClients.comments.createComment({ resource, objectUuid, commentCreateRequestDto: { body, parentUuid } }).pipe(
                mergeMap((comment) =>
                    of(
                        slice.actions.createCommentSuccess({ key, comment, parentUuid }),
                        parentUuid ? refreshReplies(state$.value, parentUuid) : refreshThreads(state$.value, resource, objectUuid),
                    ),
                ),
                catchError((err) =>
                    isDenied(err)
                        ? of(
                              slice.actions.createCommentFailure({
                                  key,
                                  parentUuid,
                                  denied: deniedMessage(err, 'You are not allowed to comment on this object'),
                              }),
                          )
                        : of(
                              slice.actions.createCommentFailure({ key, parentUuid }),
                              alertActions.error(extractError(err, 'Failed to post comment')),
                          ),
                ),
            );
        }),
    );
};

type ResolutionAction = { type: string; payload: CommentRefPayload };

/** Resolve and reopen differ only in the endpoint they call; both re-read the thread list to pick up resolvedBy/At. */
const resolution =
    (
        matcher: (action: UnknownAction) => action is ResolutionAction,
        request: (deps: EpicDependencies, uuid: string) => Observable<void>,
        success: (payload: { uuid: string }) => UnknownAction,
        failure: (payload: { uuid: string }) => UnknownAction,
        headline: string,
    ): AppEpic =>
    (action$, state$, deps) =>
        action$.pipe(
            filter(matcher),
            mergeMap((action) => {
                const { uuid, resource, objectUuid } = action.payload;
                return request(deps, uuid).pipe(
                    mergeMap(() => of(success({ uuid }), refreshThreads(state$.value, resource, objectUuid))),
                    catchError((err) => of(failure({ uuid }), alertActions.error(extractError(err, headline)))),
                );
            }),
        );

const resolveComment = resolution(
    slice.actions.resolveComment.match,
    (deps, uuid) => deps.apiClients.comments.resolveComment({ uuid }),
    slice.actions.resolveCommentSuccess,
    slice.actions.resolveCommentFailure,
    'Failed to resolve thread',
);

const unresolveComment = resolution(
    slice.actions.unresolveComment.match,
    (deps, uuid) => deps.apiClients.comments.unresolveComment({ uuid }),
    slice.actions.unresolveCommentSuccess,
    slice.actions.unresolveCommentFailure,
    'Failed to reopen thread',
);

const deleteComment: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteComment.match),
        mergeMap((action) => {
            const { uuid, parentUuid, resource, objectUuid } = action.payload;
            return deps.apiClients.comments.deleteComment({ uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteCommentSuccess({ uuid, parentUuid }),
                        ...refreshAfterChange(state$.value, resource, objectUuid, parentUuid, true),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteCommentFailure({ uuid }),
                        alertActions.error(extractError(err, 'Failed to delete comment')),
                        // A 422 here means the thread changed under the user (typically it gained a reply while the
                        // page was open), so the stale view is re-read and the reply that caused it becomes visible.
                        ...(isValidationError(err) ? refreshAfterChange(state$.value, resource, objectUuid, parentUuid) : []),
                    ),
                ),
            );
        }),
    );
};

const epics = [listThreads, listReplies, createComment, resolveComment, unresolveComment, deleteComment];

export default epics;
