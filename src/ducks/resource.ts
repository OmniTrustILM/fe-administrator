import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Resource } from 'types/openapi';
import type { ResourceEventModel, ResourceModel } from 'types/resource';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export type State = {
    resourcesList: ResourceModel[];
    allResourceEvents: ResourceEventModel[];
    resourceEvents: ResourceEventModel[];
    isFetchingResourcesList: boolean;
    isFetchingResourceEvents: boolean;
};

export const initialState: State = {
    resourcesList: [],
    allResourceEvents: [],
    resourceEvents: [],
    isFetchingResourcesList: false,
    isFetchingResourceEvents: false,
};

export const slice = createSlice({
    name: 'resource',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listResources: (state, action: PayloadAction<void>) => {
            state.isFetchingResourcesList = true;
        },

        listResourcesSuccess(state, action: PayloadAction<{ resourcesList: ResourceModel[] }>) {
            state.isFetchingResourcesList = false;
            state.resourcesList = action.payload.resourcesList;
        },

        listResourcesFailure(state, action: PayloadAction<{ error: string | undefined }>) {
            state.isFetchingResourcesList = false;
        },

        listAllResourceEvents: (state, action: PayloadAction<void>) => {
            state.isFetchingResourceEvents = true;
        },

        listAllResourceEventsSuccess(state, action: PayloadAction<{ mappedEvents?: { [key: string]: ResourceEventModel[] } }>) {
            state.isFetchingResourceEvents = false;
            const mappedEvents = action.payload.mappedEvents;
            if (!mappedEvents) return;
            state.allResourceEvents = Object.values(mappedEvents).flat();
        },

        listAllResourceEventsFailure(state, action: PayloadAction<{ error: string | undefined }>) {
            state.isFetchingResourceEvents = false;
        },

        listResourceEvents: (state, action: PayloadAction<{ resource: Resource }>) => {
            state.isFetchingResourceEvents = true;
        },

        listResourceEventsSuccess(state, action: PayloadAction<{ events: ResourceEventModel[] }>) {
            state.isFetchingResourceEvents = false;
            state.resourceEvents = action.payload.events;
        },

        listResourceEventsFailure(state, action: PayloadAction<{ error: string | undefined }>) {
            state.isFetchingResourceEvents = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const resourcesList = createSelector(state, (state) => state.resourcesList);
const resourcesWithComplianceProfiles = createSelector(resourcesList, (list) => list.filter((r) => r.hasComplianceProfiles === true));
const resourceEvents = createSelector(state, (state) => state.resourceEvents);
const allResourceEvents = createSelector(state, (state) => state.allResourceEvents);
const isFetchingResourcesList = createSelector(state, (state) => state.isFetchingResourcesList);
const isFetchingResourceEvents = createSelector(state, (state) => state.isFetchingResourceEvents);

export const selectors = {
    resourcesList,
    resourcesWithComplianceProfiles,
    resourceEvents,
    allResourceEvents,
    isFetchingResourcesList,
    isFetchingResourceEvents,
};

export const actions = slice.actions;

export default slice.reducer;
