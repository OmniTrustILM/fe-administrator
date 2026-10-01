import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import type { ListViewModel, ListViewRequestModel, ListViewUpdateRequestModel } from 'types/listViews';
import type { Resource } from 'types/openapi';

/**
 * The uuid a view carries while its create is in flight.
 *
 * A tab appears the moment it is asked for rather than a round trip later, so the optimistic row
 * needs an identity before the API has given it one. A single constant is enough because the strip
 * gates its own actions on {@link State} `isMutating`, so there is never a second create in flight —
 * and a constant, unlike a generated uuid, keeps the reducer a pure function of its input.
 */
export const PENDING_VIEW_UUID = 'pending-view';

/** The saved views of one resource, and what is currently happening to them. */
export interface ResourceViews {
    views: ListViewModel[];
    isFetching: boolean;
    /**
     * Whether the list read has settled, successfully or not. Distinct from `views.length > 0`, which
     * cannot tell a user with no saved views from a read still in flight — and would then read the
     * first optimistic create as the initial result.
     */
    hasLoaded: boolean;
    /** Whether a create, edit or delete is in flight. The strip's actions are held while it is. */
    isMutating: boolean;
    /**
     * The view list as it stood before the in-flight mutation, restored if the mutation fails. The
     * optimistic edit is applied to `views` directly, so this is the only way back.
     */
    rollback?: ListViewModel[];
    /** The uuid the last create was given, so the strip can follow the tab it opened. */
    createdUuid?: string;
    /**
     * Counts the mutation boundaries this resource has crossed: one step when a write starts, another
     * when it settles. It is what lets a list response be dated against the writes around it.
     */
    mutationEpoch: number;
    /**
     * The epoch the read now in flight was issued under, or nothing when no read is in flight. Reads
     * are superseded rather than queued — the epic runs them under `switchMap` — so one is enough.
     */
    readEpoch?: number;
    /** Whether the last read was answered but set aside because a write overlapped it, so `views` is not its answer. */
    isStale?: boolean;
}

export type State = {
    byResource: Partial<Record<Resource, ResourceViews>>;
    /**
     * Per-view column keys of attribute fields a stored view held while the catalogue did not publish them. Kept apart
     * from `byResource`, which a list read rebuilds, because a later field under the same key is held back
     * until the user confirms it, and that must outlast leaving the page.
     */
    dormantFields: Partial<Record<Resource, string[]>>;
    error?: string;
};

export const initialState: State = {
    byResource: {},
    dormantFields: {},
};

const NO_DORMANT_FIELDS: string[] = [];

const EMPTY_RESOURCE_VIEWS: ResourceViews = {
    views: [],
    isFetching: false,
    hasLoaded: false,
    isMutating: false,
    mutationEpoch: 0,
};

function forResource(state: State, resource: Resource): ResourceViews {
    state.byResource[resource] ??= { ...EMPTY_RESOURCE_VIEWS };
    return state.byResource[resource];
}

/**
 * One pinned view per user and resource, which is what Core stores. Mirroring the invariant locally
 * means pinning a view un-pins the previous one in the same render the click happened, rather than
 * showing two pins until the next list read.
 */
function keepOnePinned(views: ListViewModel[], pinnedUuid: string): void {
    for (const view of views) {
        if (view.uuid !== pinnedUuid) view.defaultView = false;
    }
}

/** Starts a mutation: snapshots the list so a failure has something to roll back to. */
function beginMutation(state: State, resource: Resource): ResourceViews {
    const entry = forResource(state, resource);
    entry.rollback = entry.views.map((view) => ({ ...view }));
    entry.isMutating = true;
    entry.createdUuid = undefined;
    entry.mutationEpoch += 1;
    state.error = undefined;
    return entry;
}

function endMutation(entry: ResourceViews): void {
    entry.isMutating = false;
    entry.rollback = undefined;
    entry.mutationEpoch += 1;
}

/** Restores the snapshot the failed mutation was applied over. */
function rollBack(state: State, resource: Resource, error: string | undefined): void {
    const entry = forResource(state, resource);
    if (entry.rollback) entry.views = entry.rollback;
    endMutation(entry);
    state.error = error;
}

/**
 * Ends the read in flight and says whether a write started or settled while it was out.
 *
 * Checking `isMutating` alone is not enough: a write that started after the read and settled before it
 * would let the older list land on top of a confirmed change, and the next full-row edit would then send
 * those stale rows back to Core. A read that overlapped a write the other way round would drop the
 * optimistic row instead, and leave `rollback` describing a list the read has since replaced.
 *
 * No recorded epoch means the request this answers is not one this slice saw — the state was reset under
 * it, or the views were seeded directly — and there is nothing to date it against.
 */
function settleRead(entry: ResourceViews): boolean {
    const issuedUnder = entry.readEpoch;
    entry.readEpoch = undefined;
    return entry.isMutating || (issuedUnder !== undefined && issuedUnder !== entry.mutationEpoch);
}

export const slice = createSlice({
    name: 'listViews',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listViews: (state, action: PayloadAction<{ resource: Resource }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.isFetching = true;
            entry.isStale = false;
            entry.readEpoch = entry.mutationEpoch;
            state.error = undefined;
        },

        listViewsSuccess: (state, action: PayloadAction<{ resource: Resource; views: ListViewModel[] }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.isFetching = false;
            entry.hasLoaded = true;

            if (settleRead(entry)) {
                entry.isStale = true;
                return;
            }

            entry.views = action.payload.views;
        },

        listViewsFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.isFetching = false;
            // Loaded in the sense the strip needs: the read has settled, so Standard opens rather than
            // the strip waiting forever for a list that is not coming.
            entry.hasLoaded = true;
            // A list held from an earlier visit is not what Core holds now, and a full-row save built on it would
            // overwrite any newer change. Rows a write overlapping the read has put there, whether still in flight
            // or confirmed since, are kept instead, and the list is read again once that write settles.
            if (settleRead(entry)) entry.isStale = true;
            else entry.views = [];
            state.error = action.payload.error;
        },

        createView: (state, action: PayloadAction<{ resource: Resource; view: ListViewRequestModel }>) => {
            const entry = beginMutation(state, action.payload.resource);
            const { view } = action.payload;

            entry.views.push({
                uuid: PENDING_VIEW_UUID,
                name: view.name,
                resource: action.payload.resource,
                columns: view.columns,
                defaultView: view.defaultView === true,
                filters: view.filters,
                sort: view.sort,
            });

            if (view.defaultView === true) keepOnePinned(entry.views, PENDING_VIEW_UUID);
        },

        createViewSuccess: (state, action: PayloadAction<{ resource: Resource; view: ListViewModel }>) => {
            const entry = forResource(state, action.payload.resource);
            const pending = entry.views.findIndex((view) => view.uuid === PENDING_VIEW_UUID);

            if (pending === -1) entry.views.push(action.payload.view);
            else entry.views[pending] = action.payload.view;

            if (action.payload.view.defaultView) keepOnePinned(entry.views, action.payload.view.uuid);

            entry.createdUuid = action.payload.view.uuid;
            endMutation(entry);
        },

        createViewFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {
            rollBack(state, action.payload.resource, action.payload.error);
        },

        updateView: (state, action: PayloadAction<{ resource: Resource; uuid: string; view: ListViewUpdateRequestModel }>) => {
            const entry = beginMutation(state, action.payload.resource);
            const stored = entry.views.find((view) => view.uuid === action.payload.uuid);
            if (!stored) return;

            Object.assign(stored, action.payload.view, { defaultView: action.payload.view.defaultView === true });
            if (stored.defaultView) keepOnePinned(entry.views, stored.uuid);
        },

        updateViewSuccess: (state, action: PayloadAction<{ resource: Resource; view: ListViewModel }>) => {
            const entry = forResource(state, action.payload.resource);
            const index = entry.views.findIndex((view) => view.uuid === action.payload.view.uuid);

            if (index !== -1) entry.views[index] = action.payload.view;
            if (action.payload.view.defaultView) keepOnePinned(entry.views, action.payload.view.uuid);

            endMutation(entry);
        },

        updateViewFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {
            rollBack(state, action.payload.resource, action.payload.error);
        },

        markFieldsDormant: (state, action: PayloadAction<{ resource: Resource; keys: string[] }>) => {
            const held = new Set(state.dormantFields[action.payload.resource] ?? []);
            for (const key of action.payload.keys) held.add(key);
            state.dormantFields[action.payload.resource] = [...held];
        },

        releaseDormantFields: (state, action: PayloadAction<{ resource: Resource; keys: string[] }>) => {
            const released = new Set(action.payload.keys);
            const held = state.dormantFields[action.payload.resource];
            if (held) state.dormantFields[action.payload.resource] = held.filter((key) => !released.has(key));
        },

        deleteView: (state, action: PayloadAction<{ resource: Resource; uuid: string }>) => {
            const entry = beginMutation(state, action.payload.resource);
            entry.views = entry.views.filter((view) => view.uuid !== action.payload.uuid);
        },

        deleteViewSuccess: (state, action: PayloadAction<{ resource: Resource; uuid: string }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.views = entry.views.filter((view) => view.uuid !== action.payload.uuid);
            endMutation(entry);
        },

        deleteViewFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {
            rollBack(state, action.payload.resource, action.payload.error);
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const resourceViews = (resource: Resource) => createSelector(state, (state) => state?.byResource?.[resource] ?? EMPTY_RESOURCE_VIEWS);

const views = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.views);
const isFetching = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.isFetching);
const hasLoaded = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.hasLoaded);
const isMutating = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.isMutating);
const isStale = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.isStale ?? false);
const createdUuid = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.createdUuid);
const error = createSelector(state, (state) => state?.error);
const dormantFields = (resource: Resource) => createSelector(state, (state) => state?.dormantFields?.[resource] ?? NO_DORMANT_FIELDS);

export const selectors = {
    state,
    resourceViews,
    views,
    isFetching,
    hasLoaded,
    isMutating,
    isStale,
    createdUuid,
    error,
    dormantFields,
};

export const actions = slice.actions;

export default slice.reducer;
