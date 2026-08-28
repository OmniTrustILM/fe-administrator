import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { CommentDto, CommentResponseDto, Resource } from 'types/openapi';
import type { WidgetLockErrorModel } from 'types/user-interface';

/**
 * One panel per (resource, object). Everything is keyed so that two panels on one page, or the same panel across a
 * route change, never share a list, a lock or an in-flight flag.
 */
export type PanelKey = string;

export const panelKey = (resource: Resource, objectUuid: string): PanelKey => `${resource}/${objectUuid}`;

export const THREADS_PAGE_SIZE = 10;
export const REPLIES_PAGE_SIZE = 20;

export type PagedComments = {
    comments: CommentDto[];
    totalItems: number;
    totalPages: number;
    pageNumber: number;
    itemsPerPage: number;
};

export type ThreadsState = PagedComments & {
    isFetching: boolean;
    /** Set when listing the object's threads is denied or fails; rendered through the widget lock. */
    lock?: WidgetLockErrorModel;
    isPosting: boolean;
    /** Message from a 403 on posting: the compose box yields to it instead of the FE guessing at permissions. */
    postingDenied?: string;
};

export type RepliesState = PagedComments & {
    isFetching: boolean;
    isPosting: boolean;
    postingDenied?: string;
};

export type State = {
    threads: Record<PanelKey, ThreadsState>;
    replies: Record<string, RepliesState>;
    /** Comment UUIDs with a resolve, unresolve or delete in flight. */
    busy: Record<string, boolean>;
};

export const initialState: State = {
    threads: {},
    replies: {},
    busy: {},
};

const emptyPage = (itemsPerPage: number): PagedComments => ({
    comments: [],
    totalItems: 0,
    totalPages: 0,
    pageNumber: 1,
    itemsPerPage,
});

const threadsOf = (state: State, key: PanelKey): ThreadsState => {
    state.threads[key] ??= { ...emptyPage(THREADS_PAGE_SIZE), isFetching: false, isPosting: false };
    return state.threads[key];
};

const repliesOf = (state: State, rootUuid: string): RepliesState => {
    state.replies[rootUuid] ??= { ...emptyPage(REPLIES_PAGE_SIZE), isFetching: false, isPosting: false };
    return state.replies[rootUuid];
};

const applyPage = (target: PagedComments, page: CommentResponseDto) => {
    target.comments = page.comments;
    target.totalItems = page.totalItems;
    target.totalPages = page.totalPages;
    target.pageNumber = page.pageNumber;
    target.itemsPerPage = page.itemsPerPage;
};

type ObjectRef = { resource: Resource; objectUuid: string };

export type ListThreadsPayload = ObjectRef & { pageNumber: number; itemsPerPage?: number };
export type ListRepliesPayload = { rootUuid: string; pageNumber: number; itemsPerPage?: number };
export type CreateCommentPayload = ObjectRef & { body: string; parentUuid?: string };
/** The object is carried along so the epic can refresh the right list after the write commits. */
export type CommentRefPayload = ObjectRef & { uuid: string; parentUuid?: string };

export const slice = createSlice({
    name: 'comments',

    initialState,

    reducers: {
        resetState: () => initialState,

        clearPanel: (state, action: PayloadAction<ObjectRef>) => {
            const key = panelKey(action.payload.resource, action.payload.objectUuid);
            const roots = state.threads[key]?.comments ?? [];
            for (const root of roots) delete state.replies[root.uuid];
            delete state.threads[key];
        },

        listThreads: (state, action: PayloadAction<ListThreadsPayload>) => {
            const threads = threadsOf(state, panelKey(action.payload.resource, action.payload.objectUuid));
            threads.isFetching = true;
            threads.lock = undefined;
        },

        listThreadsSuccess: (state, action: PayloadAction<{ key: PanelKey; page: CommentResponseDto }>) => {
            const threads = threadsOf(state, action.payload.key);
            applyPage(threads, action.payload.page);
            threads.isFetching = false;
        },

        listThreadsFailure: (state, action: PayloadAction<{ key: PanelKey; lock?: WidgetLockErrorModel }>) => {
            const threads = threadsOf(state, action.payload.key);
            threads.isFetching = false;
            threads.lock = action.payload.lock;
        },

        listReplies: (state, action: PayloadAction<ListRepliesPayload>) => {
            repliesOf(state, action.payload.rootUuid).isFetching = true;
        },

        /** Replies accumulate: page one replaces what is shown, any later page is appended below it. */
        listRepliesSuccess: (state, action: PayloadAction<{ rootUuid: string; page: CommentResponseDto }>) => {
            const replies = repliesOf(state, action.payload.rootUuid);
            const { page } = action.payload;
            const loaded = page.pageNumber > 1 ? replies.comments : [];
            const seen = new Set(loaded.map((comment) => comment.uuid));
            applyPage(replies, page);
            replies.comments = [...loaded, ...page.comments.filter((comment) => !seen.has(comment.uuid))];
            replies.isFetching = false;
        },

        listRepliesFailure: (state, action: PayloadAction<{ rootUuid: string }>) => {
            repliesOf(state, action.payload.rootUuid).isFetching = false;
        },

        createComment: (state, action: PayloadAction<CreateCommentPayload>) => {
            const { resource, objectUuid, parentUuid } = action.payload;
            const target = parentUuid ? repliesOf(state, parentUuid) : threadsOf(state, panelKey(resource, objectUuid));
            target.isPosting = true;
            target.postingDenied = undefined;
        },

        createCommentSuccess: (state, action: PayloadAction<{ key: PanelKey; comment: CommentDto; parentUuid?: string }>) => {
            const { key, parentUuid } = action.payload;
            if (parentUuid) {
                repliesOf(state, parentUuid).isPosting = false;
                const root = threadsOf(state, key).comments.find((comment) => comment.uuid === parentUuid);
                if (root) root.replyCount = (root.replyCount ?? 0) + 1;
            } else {
                threadsOf(state, key).isPosting = false;
            }
        },

        createCommentFailure: (state, action: PayloadAction<{ key: PanelKey; parentUuid?: string; denied?: string }>) => {
            const { key, parentUuid, denied } = action.payload;
            const target = parentUuid ? repliesOf(state, parentUuid) : threadsOf(state, key);
            target.isPosting = false;
            target.postingDenied = denied;
        },

        resolveComment: (state, action: PayloadAction<CommentRefPayload>) => {
            state.busy[action.payload.uuid] = true;
        },

        resolveCommentSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            delete state.busy[action.payload.uuid];
        },

        resolveCommentFailure: (state, action: PayloadAction<{ uuid: string }>) => {
            delete state.busy[action.payload.uuid];
        },

        unresolveComment: (state, action: PayloadAction<CommentRefPayload>) => {
            state.busy[action.payload.uuid] = true;
        },

        unresolveCommentSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            delete state.busy[action.payload.uuid];
        },

        unresolveCommentFailure: (state, action: PayloadAction<{ uuid: string }>) => {
            delete state.busy[action.payload.uuid];
        },

        deleteComment: (state, action: PayloadAction<CommentRefPayload>) => {
            state.busy[action.payload.uuid] = true;
        },

        deleteCommentSuccess: (state, action: PayloadAction<{ uuid: string; parentUuid?: string }>) => {
            delete state.busy[action.payload.uuid];
            if (!action.payload.parentUuid) delete state.replies[action.payload.uuid];
        },

        deleteCommentFailure: (state, action: PayloadAction<{ uuid: string }>) => {
            delete state.busy[action.payload.uuid];
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const threads = (key: PanelKey) => createSelector(state, (s) => s.threads[key]);
const replies = (rootUuid: string) => createSelector(state, (s) => s.replies[rootUuid]);
const busy = createSelector(state, (s) => s.busy);

export const selectors = {
    state,
    threads,
    replies,
    busy,
};

export const actions = slice.actions;

export default slice.reducer;
