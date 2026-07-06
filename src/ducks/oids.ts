import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SearchRequestModel } from 'types/certificate';
import type { OidCategory } from 'types/openapi';
import type { OIDRequestModel, OIDResponseModel, OIDUpdateRequestModel } from 'types/oids';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    oid?: OIDResponseModel;
    oids: OIDResponseModel[];
    oidsByCategory: Partial<Record<OidCategory, OIDResponseModel[]>>;
    oidsByCategoryError: Partial<Record<OidCategory, boolean>>;
    oidsByCategoryLoaded: Partial<Record<OidCategory, boolean>>;

    systemOids: OIDResponseModel[];
    systemOidsLoaded: boolean;
    systemOidsError: boolean;

    isFetching: boolean;
    isCreating: boolean;
    createOidSucceeded: boolean;
    isUpdating: boolean;
    updateOidSucceeded: boolean;
    isDeleting: boolean;
};

export const initialState: State = {
    oids: [],
    oidsByCategory: {},
    oidsByCategoryError: {},
    oidsByCategoryLoaded: {},

    systemOids: [],
    systemOidsLoaded: false,
    systemOidsError: false,

    isFetching: false,
    isCreating: false,
    createOidSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateOidSucceeded: false,
};

export const slice = createSlice({
    name: 'oids',
    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listOIDs: (state, action: PayloadAction<SearchRequestModel>) => {
            state.isFetching = true;
            state.oids = [];
        },

        listOIDsSuccess: (state, action: PayloadAction<{ oids: OIDResponseModel[] }>) => {
            state.isFetching = false;
            state.oids = action.payload.oids;
        },

        listOIDsFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isFetching = false;
        },

        listOidsByCategory: (state, action: PayloadAction<{ category: OidCategory }>) => {
            state.oidsByCategoryError[action.payload.category] = false;
            state.oidsByCategoryLoaded[action.payload.category] = false;
        },

        listOidsByCategorySuccess: (state, action: PayloadAction<{ category: OidCategory; oids: OIDResponseModel[] }>) => {
            state.oidsByCategory[action.payload.category] = action.payload.oids;
            state.oidsByCategoryError[action.payload.category] = false;
            state.oidsByCategoryLoaded[action.payload.category] = true;
        },

        listOidsByCategoryFailure: (state, action: PayloadAction<{ category: OidCategory; error: string }>) => {
            state.oidsByCategoryError[action.payload.category] = true;
            state.oidsByCategoryLoaded[action.payload.category] = true;
        },

        // The system (built-in) OID list is immutable per release, so it is fetched once and cached.
        // The request only clears a prior error — it keeps the cached list and its loaded flag so a
        // repeat dispatch (e.g. a consumer remount) stays a cache hit that the epic skips.
        listSystemOids: (state, action: PayloadAction<void>) => {
            state.systemOidsError = false;
        },

        listSystemOidsSuccess: (state, action: PayloadAction<{ oids: OIDResponseModel[] }>) => {
            state.systemOids = action.payload.oids;
            state.systemOidsLoaded = true;
            state.systemOidsError = false;
        },

        // Leave loaded false so a later mount retries the fetch; the error flag drives the load-failure hint.
        listSystemOidsFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.systemOidsLoaded = false;
            state.systemOidsError = true;
        },

        getOID: (state, action: PayloadAction<{ oid: string }>) => {
            state.isFetching = true;
        },

        getOIDSuccess: (state, action: PayloadAction<{ oid: OIDResponseModel }>) => {
            state.isFetching = false;
            state.oid = action.payload.oid;
        },

        getOIDFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isFetching = false;
        },

        createOID: (state, action: PayloadAction<{ oid: OIDRequestModel }>) => {
            state.isCreating = true;
            state.createOidSucceeded = false;
        },

        createOIDSuccess: (state, action: PayloadAction<{ oid: OIDResponseModel }>) => {
            state.isCreating = false;
            state.createOidSucceeded = true;
            state.oid = action.payload.oid;
        },

        createOIDFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isCreating = false;
            state.createOidSucceeded = false;
        },

        updateOID: (state, action: PayloadAction<{ oid: string; data: OIDUpdateRequestModel }>) => {
            state.isUpdating = true;
            state.updateOidSucceeded = false;
        },

        updateOIDSuccess: (state, action: PayloadAction<{ oid: OIDResponseModel }>) => {
            state.isUpdating = false;
            state.updateOidSucceeded = true;
            state.oid = action.payload.oid;
        },

        updateOIDFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isUpdating = false;
            state.updateOidSucceeded = false;
        },

        deleteOID: (state, action: PayloadAction<{ oid: string }>) => {
            state.isDeleting = true;
        },

        deleteOIDSuccess: (state, action: PayloadAction<{ oid: string }>) => {
            state.isDeleting = false;

            // Remove deleted OID from the state
            const index = state.oids.findIndex((oid) => oid.oid === action.payload.oid);
            if (index !== -1) state.oids.splice(index, 1);
        },

        deleteOIDFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isDeleting = false;
        },
        bulkDeleteOIDs: (state, action: PayloadAction<{ oids: string[] }>) => {
            state.isDeleting = true;
        },

        bulkDeleteOIDsSuccess: (state, action: PayloadAction<{ oids: string[] }>) => {
            state.isDeleting = false;

            // Remove deleted OIDs from the state
            action.payload.oids.forEach((deletedOid) => {
                const index = state.oids.findIndex((oid) => oid.oid === deletedOid);
                if (index !== -1) state.oids.splice(index, 1);
            });
        },

        bulkDeleteOIDsFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const oids = createSelector(state, (state) => state.oids);
const oidsByCategory = createSelector(state, (state) => state.oidsByCategory);
const oidsByCategoryError = createSelector(state, (state) => state.oidsByCategoryError);
const oidsByCategoryLoaded = createSelector(state, (state) => state.oidsByCategoryLoaded);
const oid = createSelector(state, (state) => state.oid);

const systemOids = createSelector(state, (state) => state.systemOids);
const systemOidsLoaded = createSelector(state, (state) => state.systemOidsLoaded);
const systemOidsError = createSelector(state, (state) => state.systemOidsError);
const systemOidsByCategory = createSelector(systemOids, (systemOids) =>
    systemOids.reduce<Partial<Record<OidCategory, OIDResponseModel[]>>>((acc, entry) => {
        (acc[entry.category] ??= []).push(entry);
        return acc;
    }, {}),
);

const isFetching = createSelector(state, (state) => state.isFetching);
const isCreating = createSelector(state, (state) => state.isCreating);
const createOidSucceeded = createSelector(state, (state) => state.createOidSucceeded);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateOidSucceeded = createSelector(state, (state) => state.updateOidSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);

export const selectors = {
    state,
    oids,
    oidsByCategory,
    oidsByCategoryError,
    oidsByCategoryLoaded,
    oid,

    systemOids,
    systemOidsLoaded,
    systemOidsError,
    systemOidsByCategory,

    isFetching,
    isCreating,
    createOidSucceeded,
    isUpdating,
    updateOidSucceeded,
    isDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
