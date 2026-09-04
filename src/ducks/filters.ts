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
}

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
     * Whether a catalogue read has settled at least once, success or failure.
     *
     * `isFetchingFilters` cannot answer this: it is `false` both before the first read and after it,
     * so a consumer that waits for the catalogue cannot tell a read still to come from a resource
     * that publishes no filter fields at all. Failure sets it too, because a failed read settles on
     * an empty catalogue and would otherwise leave such a consumer waiting for good.
     */
    hasLoadedFilters: boolean;
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
            });
        },

        setPreservedFilters: (state, action: PayloadAction<{ entity: EntityType; preservedFilters: SearchFilterModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.preservedFilters = action.payload.preservedFilters;
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
                // The catalogue it already holds is kept: emptying it would leave a settled
                // `hasLoadedFilters` beside no fields, which is what that flag exists to rule out.
                // `FilterWidget` reads its own loading state as
                // `isFetchingFilters && availableFilters.length === 0`, so it shows the fields it has
                // rather than blanking while a refetch is in flight.
                filter.isFetchingFilters = true;
            });
        },

        getAvailableFiltersSuccess: (state, action: PayloadAction<{ entity: EntityType; availableFilters: SearchFieldListModel[] }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.availableFilters = action.payload.availableFilters;
                filter.isFetchingFilters = false;
                filter.hasLoadedFilters = true;
            });
        },

        getAvailableFiltersFailure: (state, action: PayloadAction<{ entity: EntityType; error: string | undefined }>) => {
            updateFilterState(state, action.payload.entity, (filter) => {
                filter.isFetchingFilters = false;
                filter.hasLoadedFilters = true;
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

export const selectors = {
    state,

    availableFilters,
    currentFilters,
    preservedFilters,
    isFetchingFilters,
    hasLoadedFilters,
};

export const actions = slice.actions;

export default slice.reducer;
