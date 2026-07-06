import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import { Resource } from 'types/openapi';
import { attachCustomAttributesSync } from './customAttributesSync';
import type {
    AcmeProfileAddRequestModel,
    AcmeProfileEditRequestModel,
    AcmeProfileListResponseModel,
    AcmeProfileResponseModel,
} from 'types/acme-profiles';
import type { BulkActionModel } from 'types/connectors';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    acmeProfile?: AcmeProfileResponseModel;
    acmeProfiles: AcmeProfileListResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createAcmeProfileSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateAcmeProfileSucceeded: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isBulkDeleting: boolean;
    isBulkEnabling: boolean;
    isBulkDisabling: boolean;
    isBulkForceDeleting: boolean;
};

export const initialState: State = {
    checkedRows: [],

    acmeProfiles: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createAcmeProfileSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateAcmeProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkDeleting: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isBulkForceDeleting: false,
};

export const slice = createSlice({
    name: 'acmeProfiles',

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

        listAcmeProfiles: (state, action: PayloadAction<void>) => {
            state.isFetchingList = true;
        },

        listAcmeProfilesSuccess: (state, action: PayloadAction<{ acmeProfileList: AcmeProfileListResponseModel[] }>) => {
            state.acmeProfiles = action.payload.acmeProfileList;
            state.isFetchingList = false;
        },

        listAcmeProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getAcmeProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getAcmeProfileSuccess: (state, action: PayloadAction<{ acmeProfile: AcmeProfileResponseModel }>) => {
            state.isFetchingDetail = false;

            state.acmeProfile = action.payload.acmeProfile;

            const acmeProfileIndex = state.acmeProfiles.findIndex((acmeProfile) => acmeProfile.uuid === action.payload.acmeProfile.uuid);

            if (acmeProfileIndex >= 0) {
                state.acmeProfiles[acmeProfileIndex] = action.payload.acmeProfile;
            } else {
                state.acmeProfiles.push(action.payload.acmeProfile);
            }
        },

        getAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createAcmeProfile: (state, action: PayloadAction<AcmeProfileAddRequestModel>) => {
            state.isCreating = true;
            state.createAcmeProfileSucceeded = false;
        },

        createAcmeProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createAcmeProfileSucceeded = true;
        },

        createAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createAcmeProfileSucceeded = false;
        },

        updateAcmeProfile: (
            state,
            action: PayloadAction<{
                uuid: string;
                updateAcmeRequest: AcmeProfileEditRequestModel;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateAcmeProfileSucceeded = false;
        },

        updateAcmeProfileSuccess: (state, action: PayloadAction<{ acmeProfile: AcmeProfileResponseModel }>) => {
            state.isUpdating = false;
            state.updateAcmeProfileSucceeded = true;

            const acmeProfileIndex = state.acmeProfiles.findIndex((acmeProfile) => acmeProfile.uuid === action.payload.acmeProfile.uuid);

            if (acmeProfileIndex >= 0) {
                state.acmeProfiles[acmeProfileIndex] = action.payload.acmeProfile;
            } else {
                state.acmeProfiles.push(action.payload.acmeProfile);
            }

            if (state.acmeProfile?.uuid === action.payload.acmeProfile.uuid) state.acmeProfile = action.payload.acmeProfile;
        },

        updateAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateAcmeProfileSucceeded = false;
        },

        deleteAcmeProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteAcmeProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.acmeProfiles.splice(profileIndex, 1);

            if (state.acmeProfile?.uuid === action.payload.uuid) state.acmeProfile = undefined;
        },

        deleteAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        enableAcmeProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableAcmeProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.acmeProfiles[profileIndex].enabled = true;

            if (state.acmeProfile?.uuid === action.payload.uuid) state.acmeProfile.enabled = true;
        },

        enableAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableAcmeProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableAcmeProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.acmeProfiles[profileIndex].enabled = false;

            if (state.acmeProfile?.uuid === action.payload.uuid) state.acmeProfile.enabled = false;
        },

        disableAcmeProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        bulkDeleteAcmeProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];

            state.isBulkDeleting = true;
        },

        bulkDeleteAcmeProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;
            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.acmeProfiles.splice(profileIndex, 1);
            });

            if (state.acmeProfile && action.payload.uuids.includes(state.acmeProfile.uuid)) state.acmeProfile = undefined;
        },

        bulkDeleteAcmeProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkForceDeleteAcmeProfiles: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteAcmeProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.acmeProfiles.splice(profileIndex, 1);
            });

            if (state.acmeProfile && action.payload.uuids.includes(state.acmeProfile.uuid)) state.acmeProfile = undefined;
        },

        bulkForceDeleteAcmeProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkForceDeleting = false;
        },

        bulkEnableAcmeProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableAcmeProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.acmeProfiles[profileIndex].enabled = true;
            });

            if (state.acmeProfile && action.payload.uuids.includes(state.acmeProfile.uuid)) state.acmeProfile.enabled = true;
        },

        bulkEnableAcmeProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableAcmeProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableAcmeProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.acmeProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.acmeProfiles[profileIndex].enabled = false;
            });

            if (state.acmeProfile && action.payload.uuids.includes(state.acmeProfile.uuid)) state.acmeProfile.enabled = false;
        },

        bulkDisableAcmeProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },
    },

    extraReducers: (builder) => {
        attachCustomAttributesSync(builder, Resource.AcmeProfiles, (state) => state.acmeProfile);
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const acmeProfile = createSelector(state, (state) => state.acmeProfile);
const acmeProfiles = createSelector(state, (state) => state.acmeProfiles);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const checkedRows = createSelector(state, (state) => state.checkedRows);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createAcmeProfileSucceeded = createSelector(state, (state) => state.createAcmeProfileSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateAcmeProfileSucceeded = createSelector(state, (state) => state.updateAcmeProfileSucceeded);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkEnabling = createSelector(state, (state) => state.isBulkEnabling);
const isBulkDisabling = createSelector(state, (state) => state.isBulkDisabling);
const isBulkForceDeleting = createSelector(state, (state) => state.isBulkForceDeleting);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,
    bulkDeleteErrorMessages,

    acmeProfile,
    acmeProfiles,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createAcmeProfileSucceeded,
    isDeleting,
    isUpdating,
    updateAcmeProfileSucceeded,
    isEnabling,
    isDisabling,
    isBulkDeleting,
    isBulkEnabling,
    isBulkDisabling,
    isBulkForceDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
