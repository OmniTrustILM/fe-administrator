import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { AuthResourceModel, UserDetailModel, UserProfileDetailModel, UserUpdateRequestModel } from 'types/auth';
import type { NameAndUuidModel } from 'types/locations';
import type { Resource } from 'types/openapi';

export type State = {
    profile?: UserProfileDetailModel;
    resources?: AuthResourceModel[];
    objects?: NameAndUuidModel[];

    isFetchingProfile: boolean;
    isUpdatingProfile: boolean;
    isFetchingResources: boolean;
    isFetchingObjects: boolean;
};

export const initialState: State = {
    isFetchingProfile: false,
    isUpdatingProfile: false,
    isFetchingResources: false,
    isFetchingObjects: false,
};

export const slice = createSlice({
    name: 'auth',

    initialState,

    reducers: {
        clearResources: (state, action: PayloadAction<void>) => {
            state.resources = undefined;
        },

        getProfile(state, action: PayloadAction<void>) {
            state.isFetchingProfile = true;
        },

        getProfileSuccess(state, action: PayloadAction<{ profile: UserProfileDetailModel }>) {
            state.isFetchingProfile = false;
            state.profile = action.payload.profile;
        },

        getProfileFailure(state, action: PayloadAction<void>) {
            state.isFetchingProfile = false;
        },

        resetProfile(state, action: PayloadAction<void>) {
            state.profile = undefined;
        },

        updateProfile(state, action: PayloadAction<{ profile: UserUpdateRequestModel; redirect?: string }>) {
            state.isUpdatingProfile = true;
        },

        updateProfileSuccess(state, action: PayloadAction<{ profile: UserDetailModel; redirect?: string }>) {
            state.isUpdatingProfile = false;
            state.profile = {
                ...state.profile!,
                ...action.payload.profile,
            };
        },

        updateProfileFailure(state, action: PayloadAction<void>) {
            state.isUpdatingProfile = false;
        },

        getAuthResources(state, action: PayloadAction<void>) {
            state.isFetchingResources = true;
            state.resources = undefined;
        },

        getAuthResourcesSuccess(state, action: PayloadAction<{ resources: AuthResourceModel[] }>) {
            state.isFetchingResources = false;
            state.resources = action.payload.resources;
        },

        getAuthResourcesFailure(state, action: PayloadAction<void>) {
            state.isFetchingResources = false;
        },

        getObjectsForResource(state, action: PayloadAction<{ resource: Resource }>) {
            state.objects = undefined;
            state.isFetchingObjects = true;
        },

        getObjectsForResourceSuccess(state, action: PayloadAction<{ objects: NameAndUuidModel[] }>) {
            state.isFetchingObjects = false;
            state.objects = action.payload.objects;
        },

        getObjectsForResourceFailure(state, action: PayloadAction<void>) {
            state.isFetchingObjects = false;
        },
    },
});

const selectState = (reduxStore: AppState): State => reduxStore?.[slice.name];

const profile = createSelector(selectState, (state) => state.profile);
const resources = createSelector(selectState, (state) => state.resources);
const objects = createSelector(selectState, (state) => state.objects);

const isFetchingProfile = createSelector(selectState, (state) => state.isFetchingProfile);
const isUpdatingProfile = createSelector(selectState, (state) => state.isUpdatingProfile);
const isFetchingResources = createSelector(selectState, (state) => state.isFetchingResources);
const isFetchingObjects = createSelector(selectState, (state) => state.isFetchingObjects);

export const selectors = {
    selectState,
    profile,
    resources,
    objects,
    isFetchingProfile,
    isUpdatingProfile,
    isFetchingResources,
    isFetchingObjects,
};

export const actions = slice.actions;

export default slice.reducer;
