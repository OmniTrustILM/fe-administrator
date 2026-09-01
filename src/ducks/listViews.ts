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
    /** Whether a create, edit or delete is in flight. The strip's actions are held while it is. */
    isMutating: boolean;
    /**
     * The view list as it stood before the in-flight mutation, restored if the mutation fails. The
     * optimistic edit is applied to `views` directly, so this is the only way back.
     */
    rollback?: ListViewModel[];
    /** The uuid the last create was given, so the strip can follow the tab it opened. */
    createdUuid?: string;
}

export type State = {
    byResource: Partial<Record<Resource, ResourceViews>>;
    error?: string;
};

export const initialState: State = {
    byResource: {},
};

const EMPTY_RESOURCE_VIEWS: ResourceViews = {
    views: [],
    isFetching: false,
    isMutating: false,
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
    state.error = undefined;
    return entry;
}

function endMutation(entry: ResourceViews): void {
    entry.isMutating = false;
    entry.rollback = undefined;
}

/** Restores the snapshot the failed mutation was applied over. */
function rollBack(state: State, resource: Resource, error: string | undefined): void {
    const entry = forResource(state, resource);
    if (entry.rollback) entry.views = entry.rollback;
    endMutation(entry);
    state.error = error;
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
            state.error = undefined;
        },

        listViewsSuccess: (state, action: PayloadAction<{ resource: Resource; views: ListViewModel[] }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.views = action.payload.views;
            entry.isFetching = false;
        },

        listViewsFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {
            const entry = forResource(state, action.payload.resource);
            entry.isFetching = false;
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
const isMutating = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.isMutating);
const createdUuid = (resource: Resource) => createSelector(resourceViews(resource), (entry) => entry.createdUuid);
const error = createSelector(state, (state) => state?.error);

export const selectors = {
    state,
    resourceViews,
    views,
    isFetching,
    isMutating,
    createdUuid,
    error,
};

export const actions = slice.actions;

export default slice.reducer;
