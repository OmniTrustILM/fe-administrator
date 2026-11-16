import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import { Resource } from 'types/openapi';
import type { BulkActionModel } from 'types/connectors';
import { attachCustomAttributesSync } from './customAttributesSync';

import type { EstProfileDetailModel, EstProfileEditRequestModel, EstProfileModel, EstProfileRequestModel } from 'types/est-profiles';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    estProfile?: EstProfileDetailModel;
    estProfiles: EstProfileModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createEstProfileSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateEstProfileSucceeded: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isBulkDeleting: boolean;
    isUpdatingRaProfile: boolean;
    isBulkEnabling: boolean;
    isBulkDisabling: boolean;
    isBulkForceDeleting: boolean;
};

export const initialState: State = {
    checkedRows: [],

    estProfiles: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createEstProfileSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateEstProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkDeleting: false,
    isUpdatingRaProfile: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isBulkForceDeleting: false,
};

export const slice = createSlice({
    name: 'estProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        resetEstProfile: (state, action: PayloadAction<void>) => {
            state.estProfile = undefined;
        },

        listEstProfiles: (state, action: PayloadAction<void>) => {
            state.isFetchingList = true;
        },

        listEstProfilesSuccess: (state, action: PayloadAction<{ estProfileList: EstProfileModel[] }>) => {
            state.estProfiles = action.payload.estProfileList;
            state.isFetchingList = false;
        },

        listEstProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getEstProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getEstProfileSuccess: (state, action: PayloadAction<{ estProfile: EstProfileDetailModel }>) => {
            state.isFetchingDetail = false;

            state.estProfile = action.payload.estProfile;
        },

        getEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createEstProfile: (state, action: PayloadAction<EstProfileRequestModel>) => {
            state.isCreating = true;
            state.createEstProfileSucceeded = false;
        },

        createEstProfileSuccess: (state, action: PayloadAction<void>) => {
            state.isCreating = false;
            state.createEstProfileSucceeded = true;
        },

        createEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createEstProfileSucceeded = false;
        },

        updateEstProfile: (
            state,
            action: PayloadAction<{
                uuid: string;
                updateEstRequest: EstProfileEditRequestModel;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateEstProfileSucceeded = false;
        },

        updateEstProfileSuccess: (state, action: PayloadAction<{ estProfile: EstProfileDetailModel }>) => {
            state.isUpdating = false;
            state.updateEstProfileSucceeded = true;
        },

        updateEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateEstProfileSucceeded = false;
        },

        updateEstProfileRaProfile: (state, action: PayloadAction<{ uuid: string; raProfileUuid: string }>) => {
            state.isUpdatingRaProfile = true;
        },

        updateEstProfileRaProfileSuccess: (state, action: PayloadAction<{ uuid: string; raProfileUuid: string }>) => {
            state.isUpdatingRaProfile = false;
        },

        updateEstProfileRaProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRaProfile = false;
        },

        deleteEstProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteEstProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.estProfiles.splice(profileIndex, 1);

            if (state.estProfile?.uuid === action.payload.uuid) state.estProfile = undefined;
        },

        deleteEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        enableEstProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableEstProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.estProfiles[profileIndex].enabled = true;

            if (state.estProfile?.uuid === action.payload.uuid) state.estProfile.enabled = true;
        },

        enableEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableEstProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableEstProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.estProfiles[profileIndex].enabled = false;

            if (state.estProfile?.uuid === action.payload.uuid) state.estProfile.enabled = false;
        },

        disableEstProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        bulkDeleteEstProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];

            state.isBulkDeleting = true;
        },

        bulkDeleteEstProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;
            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.estProfiles.splice(profileIndex, 1);
            });

            if (state.estProfile && action.payload.uuids.includes(state.estProfile.uuid)) state.estProfile = undefined;
        },

        bulkDeleteEstProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkForceDeleteEstProfiles: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteEstProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.estProfiles.splice(profileIndex, 1);
            });

            if (state.estProfile && action.payload.uuids.includes(state.estProfile.uuid)) state.estProfile = undefined;
        },

        bulkForceDeleteEstProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkForceDeleting = false;
        },

        bulkEnableEstProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableEstProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.estProfiles[profileIndex].enabled = true;
            });

            if (state.estProfile && action.payload.uuids.includes(state.estProfile.uuid)) state.estProfile.enabled = true;
        },

        bulkEnableEstProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableEstProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableEstProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.estProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.estProfiles[profileIndex].enabled = false;
            });

            if (state.estProfile && action.payload.uuids.includes(state.estProfile.uuid)) state.estProfile.enabled = false;
        },

        bulkDisableEstProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },
    },

    extraReducers: (builder) => {
        attachCustomAttributesSync(builder, Resource.EstProfiles, (state) => state.estProfile);
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const estProfile = createSelector(state, (state) => state.estProfile);
const estProfiles = createSelector(state, (state) => state.estProfiles);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const checkedRows = createSelector(state, (state) => state.checkedRows);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createEstProfileSucceeded = createSelector(state, (state) => state.createEstProfileSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateEstProfileSucceeded = createSelector(state, (state) => state.updateEstProfileSucceeded);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isUpdatingRaProfile = createSelector(state, (state) => state.isUpdatingRaProfile);
const isBulkEnabling = createSelector(state, (state) => state.isBulkEnabling);
const isBulkDisabling = createSelector(state, (state) => state.isBulkDisabling);
const isBulkForceDeleting = createSelector(state, (state) => state.isBulkForceDeleting);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,
    bulkDeleteErrorMessages,

    estProfile,
    estProfiles,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createEstProfileSucceeded,
    isDeleting,
    isUpdating,
    updateEstProfileSucceeded,
    isEnabling,
    isDisabling,
    isBulkDeleting,
    isUpdatingRaProfile,
    isBulkEnabling,
    isBulkDisabling,
    isBulkForceDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
