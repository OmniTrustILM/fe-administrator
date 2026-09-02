import { describe, expect, test } from 'vitest';
import { type CommentDto, type CommentResponseDto, Resource } from 'types/openapi';
import { LockTypeEnum } from 'types/user-interface';
import reducer, { actions, initialState, panelKey, REPLIES_PAGE_SIZE, selectors, type State, THREADS_PAGE_SIZE } from './comments';

const resource = Resource.Certificates;
const objectUuid = 'obj-1';
const key = panelKey(resource, objectUuid);

const comment = (uuid: string, overrides: Partial<CommentDto> = {}): CommentDto => ({
    uuid,
    resource,
    objectUuid,
    author: { uuid: 'user-1', name: 'alice' },
    createdAt: '2026-08-27T10:00:00Z',
    body: `body of ${uuid}`,
    ...overrides,
});

const page = (comments: CommentDto[], overrides: Partial<CommentResponseDto> = {}): CommentResponseDto => ({
    comments,
    totalItems: comments.length,
    totalPages: 1,
    pageNumber: 1,
    itemsPerPage: THREADS_PAGE_SIZE,
    ...overrides,
});

const lock = { lockTitle: 'Access Denied', lockText: 'no', lockType: LockTypeEnum.PERMISSION };

const withThreads = (comments: CommentDto[]): State =>
    reducer(
        reducer(initialState, actions.listThreads({ resource, objectUuid, pageNumber: 1 })),
        actions.listThreadsSuccess({ key, page: page(comments) }),
    );

describe('comments slice: panel key', () => {
    test('is the resource and object pair', () => {
        expect(panelKey(Resource.Discoveries, 'x')).toBe('discoveries/x');
    });
});

describe('comments slice: threads', () => {
    test('listThreads marks the panel fetching and clears a previous lock', () => {
        const locked = reducer(initialState, actions.listThreadsFailure({ key, lock }));
        const state = reducer(locked, actions.listThreads({ resource, objectUuid, pageNumber: 2 }));
        expect(state.threads[key].isFetching).toBe(true);
        expect(state.threads[key].lock).toBeUndefined();
    });

    test('listThreadsSuccess stores the page', () => {
        const state = withThreads([comment('r1'), comment('r2', { replyCount: 3 })]);
        expect(state.threads[key]).toMatchObject({
            comments: [expect.objectContaining({ uuid: 'r1' }), expect.objectContaining({ uuid: 'r2', replyCount: 3 })],
            totalItems: 2,
            totalPages: 1,
            pageNumber: 1,
            isFetching: false,
        });
    });

    test('a later page of roots is appended after the ones already shown, without duplicates', () => {
        let state = withThreads([comment('r1'), comment('r2')]);
        state = reducer(
            state,
            actions.listThreadsSuccess({
                key,
                page: page([comment('r2'), comment('r3')], { pageNumber: 2, totalItems: 3, totalPages: 2 }),
            }),
        );
        expect(state.threads[key].comments.map((c) => c.uuid)).toEqual(['r1', 'r2', 'r3']);
        expect(state.threads[key].pageNumber).toBe(2);

        state = reducer(state, actions.listThreadsSuccess({ key, page: page([comment('r9')]) }));
        expect(state.threads[key].comments.map((c) => c.uuid)).toEqual(['r9']);
    });

    test('listThreadsFailure with a lock locks the panel; without one it only stops fetching', () => {
        const fetching = reducer(initialState, actions.listThreads({ resource, objectUuid, pageNumber: 1 }));
        expect(reducer(fetching, actions.listThreadsFailure({ key, lock })).threads[key]).toMatchObject({ isFetching: false, lock });
        expect(reducer(fetching, actions.listThreadsFailure({ key })).threads[key]).toMatchObject({ isFetching: false, lock: undefined });
    });

    test('two panels keep separate state', () => {
        const otherKey = panelKey(Resource.Discoveries, 'obj-2');
        let state = withThreads([comment('r1')]);
        state = reducer(state, actions.listThreads({ resource: Resource.Discoveries, objectUuid: 'obj-2', pageNumber: 1 }));
        state = reducer(state, actions.listThreadsFailure({ key: otherKey, lock }));
        expect(state.threads[key].lock).toBeUndefined();
        expect(state.threads[key].comments).toHaveLength(1);
        expect(state.threads[otherKey].lock).toEqual(lock);
    });

    test('clearPanel drops the panel and the replies of its roots', () => {
        let state = withThreads([comment('r1')]);
        state = reducer(state, actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c1')]) }));
        state = reducer(state, actions.listRepliesSuccess({ rootUuid: 'other-root', page: page([comment('c2')]) }));
        state = reducer(state, actions.clearPanel({ resource, objectUuid }));
        expect(state.threads[key]).toBeUndefined();
        expect(state.replies.r1).toBeUndefined();
        expect(state.replies['other-root']).toBeDefined();
    });
});

describe('comments slice: replies', () => {
    test('listReplies then listRepliesSuccess populates the thread', () => {
        let state = reducer(initialState, actions.listReplies({ rootUuid: 'r1', pageNumber: 1 }));
        expect(state.replies.r1).toMatchObject({ isFetching: true, itemsPerPage: REPLIES_PAGE_SIZE });
        state = reducer(state, actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c1')], { itemsPerPage: 20 }) }));
        expect(state.replies.r1).toMatchObject({ isFetching: false, comments: [expect.objectContaining({ uuid: 'c1' })] });
    });

    test('a later page of replies is appended after the ones already shown, without duplicates', () => {
        let state = reducer(
            initialState,
            actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c1'), comment('c2')], { totalItems: 3, totalPages: 2 }) }),
        );
        state = reducer(
            state,
            actions.listRepliesSuccess({
                rootUuid: 'r1',
                page: page([comment('c2'), comment('c3')], { pageNumber: 2, totalItems: 3, totalPages: 2 }),
            }),
        );
        expect(state.replies.r1.comments.map((c) => c.uuid)).toEqual(['c1', 'c2', 'c3']);
        expect(state.replies.r1.pageNumber).toBe(2);

        state = reducer(state, actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c9')]) }));
        expect(state.replies.r1.comments.map((c) => c.uuid)).toEqual(['c9']);
    });

    test('listRepliesFailure stops fetching', () => {
        const state = reducer(
            reducer(initialState, actions.listReplies({ rootUuid: 'r1', pageNumber: 1 })),
            actions.listRepliesFailure({ rootUuid: 'r1' }),
        );
        expect(state.replies.r1.isFetching).toBe(false);
    });
});

describe('comments slice: posting', () => {
    test('a root post toggles the panel posting flag and clears a denial', () => {
        let state = reducer(initialState, actions.createCommentFailure({ key, denied: 'nope' }));
        expect(state.threads[key].postingDenied).toBe('nope');
        state = reducer(state, actions.createComment({ resource, objectUuid, body: 'hi' }));
        expect(state.threads[key]).toMatchObject({ isPosting: true, postingDenied: undefined, postSucceeded: false });
        state = reducer(state, actions.createCommentSuccess({ key, comment: comment('r9') }));
        expect(state.threads[key]).toMatchObject({ isPosting: false, postSucceeded: true });
    });

    test('a reply post toggles the thread posting flag and bumps the root replyCount', () => {
        let state = withThreads([comment('r1', { replyCount: 1 })]);
        state = reducer(state, actions.createComment({ resource, objectUuid, body: 'hi', parentUuid: 'r1' }));
        expect(state.replies.r1.isPosting).toBe(true);
        expect(state.threads[key].isPosting).toBe(false);
        state = reducer(state, actions.createCommentSuccess({ key, comment: comment('c1'), parentUuid: 'r1' }));
        expect(state.replies.r1).toMatchObject({ isPosting: false, postSucceeded: true });
        expect(state.threads[key].comments[0].replyCount).toBe(2);
    });

    test('a denied reply lands on the thread, not the panel', () => {
        const state = reducer(initialState, actions.createCommentFailure({ key, parentUuid: 'r1', denied: 'no' }));
        expect(state.replies.r1.postingDenied).toBe('no');
        expect(state.threads[key]?.postingDenied).toBeUndefined();
    });
});

describe('comments slice: resolve, unresolve, delete', () => {
    const ref = { uuid: 'r1', resource, objectUuid };

    test.each([
        [
            'resolve',
            actions.resolveComment(ref),
            actions.resolveCommentSuccess({ uuid: 'r1' }),
            actions.resolveCommentFailure({ uuid: 'r1' }),
        ],
        [
            'unresolve',
            actions.unresolveComment(ref),
            actions.unresolveCommentSuccess({ uuid: 'r1' }),
            actions.unresolveCommentFailure({ uuid: 'r1' }),
        ],
        ['delete', actions.deleteComment(ref), actions.deleteCommentSuccess({ uuid: 'r1' }), actions.deleteCommentFailure({ uuid: 'r1' })],
    ])('%s marks the comment busy until it settles', (_, start, success, failure) => {
        const busy = reducer(initialState, start);
        expect(busy.busy.r1).toBe(true);
        expect(reducer(busy, success).busy.r1).toBeUndefined();
        expect(reducer(busy, failure).busy.r1).toBeUndefined();
    });

    test('deleting a root drops its cached replies; deleting a reply keeps them', () => {
        let state = reducer(initialState, actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c1')]) }));
        expect(reducer(state, actions.deleteCommentSuccess({ uuid: 'r1' })).replies.r1).toBeUndefined();
        state = reducer(state, actions.deleteCommentSuccess({ uuid: 'c1', parentUuid: 'r1' }));
        expect(state.replies.r1).toBeDefined();
    });

    test('resetState returns to the initial state', () => {
        expect(reducer(withThreads([comment('r1')]), actions.resetState())).toEqual(initialState);
    });
});

describe('comments selectors', () => {
    test('read the panel, the thread and the busy map', () => {
        let state = withThreads([comment('r1')]);
        state = reducer(state, actions.listRepliesSuccess({ rootUuid: 'r1', page: page([comment('c1')]) }));
        state = reducer(state, actions.resolveComment({ uuid: 'r1', resource, objectUuid }));
        const root = { comments: state } as unknown as Parameters<typeof selectors.state>[0];
        expect(selectors.threads(key)(root)?.comments).toHaveLength(1);
        expect(selectors.replies('r1')(root)?.comments).toHaveLength(1);
        expect(selectors.busy(root)).toEqual({ r1: true });
        expect(selectors.state({} as Parameters<typeof selectors.state>[0])).toEqual(initialState);
    });
});
