import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    ProfileApprovalDetailModel,
    ProfileApprovalModel,
    ProfileApprovalRequestModel,
    ProfileApprovalResponseModel,
} from 'types/approval-profiles';
import type { Resource, UuidDto } from 'types/openapi';

export type State = {
    profileApprovalDetail?: ProfileApprovalDetailModel;
    profileApprovalList: ProfileApprovalModel[];
    associatedApprovalProfiles: ProfileApprovalModel[];
    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingAssociatedApprovalProfiles: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isAssociatingApprovalProfile: boolean;
    isDissociatingApprovalProfile: boolean;
    isCreating: boolean;
    createApprovalProfileSucceeded: boolean;
    updateApprovalProfileSucceeded: boolean;
    deleteErrorMessage: string;
    totalItems?: number;
};

export const initialState: State = {
    profileApprovalDetail: undefined,
    isUpdating: false,
    profileApprovalList: [],
    associatedApprovalProfiles: [],
    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingAssociatedApprovalProfiles: false,
    isDeleting: false,
    isAssociatingApprovalProfile: false,
    isDissociatingApprovalProfile: false,
    isCreating: false,
    createApprovalProfileSucceeded: false,
    updateApprovalProfileSucceeded: false,
    deleteErrorMessage: '',
    totalItems: undefined,
};

export const slice = createSlice({
    name: 'approvalProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        createApprovalProfile: (state, action: PayloadAction<ProfileApprovalRequestModel>) => {
            state.profileApprovalDetail = undefined;
            state.isCreating = true;
            state.createApprovalProfileSucceeded = false;
        },

        createApprovalProfileSuccess: (state, action: PayloadAction<UuidDto>) => {
            state.isCreating = false;
            state.createApprovalProfileSucceeded = true;
        },

        createApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.profileApprovalDetail = undefined;
            state.isCreating = false;
            state.createApprovalProfileSucceeded = false;
        },

        getApprovalProfile: (state, action: PayloadAction<{ uuid: string; version?: number }>) => {
            if (
                state.profileApprovalDetail?.uuid !== action.payload.uuid ||
                (action.payload.version !== undefined && state.profileApprovalDetail?.version !== action.payload.version)
            ) {
                state.profileApprovalDetail = undefined;
            }
            state.isFetchingDetail = true;
        },

        getApprovalProfileSuccess: (state, action: PayloadAction<ProfileApprovalDetailModel>) => {
            state.profileApprovalDetail = action.payload;
            state.isFetchingDetail = false;
        },

        getApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.profileApprovalDetail = undefined;
            state.isFetchingDetail = false;
        },

        listApprovalProfiles: (state, action: PayloadAction<{ itemsPerPage: number; pageNumber: number } | undefined>) => {
            state.profileApprovalList = [];
            state.isFetchingList = true;
        },

        listApprovalProfilesSuccess: (state, action: PayloadAction<ProfileApprovalResponseModel>) => {
            state.profileApprovalList = action.payload?.approvalProfiles || [];
            state.totalItems = action.payload?.totalItems || 0;
            state.isFetchingList = false;
        },

        listApprovalProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.profileApprovalList = [];
            state.isFetchingList = false;
        },

        getAssociatedApprovalProfilesForResource: (state, action: PayloadAction<{ resource: Resource; associationObjectUuid: string }>) => {
            state.associatedApprovalProfiles = [];
            state.isFetchingAssociatedApprovalProfiles = true;
        },

        getAssociatedApprovalProfilesForResourceSuccess: (state, action: PayloadAction<{ approvalProfiles: ProfileApprovalModel[] }>) => {
            state.associatedApprovalProfiles = action.payload.approvalProfiles;
            state.isFetchingAssociatedApprovalProfiles = false;
        },

        getAssociatedApprovalProfilesForResourceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.associatedApprovalProfiles = [];
            state.isFetchingAssociatedApprovalProfiles = false;
        },

        associateApprovalProfileToResource: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isAssociatingApprovalProfile = true;
        },

        associateApprovalProfileToResourceSuccess: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isAssociatingApprovalProfile = false;
        },

        associateApprovalProfileToResourceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isAssociatingApprovalProfile = false;
        },

        dissociateApprovalProfileFromResource: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isDissociatingApprovalProfile = true;
        },

        dissociateApprovalProfileFromResourceSuccess: (
            state,
            action: PayloadAction<{ uuid: string; resource: Resource; associationObjectUuid: string }>,
        ) => {
            state.isDissociatingApprovalProfile = false;
            state.associatedApprovalProfiles = state.associatedApprovalProfiles.filter((profile) => profile.uuid !== action.payload.uuid);
        },

        dissociateApprovalProfileFromResourceFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDissociatingApprovalProfile = false;
        },

        deleteApprovalProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteApprovalProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const profileIndex = state.profileApprovalList.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.profileApprovalList.splice(profileIndex, 1);

            if (state.profileApprovalDetail?.uuid === action.payload.uuid) state.profileApprovalDetail = undefined;
        },

        deleteApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        editApprovalProfile: (state, action: PayloadAction<{ uuid: string; editProfileApproval: ProfileApprovalRequestModel }>) => {
            state.profileApprovalDetail = undefined;
            state.isUpdating = true;
            state.updateApprovalProfileSucceeded = false;
        },
        editApprovalProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdating = false;
            state.updateApprovalProfileSucceeded = true;
        },
        editApprovalProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateApprovalProfileSucceeded = false;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const profileApprovalDetail = createSelector(state, (state) => state.profileApprovalDetail);
const profileApprovalList = createSelector(state, (state) => state.profileApprovalList);
const associatedApprovalProfiles = createSelector(state, (state) => state.associatedApprovalProfiles);
const isCreating = createSelector(state, (state) => state.isCreating);
const createApprovalProfileSucceeded = createSelector(state, (state) => state.createApprovalProfileSucceeded);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingAssociatedApprovalProfiles = createSelector(state, (state) => state.isFetchingAssociatedApprovalProfiles);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const totalItems = createSelector(state, (state) => state.totalItems);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateApprovalProfileSucceeded = createSelector(state, (state) => state.updateApprovalProfileSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isAssociatingApprovalProfile = createSelector(state, (state) => state.isAssociatingApprovalProfile);
const isDissociatingApprovalProfile = createSelector(state, (state) => state.isDissociatingApprovalProfile);

export const selectors = {
    state,
    profileApprovalDetail,
    profileApprovalList,
    associatedApprovalProfiles,
    isCreating,
    createApprovalProfileSucceeded,
    isFetchingDetail,
    isFetchingAssociatedApprovalProfiles,
    deleteErrorMessage,
    totalItems,
    isUpdating,
    updateApprovalProfileSucceeded,
    isDeleting,
    isAssociatingApprovalProfile,
    isDissociatingApprovalProfile,
    isFetchingList,
};

export const actions = slice.actions;

export default slice.reducer;
