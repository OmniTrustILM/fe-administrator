import { createAction, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { type CommentDto, type CommentResponseDto, type Resource, SortDirection } from 'types/openapi';
import type { WidgetLockErrorModel } from 'types/user-interface';

/**
 * One panel per (resource, object). Everything is keyed so that two panels on one page, or the same panel across a
 * route change, never share a list, a lock or an in-flight flag.
 */
export const panelKey = (resource: Resource, objectUuid: string): string => `${resource}/${objectUuid}`;

export const THREADS_PAGE_SIZE = 10;
export const REPLIES_PAGE_SIZE = 20;

export type PagedComments = {
    comments: CommentDto[];
    totalItems: number;
    totalPages: number;
    pageNumber: number;
    itemsPerPage: number;
    /** The page the accumulated list starts at: 1 normally, later when a listing was anchored onto a deeper page. */
    firstPage: number;
    /** The anchor that was asked for but is not on the page that came back, so the comment no longer exists. */
    missingAnchor?: string;
};

export type ThreadsState = PagedComments & {
    /** Direction the roots were loaded in; a later page is only appended when it was read in the same one. */
    sortDirection: SortDirection;
    isFetching: boolean;
    /** Set when listing the object's threads is denied or fails; rendered through the widget lock. */
    lock?: WidgetLockErrorModel;
    isPosting: boolean;
    /** Message from a 403 on posting: the compose box yields to it instead of the FE guessing at permissions. */
    postingDenied?: string;
    /** Set when the last post committed; the compose box keeps the draft until it sees this. */
    postSucceeded: boolean;
};

export type RepliesState = PagedComments & {
    isFetching: boolean;
    isPosting: boolean;
    postingDenied?: string;
    postSucceeded: boolean;
};

export type State = {
    threads: Record<string, ThreadsState>;
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
    firstPage: 1,
});

const threadsOf = (state: State, key: string): ThreadsState => {
    state.threads[key] ??= {
        ...emptyPage(THREADS_PAGE_SIZE),
        sortDirection: SortDirection.Asc,
        isFetching: false,
        isPosting: false,
        postSucceeded: false,
    };
    return state.threads[key];
};

const repliesOf = (state: State, rootUuid: string): RepliesState => {
    state.replies[rootUuid] ??= { ...emptyPage(REPLIES_PAGE_SIZE), isFetching: false, isPosting: false, postSucceeded: false };
    return state.replies[rootUuid];
};

/**
 * Pages accumulate: a first page replaces what is shown and a later page is appended below it. An anchored page
 * replaces too, because it was read in place of the requested page and the list below it is unknown; the caller
 * decides whether a later page was read in the same order as the list it would join.
 */
const applyPage = (target: PagedComments, page: CommentResponseDto, append: boolean, anchorUuid?: string) => {
    const loaded = append ? target.comments : [];
    const seen = new Set(loaded.map((comment) => comment.uuid));
    target.comments = [...loaded, ...page.comments.filter((comment) => !seen.has(comment.uuid))];
    target.totalItems = page.totalItems;
    target.totalPages = page.totalPages;
    target.pageNumber = page.pageNumber;
    target.itemsPerPage = page.itemsPerPage;
    target.firstPage = append ? target.firstPage : page.pageNumber;
    const anchorShown = anchorUuid === undefined || page.comments.some((comment) => comment.uuid === anchorUuid);
    target.missingAnchor = anchorShown ? undefined : anchorUuid;
};

/** Items on the pages before the accumulated list; non-zero only after an anchored landing on a deeper page. */
export const loadedBefore = (page: PagedComments): number => (page.firstPage - 1) * page.itemsPerPage;

/** Items on the pages after the accumulated list. */
export const remainingAfter = (page: PagedComments): number => Math.max(0, page.totalItems - loadedBefore(page) - page.comments.length);

/** Everything from the first page up to the last one read, as the size of a single first page. */
export const loadedWindow = (page: PagedComments): number => page.pageNumber * page.itemsPerPage;

type ObjectRef = { resource: Resource; objectUuid: string };

/** `anchorUuid` is a thread root: the page holding it is read in place of `pageNumber`. */
export type ListThreadsPayload = ObjectRef & {
    pageNumber: number;
    itemsPerPage?: number;
    sortDirection?: SortDirection;
    anchorUuid?: string;
};
/** Replies are always read oldest-first; `anchorUuid` is a reply, whose page is read in place of `pageNumber`. */
export type ListRepliesPayload = { rootUuid: string; pageNumber: number; itemsPerPage?: number; anchorUuid?: string };
export type ThreadsPagePayload = { key: string; page: CommentResponseDto; sortDirection: SortDirection; anchorUuid?: string };
export type RepliesPagePayload = { rootUuid: string; page: CommentResponseDto; anchorUuid?: string };
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
            threads.missingAnchor = undefined;
        },

        /**
         * A later page joins the list only when it was read in the direction the list holds: a page read the other
         * way round would repeat roots already shown, so a direction change starts the list over.
         */
        listThreadsSuccess: (state, action: PayloadAction<ThreadsPagePayload>) => {
            const threads = threadsOf(state, action.payload.key);
            const { page, sortDirection, anchorUuid } = action.payload;
            const append = page.pageNumber > 1 && anchorUuid === undefined && sortDirection === threads.sortDirection;
            applyPage(threads, page, append, anchorUuid);
            threads.sortDirection = sortDirection;
            threads.isFetching = false;
        },

        listThreadsFailure: (state, action: PayloadAction<{ key: string; lock?: WidgetLockErrorModel }>) => {
            const threads = threadsOf(state, action.payload.key);
            threads.isFetching = false;
            threads.lock = action.payload.lock;
        },

        listReplies: (state, action: PayloadAction<ListRepliesPayload>) => {
            const replies = repliesOf(state, action.payload.rootUuid);
            replies.isFetching = true;
            replies.missingAnchor = undefined;
        },

        listRepliesSuccess: (state, action: PayloadAction<RepliesPagePayload>) => {
            const replies = repliesOf(state, action.payload.rootUuid);
            const { page, anchorUuid } = action.payload;
            applyPage(replies, page, page.pageNumber > 1 && anchorUuid === undefined, anchorUuid);
            replies.isFetching = false;
        },

        /** `missingAnchor` is set when the thread of an anchored reply is itself gone, which reads like a stale anchor. */
        listRepliesFailure: (state, action: PayloadAction<{ rootUuid: string; missingAnchor?: string }>) => {
            const replies = repliesOf(state, action.payload.rootUuid);
            replies.isFetching = false;
            replies.missingAnchor = action.payload.missingAnchor;
        },

        createComment: (state, action: PayloadAction<CreateCommentPayload>) => {
            const { resource, objectUuid, parentUuid } = action.payload;
            const target = parentUuid ? repliesOf(state, parentUuid) : threadsOf(state, panelKey(resource, objectUuid));
            target.isPosting = true;
            target.postingDenied = undefined;
            target.postSucceeded = false;
        },

        createCommentSuccess: (state, action: PayloadAction<{ key: string; comment: CommentDto; parentUuid?: string }>) => {
            const { key, parentUuid } = action.payload;
            if (parentUuid) {
                const replies = repliesOf(state, parentUuid);
                replies.isPosting = false;
                replies.postSucceeded = true;
                const root = threadsOf(state, key).comments.find((comment) => comment.uuid === parentUuid);
                if (root) root.replyCount = (root.replyCount ?? 0) + 1;
            } else {
                const threads = threadsOf(state, key);
                threads.isPosting = false;
                threads.postSucceeded = true;
            }
        },

        createCommentFailure: (state, action: PayloadAction<{ key: string; parentUuid?: string; denied?: string }>) => {
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

const threads = (key: string) => createSelector(state, (s) => s.threads[key]);
const replies = (rootUuid: string) => createSelector(state, (s) => s.replies[rootUuid]);
const busy = createSelector(state, (s) => s.busy);

export const selectors = {
    state,
    threads,
    replies,
    busy,
};

/**
 * Re-reads everything the panel shows: the roots window and every thread whose replies are loaded. No state changes
 * on its own; an epic turns it into the listings, which is what lets a refresh pick up replies posted elsewhere.
 */
export const refreshPanel = createAction<ObjectRef>(`${slice.name}/refreshPanel`);

export const actions = { ...slice.actions, refreshPanel };

export default slice.reducer;
