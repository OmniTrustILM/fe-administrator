import { describe, expect, test } from 'vitest';
import { lastValueFrom, type Observable, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { toArray } from 'rxjs/operators';
import { type CommentDto, type CommentResponseDto, Resource } from 'types/openapi';
import { LockTypeEnum } from 'types/user-interface';
import { actions as alertActions } from './alerts';
import { initialState, panelKey, REPLIES_PAGE_SIZE, slice, type State, THREADS_PAGE_SIZE } from './comments';
import epics from './comments-epics';

const resource = Resource.Certificates;
const objectUuid = 'obj-1';
const key = panelKey(resource, objectUuid);

const [LIST_THREADS, LIST_REPLIES, CREATE, RESOLVE, UNRESOLVE, DELETE] = [0, 1, 2, 3, 4, 5];

/** Same shape the sibling epic specs use: an `AjaxError` cannot be constructed without a real XHR. */
const ajaxError = (status: number, response?: unknown): AjaxError => {
    const err = Object.assign(new Error(`HTTP ${status}`), { name: 'AjaxError', status, response });
    Object.setPrototypeOf(err, AjaxError.prototype);
    return err as unknown as AjaxError;
};

const comment = (uuid: string): CommentDto => ({
    uuid,
    resource,
    objectUuid,
    author: { uuid: 'u', name: 'alice' },
    createdAt: '2026-08-27T10:00:00Z',
    body: 'b',
});

const page = (comments: CommentDto[], overrides: Partial<CommentResponseDto> = {}): CommentResponseDto => ({
    comments,
    totalItems: comments.length,
    totalPages: 1,
    pageNumber: 1,
    itemsPerPage: THREADS_PAGE_SIZE,
    ...overrides,
});

type Stubs = {
    listComments: (args: unknown) => Observable<unknown>;
    listReplies: (args: unknown) => Observable<unknown>;
    createComment: (args: unknown) => Observable<unknown>;
    resolveComment: (args: unknown) => Observable<unknown>;
    unresolveComment: (args: unknown) => Observable<unknown>;
    deleteComment: (args: unknown) => Observable<unknown>;
};

const createDeps = (overrides: Partial<Stubs> = {}) => {
    const calls: Array<{ name: keyof Stubs; args: unknown }> = [];
    const stub =
        (name: keyof Stubs, result: () => Observable<unknown>) =>
        (args: unknown): Observable<unknown> => {
            calls.push({ name, args });
            return (overrides[name] ?? result)(args);
        };
    return {
        calls,
        deps: {
            apiClients: {
                comments: {
                    listComments: stub('listComments', () => of(page([]))),
                    listReplies: stub('listReplies', () => of(page([], { itemsPerPage: REPLIES_PAGE_SIZE }))),
                    createComment: stub('createComment', () => of(comment('new'))),
                    resolveComment: stub('resolveComment', () => of(undefined)),
                    unresolveComment: stub('unresolveComment', () => of(undefined)),
                    deleteComment: stub('deleteComment', () => of(undefined)),
                },
            },
        },
    };
};

type Epic = (action$: unknown, state$: unknown, deps: unknown) => Observable<{ type: string; payload?: unknown }>;

const stateWith = (comments: Partial<State>) => ({ value: { comments: { ...initialState, ...comments } } });

const run = (index: number, action: unknown, deps: unknown, state: unknown = stateWith({})) =>
    lastValueFrom((epics[index] as unknown as Epic)(of(action), state, deps).pipe(toArray()));

describe('listThreads epic', () => {
    test('lists the page and applies the default page size', async () => {
        const result = page([comment('r1')]);
        const { deps, calls } = createDeps({ listComments: () => of(result) });

        const emitted = await run(LIST_THREADS, slice.actions.listThreads({ resource, objectUuid, pageNumber: 2 }), deps);

        expect(calls[0].args).toEqual({ resource, objectUuid, pageNumber: 2, itemsPerPage: THREADS_PAGE_SIZE });
        expect(emitted).toEqual([slice.actions.listThreadsSuccess({ key, page: result })]);
    });

    test('403 locks the panel with a permission lock', async () => {
        const { deps } = createDeps({ listComments: () => throwError(() => ajaxError(403, { code: 'ACCESS_DENIED', message: 'Denied' })) });

        const emitted = await run(LIST_THREADS, slice.actions.listThreads({ resource, objectUuid, pageNumber: 1 }), deps);

        expect(emitted).toHaveLength(1);
        expect(emitted[0]).toMatchObject({
            type: slice.actions.listThreadsFailure.type,
            payload: { key, lock: { lockType: LockTypeEnum.PERMISSION, lockText: 'Denied' } },
        });
    });

    test('404 locks the panel, so an object that is not there reads like the sibling widgets', async () => {
        const { deps } = createDeps({ listComments: () => throwError(() => ajaxError(404)) });

        const emitted = await run(LIST_THREADS, slice.actions.listThreads({ resource, objectUuid, pageNumber: 1 }), deps);

        expect(emitted[0]).toMatchObject({ payload: { key, lock: { lockTitle: 'Not Found' } } });
    });

    test('422 is a message, not a lock', async () => {
        const { deps } = createDeps({ listComments: () => throwError(() => ajaxError(422, { message: 'page out of range' })) });

        const emitted = await run(LIST_THREADS, slice.actions.listThreads({ resource, objectUuid, pageNumber: 99 }), deps);

        expect(emitted[0]).toEqual(slice.actions.listThreadsFailure({ key }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type, payload: expect.stringContaining('page out of range') });
    });

    test('a network failure locks the panel with a network lock', async () => {
        const { deps } = createDeps({ listComments: () => throwError(() => new Error('offline')) });

        const emitted = await run(LIST_THREADS, slice.actions.listThreads({ resource, objectUuid, pageNumber: 1 }), deps);

        expect(emitted[0]).toMatchObject({ payload: { key, lock: { lockType: LockTypeEnum.NETWORK } } });
    });
});

describe('listReplies epic', () => {
    test('lists replies of the root', async () => {
        const result = page([comment('c1')]);
        const { deps, calls } = createDeps({ listReplies: () => of(result) });

        const emitted = await run(LIST_REPLIES, slice.actions.listReplies({ rootUuid: 'r1', pageNumber: 1 }), deps);

        expect(calls[0].args).toEqual({ uuid: 'r1', pageNumber: 1, itemsPerPage: REPLIES_PAGE_SIZE });
        expect(emitted).toEqual([slice.actions.listRepliesSuccess({ rootUuid: 'r1', page: result })]);
    });

    test('failure reports through an alert, never a lock', async () => {
        const { deps } = createDeps({ listReplies: () => throwError(() => ajaxError(422, { message: 'not a thread root' })) });

        const emitted = await run(LIST_REPLIES, slice.actions.listReplies({ rootUuid: 'c1', pageNumber: 1 }), deps);

        expect(emitted[0]).toEqual(slice.actions.listRepliesFailure({ rootUuid: 'c1' }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type, payload: expect.stringContaining('not a thread root') });
    });
});

describe('createComment epic', () => {
    test('a root post re-reads everything loaded plus the new root, as a single first page', async () => {
        const { deps, calls } = createDeps();
        const state = stateWith({
            threads: { [key]: { ...page([comment('r1')], { pageNumber: 3, itemsPerPage: 5 }), isFetching: false, isPosting: true } },
        });

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: 'hello' }), deps, state);

        expect(calls[0].args).toEqual({ resource, objectUuid, commentCreateRequestDto: { body: 'hello', parentUuid: undefined } });
        expect(emitted).toEqual([
            slice.actions.createCommentSuccess({ key, comment: comment('new'), parentUuid: undefined }),
            slice.actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: 16 }),
        ]);
    });

    test('a reply re-reads everything loaded in its thread plus the new one, as a single first page', async () => {
        const { deps, calls } = createDeps();
        const state = stateWith({
            replies: { r1: { ...page([comment('c1')], { pageNumber: 2, itemsPerPage: 20 }), isFetching: false, isPosting: true } },
        });

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: 'hi', parentUuid: 'r1' }), deps, state);

        expect(calls[0].args).toMatchObject({ commentCreateRequestDto: { body: 'hi', parentUuid: 'r1' } });
        expect(emitted[1]).toEqual(slice.actions.listReplies({ rootUuid: 'r1', pageNumber: 1, itemsPerPage: 41 }));
    });

    test('a reply to a thread that was never expanded reads the first page', async () => {
        const { deps } = createDeps();

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: 'hi', parentUuid: 'r1' }), deps);

        expect(emitted[1]).toEqual(slice.actions.listReplies({ rootUuid: 'r1', pageNumber: 1, itemsPerPage: REPLIES_PAGE_SIZE }));
    });

    test('403 disables the compose box with the API message and raises no alert', async () => {
        const { deps } = createDeps({ createComment: () => throwError(() => ajaxError(403, { message: 'No comment permission' })) });

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: 'x' }), deps);

        expect(emitted).toEqual([slice.actions.createCommentFailure({ key, parentUuid: undefined, denied: 'No comment permission' })]);
    });

    test('403 without a message falls back to a generic denial', async () => {
        const { deps } = createDeps({ createComment: () => throwError(() => ajaxError(403)) });

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: 'x', parentUuid: 'r1' }), deps);

        expect(emitted[0]).toMatchObject({ payload: { key, parentUuid: 'r1', denied: expect.stringContaining('not allowed') } });
    });

    test('422 keeps the compose box and shows the validation message', async () => {
        const { deps } = createDeps({ createComment: () => throwError(() => ajaxError(422, { message: 'body must not be blank' })) });

        const emitted = await run(CREATE, slice.actions.createComment({ resource, objectUuid, body: ' ' }), deps);

        expect(emitted[0]).toEqual(slice.actions.createCommentFailure({ key, parentUuid: undefined }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type, payload: expect.stringContaining('body must not be blank') });
    });
});

describe('resolve and unresolve epics', () => {
    test.each([
        ['resolve', RESOLVE, 'resolveComment', slice.actions.resolveComment, slice.actions.resolveCommentSuccess],
        ['unresolve', UNRESOLVE, 'unresolveComment', slice.actions.unresolveComment, slice.actions.unresolveCommentSuccess],
    ] as const)('%s calls the endpoint and re-reads the thread list', async (_, index, stubName, start, success) => {
        const { deps, calls } = createDeps();

        const emitted = await run(index, start({ uuid: 'r1', resource, objectUuid }), deps);

        expect(calls[0]).toEqual({ name: stubName, args: { uuid: 'r1' } });
        expect(emitted).toEqual([
            success({ uuid: 'r1' }),
            slice.actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: THREADS_PAGE_SIZE }),
        ]);
    });

    test('a 422 on resolving a reply is reported as a message', async () => {
        const { deps } = createDeps({ resolveComment: () => throwError(() => ajaxError(422, { message: 'not a thread root' })) });

        const emitted = await run(RESOLVE, slice.actions.resolveComment({ uuid: 'c1', resource, objectUuid }), deps);

        expect(emitted[0]).toEqual(slice.actions.resolveCommentFailure({ uuid: 'c1' }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type, payload: expect.stringContaining('not a thread root') });
    });

    test('a 403 on reopening is reported as a message', async () => {
        const { deps } = createDeps({ unresolveComment: () => throwError(() => ajaxError(403, { message: 'denied' })) });

        const emitted = await run(UNRESOLVE, slice.actions.unresolveComment({ uuid: 'r1', resource, objectUuid }), deps);

        expect(emitted[0]).toEqual(slice.actions.unresolveCommentFailure({ uuid: 'r1' }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type });
    });
});

describe('deleteComment epic', () => {
    test('deleting a root re-reads the thread list', async () => {
        const { deps, calls } = createDeps();

        const emitted = await run(DELETE, slice.actions.deleteComment({ uuid: 'r1', resource, objectUuid }), deps);

        expect(calls[0]).toEqual({ name: 'deleteComment', args: { uuid: 'r1' } });
        expect(emitted).toEqual([
            slice.actions.deleteCommentSuccess({ uuid: 'r1', parentUuid: undefined }),
            slice.actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: THREADS_PAGE_SIZE }),
        ]);
    });

    test('deleting a root re-reads the whole loaded window from the first page', async () => {
        const { deps } = createDeps();
        const state = stateWith({
            threads: { [key]: { ...page([comment('r1')], { pageNumber: 2 }), isFetching: false, isPosting: false } },
        });

        const emitted = await run(DELETE, slice.actions.deleteComment({ uuid: 'r1', resource, objectUuid }), deps, state);

        expect(emitted[1]).toMatchObject({ payload: { pageNumber: 1, itemsPerPage: 20 } });
    });

    test('deleting a reply re-reads its thread and the root list', async () => {
        const { deps } = createDeps();
        const state = stateWith({
            replies: { r1: { ...page([comment('c1')], { pageNumber: 2, itemsPerPage: 20 }), isFetching: false, isPosting: false } },
        });

        const emitted = await run(DELETE, slice.actions.deleteComment({ uuid: 'c1', parentUuid: 'r1', resource, objectUuid }), deps, state);

        expect(emitted).toEqual([
            slice.actions.deleteCommentSuccess({ uuid: 'c1', parentUuid: 'r1' }),
            slice.actions.listReplies({ rootUuid: 'r1', pageNumber: 1, itemsPerPage: 40 }),
            slice.actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: THREADS_PAGE_SIZE }),
        ]);
    });

    test('a 422 on delete shows the server text and re-reads the thread that changed', async () => {
        const message = "The thread gained replies; only the host object's owner or an update holder may delete it";
        const { deps } = createDeps({ deleteComment: () => throwError(() => ajaxError(422, { message })) });

        const emitted = await run(DELETE, slice.actions.deleteComment({ uuid: 'r1', resource, objectUuid }), deps);

        expect(emitted).toEqual([
            slice.actions.deleteCommentFailure({ uuid: 'r1' }),
            alertActions.error(`Failed to delete comment (422): ${message}`),
            slice.actions.listThreads({ resource, objectUuid, pageNumber: 1, itemsPerPage: THREADS_PAGE_SIZE }),
        ]);
    });

    test('a failed delete is reported as a message', async () => {
        const { deps } = createDeps({ deleteComment: () => throwError(() => ajaxError(403, { message: 'denied' })) });

        const emitted = await run(DELETE, slice.actions.deleteComment({ uuid: 'r1', resource, objectUuid }), deps);

        expect(emitted[0]).toEqual(slice.actions.deleteCommentFailure({ uuid: 'r1' }));
        expect(emitted[1]).toMatchObject({ type: alertActions.error.type, payload: expect.stringContaining('denied') });
    });
});
