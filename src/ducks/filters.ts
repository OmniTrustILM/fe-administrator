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

export type Filter = {
    entity: EntityType;
    filter: FilterObject;
};

type FilterObject = {
    availableFilters: SearchFieldListModel[];
    currentFilters: SearchFilterModel[];
    preservedFilters: SearchFilterModel[];
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
};

export type State = {
    filters: Filter[];
};

const EMPTY_FILTER: FilterObject = {
    availableFilters: [],
    currentFilters: [],
    preservedFilters: [],
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

        setPreservedFilters: (state, action: PayloadAction<{ entity: EntityType; preservedFilters: SearchFilterModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.preservedFilters = action.payload.preservedFilters;
            });
        },

        setDrillDownFilters: (state, action: PayloadAction<{ entity: EntityType; filters: SearchFilterModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.currentFilters = action.payload.filters;
                filter.handedIn = { source: 'drill-down' };
            });
        },

        /**
         * Hands the filters a detail link kept back to the list it returns to, once: they are consumed here,
         * so only the visit straight after is a return. A drill-down still waiting outranks them.
         */
        takePreservedFilters: (state, action: PayloadAction<{ entity: EntityType }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                if (filter.handedIn?.source !== 'drill-down' && filter.preservedFilters.length > 0) {
                    filter.currentFilters = filter.preservedFilters;
                    filter.handedIn = { source: 'return', position: filter.viewPosition };
                }
                filter.preservedFilters = [];
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
const preservedFilters = (entity: EntityType) =>
    createSelector(state, (state) => (state?.filters.find((f) => f.entity === entity)?.filter ?? EMPTY_FILTER).preservedFilters);
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
    preservedFilters,
    isFetchingFilters,
    hasLoadedFilters,
    hasFailedFilters,
    handedInFilters,
};

export const actions = slice.actions;

export default slice.reducer;
