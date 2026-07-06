import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import type { SearchRequestModel } from 'types/certificate';
import type {
    NotificationProfileDetailModel,
    NotificationProfileModel,
    NotificationProfileRequestModel,
    NotificationProfileUpdateRequestModel,
} from 'types/notification-profiles';

export type State = {
    notificationProfile?: NotificationProfileDetailModel;
    notificationProfiles: NotificationProfileModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createNotificationProfileSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateNotificationProfileSucceeded: boolean;
};

export const initialState: State = {
    notificationProfiles: [],
    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createNotificationProfileSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateNotificationProfileSucceeded: false,
};

export const slice = createSlice({
    name: 'notificationProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listNotificationProfiles: (state, action: PayloadAction<SearchRequestModel>) => {
            state.notificationProfiles = [];
            state.isFetchingList = true;
        },

        listNotificationProfilesSuccess: (state, action: PayloadAction<{ notificationProfiles: NotificationProfileModel[] }>) => {
            state.notificationProfiles = action.payload.notificationProfiles;
            state.isFetchingList = false;
        },

        listNotificationProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getNotificationProfileDetail: (state, action: PayloadAction<{ uuid: string; version: number }>) => {
            if (state.notificationProfile?.uuid !== action.payload.uuid || state.notificationProfile?.version !== action.payload.version) {
                state.notificationProfile = undefined;
            }
            state.isFetchingDetail = true;
        },

        getNotificationProfileDetailSuccess: (state, action: PayloadAction<{ notificationProfile: NotificationProfileDetailModel }>) => {
            state.isFetchingDetail = false;
            state.notificationProfile = action.payload.notificationProfile;
        },

        getNotificationProfileDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createNotificationProfile: (
            state,
            action: PayloadAction<{
                notificationProfileAddRequest: NotificationProfileRequestModel;
            }>,
        ) => {
            state.isCreating = true;
            state.createNotificationProfileSucceeded = false;
        },

        createNotificationProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createNotificationProfileSucceeded = true;
        },

        createNotificationProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createNotificationProfileSucceeded = false;
        },

        updateNotificationProfile: (
            state,
            action: PayloadAction<{
                uuid: string;
                notificationProfileEditRequest: NotificationProfileUpdateRequestModel;
                redirect?: string;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateNotificationProfileSucceeded = false;
        },

        updateNotificationProfileSuccess: (
            state,
            action: PayloadAction<{ notificationProfile: NotificationProfileDetailModel; redirect?: string }>,
        ) => {
            state.isUpdating = false;
            state.updateNotificationProfileSucceeded = true;
            state.notificationProfile = action.payload.notificationProfile;
        },

        updateNotificationProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateNotificationProfileSucceeded = false;
        },

        deleteNotificationProfile: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteNotificationProfileSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = false;

            const index = state.notificationProfiles.findIndex((raProfile) => raProfile.uuid === action.payload.uuid);
            if (index !== -1) state.notificationProfiles.splice(index, 1);

            if (state.notificationProfile?.uuid === action.payload.uuid) state.notificationProfile = undefined;
        },

        deleteNotificationProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const notificationProfile = createSelector(state, (state: State) => state.notificationProfile);
const notificationProfiles = createSelector(state, (state: State) => state.notificationProfiles);
const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const createNotificationProfileSucceeded = createSelector(state, (state: State) => state.createNotificationProfileSucceeded);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const updateNotificationProfileSucceeded = createSelector(state, (state: State) => state.updateNotificationProfileSucceeded);

export const selectors = {
    state,

    notificationProfile,
    notificationProfiles,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createNotificationProfileSucceeded,
    isDeleting,
    isUpdating,
    updateNotificationProfileSucceeded,
};

export const actions = slice.actions;

export default slice.reducer;
