import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WritableDraft } from 'immer';
import type { Observable } from 'rxjs';
import type { ApiClients } from '../api';
import type { AppState } from 'ducks';
import type { SearchFieldListModel, SearchFilterModel } from 'types/certificate';

export enum EntityType {
    AUDIT_LOG,
    ENTITY,
    CBOM,
    LOCATION,
    CERTIFICATE,
    KEY,
    VAULT,
    VAULT_PROFILE,
    DISCOVERY,
    NOTIFICATIONS,
    NOTIFICATION_PROFILES,
    SCHEDULER,
    SCHEDULER_HISTORY,
    APPROVAL_PROFILES,
    CONDITIONS,
    ACTIONS,
    OID,
    CONNECTOR,
    SECRET,
    TIME_QUALITY_CONFIGURATION,
    TSP_PROFILE,
    SIGNING_PROFILE,
    ACTIONS_SOURCE,
    SIGNING_RECORD,
    CRYPTO_ASSET,
    CBOM_SYNC_SKIP,
}

/** Where a list's view strip stood: the tab it was on, and whether that tab was only the backdrop to a drill-down. */
export type ViewPosition = {
    viewId: string;
    isDrillDown: boolean;
};

/**
 * Filters a list is to open on in place of its opening view's own. A drill-down opens over the pinned view
 * without claiming it; a return from a detail page goes back to the position the list was left in.
 */
export type HandedInFilters = { source: 'drill-down' } | { source: 'return'; position?: ViewPosition };

/**
 * What a list with a view strip held when it unmounted, kept while the user stays inside the list's route
 * scope, such as on one of its detail pages, so that coming back can hand it back.
 */
type LeftList = {
    path: string;
    scope: string;
    filters: SearchFilterModel[];
    position?: ViewPosition;
    /** Whether a route other than the list's own has been visited since; a remount in place has not. */
    hasGoneAway: boolean;
};

const isInScope = (pathname: string, scope: string) => pathname === scope || pathname.startsWith(`${scope}/`);

export type Filter = {
    entity: EntityType;
    filter: FilterObject;
};

type FilterObject = {
    availableFilters: SearchFieldListModel[];
    currentFilters: SearchFilterModel[];
    isFetchingFilters: boolean;
    /**
     * Whether a catalogue read has settled at least once, success or failure. `isFetchingFilters` is
     * `false` both before the first read and after it, so it cannot tell the two apart.
     */
    hasLoadedFilters: boolean;
    /**
     * Whether the last settled read failed. A failure settles `hasLoadedFilters` with no fields behind
     * it, which reads exactly like a catalogue that published none, so anything asserting what the
     * catalogue says has to ask this too.
     */
    hasFailedFilters: boolean;
    /**
     * Set while `currentFilters` were handed in for the list to open on and it has not yet done so. Only
     * handed-in filters outrank the opening view's own; filters merely left over from an earlier visit do
     * not. Any filter the user sets drops it, so a hand-in the list never opened on cannot label theirs.
     */
    handedIn?: HandedInFilters;
    /** The strip's last position, which a return from a detail page goes back to. */
    viewPosition?: ViewPosition;
    leftList?: LeftList;
};

export type State = {
    filters: Filter[];
};

const EMPTY_FILTER: FilterObject = {
    availableFilters: [],
    currentFilters: [],
    isFetchingFilters: false,
    hasLoadedFilters: false,
    hasFailedFilters: false,
};

export const initialState: State = {
    filters: [],
};

const updateFilterState = (state: WritableDraft<State>, entity: EntityType, callback: (filterObject: FilterObject) => void) => {
    const index = state.filters.findIndex((f) => f.entity === entity);
    const filter = index === -1 ? { entity, filter: { ...EMPTY_FILTER } } : state.filters[index];

    callback(filter.filter);

    state.filters =
        index === -1 ? [...state.filters, filter] : [...state.filters.slice(0, index), filter, ...state.filters.slice(index + 1)];
};

export const slice = createSlice({
    name: 'filters',

    initialState,

    reducers: {
        setCurrentFilters: (state, action: PayloadAction<{ entity: EntityType; currentFilters: SearchFilterModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.currentFilters = action.payload.currentFilters;
                filter.handedIn = undefined;
            });
        },

        /** An empty drill-down narrows nothing, so it hands nothing in and the list opens on its view. */
        setDrillDownFilters: (state, action: PayloadAction<{ entity: EntityType; filters: SearchFilterModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.currentFilters = action.payload.filters;
                filter.handedIn = action.payload.filters.length > 0 ? { source: 'drill-down' } : undefined;
            });
        },

        leaveList: (state, action: PayloadAction<{ entity: EntityType; path: string; scope: string }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.leftList = {
                    path: action.payload.path,
                    scope: action.payload.scope,
                    filters: filter.currentFilters,
                    position: filter.viewPosition,
                    hasGoneAway: false,
                };
            });
        },

        /**
         * Keeps what a list was left with only while the user stays inside its scope. Leaving the scope also
         * drops a hand-in the list never opened on, so a later visit does not open on it.
         */
        routeChanged: (state, action: PayloadAction<{ pathname: string }>) => {
            const { pathname } = action.payload;
            for (const { filter } of state.filters) {
                const left = filter.leftList;
                if (!left || pathname === left.path) continue;
                if (isInScope(pathname, left.scope)) {
                    left.hasGoneAway = true;
                } else {
                    filter.leftList = undefined;
                    filter.handedIn = undefined;
                    filter.viewPosition = undefined;
                }
            }
        },

        /**
         * Hands a list mounting at the path it was left at what it held then, once: the record is consumed here,
         * so only the visit straight after is a return. A drill-down still waiting outranks it.
         */
        returnToList: (state, action: PayloadAction<{ entity: EntityType; path: string }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                const left = filter.leftList;
                filter.leftList = undefined;
                if (!left?.hasGoneAway || left.path !== action.payload.path || filter.handedIn?.source === 'drill-down') return;

                filter.currentFilters = left.filters;
                filter.handedIn = { source: 'return', position: left.position };
            });
        },

        clearHandedInFilters: (state, action: PayloadAction<{ entity: EntityType }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.handedIn = undefined;
            });
        },

        setViewPosition: (state, action: PayloadAction<{ entity: EntityType; position: ViewPosition }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.viewPosition = action.payload.position;
            });
        },

        getAvailableFilters: (
            state,
            action: PayloadAction<{
                entity: EntityType;
                getAvailableFiltersApi: (apiClients: ApiClients) => Observable<Array<SearchFieldListModel>>;
            }>,
        ) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                // The catalogue already held is kept: emptying it would leave a settled
                // `hasLoadedFilters` beside no fields, and blank the filter widget for the round trip.
                filter.isFetchingFilters = true;
            });
        },

        getAvailableFiltersSuccess: (state, action: PayloadAction<{ entity: EntityType; availableFilters: SearchFieldListModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.availableFilters = action.payload.availableFilters;
                filter.isFetchingFilters = false;
                filter.hasLoadedFilters = true;
                filter.hasFailedFilters = false;
            });
        },

        getAvailableFiltersFailure: (state, action: PayloadAction<{ entity: EntityType; error: string | undefined }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.isFetchingFilters = false;
                filter.hasLoadedFilters = true;
                filter.hasFailedFilters = true;
            });
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const availableFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).availableFilters);
const currentFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).currentFilters);
const isFetchingFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).isFetchingFilters);
const hasLoadedFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).hasLoadedFilters);
const hasFailedFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).hasFailedFilters);
const handedInFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).handedIn);

export const selectors = {
    state,

    availableFilters,
    currentFilters,
    isFetchingFilters,
    hasLoadedFilters,
    hasFailedFilters,
    handedInFilters,
};

export const actions = slice.actions;

export default slice.reducer;
