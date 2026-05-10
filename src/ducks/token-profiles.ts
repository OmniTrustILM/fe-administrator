import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BulkActionModel } from 'types/connectors';
import type { KeyUsage } from 'types/openapi';
import type {
    TokenProfileAddRequestModel,
    TokenProfileDetailResponseModel,
    TokenProfileEditRequestModel,
    TokenProfileKeyUsageBulkUpdateRequestModel,
    TokenProfileKeyUsageUpdateRequestModel,
    TokenProfileResponseModel,
} from 'types/token-profiles';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    tokenProfile?: TokenProfileDetailResponseModel;
    tokenProfiles: TokenProfileResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingAttributes: boolean;
    isUpdatingKeyUsage: boolean;
    isBulkUpdatingKeyUsage: boolean;

    isCreating: boolean;
    createTokenProfileSucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
    updateTokenProfileSucceeded: boolean;
    isEnabling: boolean;
    isBulkEnabling: boolean;
    isDisabling: boolean;
    isBulkDisabling: boolean;
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    tokenProfiles: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingAttributes: false,
    isUpdatingKeyUsage: false,
    isBulkUpdatingKeyUsage: false,
    isCreating: false,
    createTokenProfileSucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
    updateTokenProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
};

export const slice = createSlice({
    name: 'tokenprofiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });

            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        listTokenProfiles: (state, action: PayloadAction<{ enabled?: boolean }>) => {
            state.tokenProfiles = [];
            state.isFetchingList = true;
        },

        listTokenProfilesSuccess: (state, action: PayloadAction<{ tokenProfiles: TokenProfileResponseModel[] }>) => {
            state.tokenProfiles = action.payload.tokenProfiles;
            state.isFetchingList = false;
        },

        listTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getTokenProfileDetail: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string }>) => {
            state.tokenProfile = undefined;
            state.isFetchingDetail = true;
        },

        getTokenProfileDetailSuccess: (state, action: PayloadAction<{ tokenProfile: TokenProfileDetailResponseModel }>) => {
            state.isFetchingDetail = false;
            state.tokenProfile = action.payload.tokenProfile;
        },

        getTokenProfileDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createTokenProfile: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileAddRequest: TokenProfileAddRequestModel;
                usesGlobalModal: boolean;
            }>,
        ) => {
            state.isCreating = true;
            state.createTokenProfileSucceeded = false;
        },

        createTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string; tokenInstanceUuid: string }>) => {
            state.isCreating = false;
            state.createTokenProfileSucceeded = true;
        },

        createTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createTokenProfileSucceeded = false;
        },

        updateTokenProfile: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                tokenInstanceUuid: string;
                tokenProfileEditRequest: TokenProfileEditRequestModel;
                redirect?: string;
                usesGlobalModal?: boolean;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateTokenProfileSucceeded = false;
        },

        updateTokenProfileSuccess: (state, action: PayloadAction<{ tokenProfile: TokenProfileDetailResponseModel; redirect?: string }>) => {
            state.isUpdating = false;
            state.updateTokenProfileSucceeded = true;
            state.tokenProfile = action.payload.tokenProfile;
        },

        updateTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateTokenProfileSucceeded = false;
        },

        enableTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string }>) => {
            state.isEnabling = true;
        },

        enableTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const tokenProfile = state.tokenProfiles.find((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (tokenProfile) tokenProfile.enabled = true;

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile.enabled = true;
        },

        enableTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string }>) => {
            state.isDisabling = true;
        },

        disableTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const tokenProfile = state.tokenProfiles.find((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (tokenProfile) tokenProfile.enabled = false;

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile.enabled = false;
        },

        disableTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        deleteTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = false;

            const index = state.tokenProfiles.findIndex((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (index !== -1) state.tokenProfiles.splice(index, 1);

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile = undefined;
        },

        deleteTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDeleteTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.tokenProfiles.findIndex((tokenProfile) => tokenProfile.uuid === uuid);
                if (index >= 0) state.tokenProfiles.splice(index, 1);
            });

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile = undefined;
        },

        bulkDeleteTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            state.tokenProfiles = state.tokenProfiles.map((tokenProfile) => ({
                ...tokenProfile,
                enabled: action.payload.uuids.includes(tokenProfile.uuid) ? true : tokenProfile.enabled,
            }));

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile.enabled = true;
        },

        bulkEnableTokenProfilesFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            state.tokenProfiles = state.tokenProfiles.map((tokenProfile) => ({
                ...tokenProfile,
                enabled: action.payload.uuids.includes(tokenProfile.uuid) ? false : tokenProfile.enabled,
            }));

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile.enabled = false;
        },

        bulkDisableTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },

        updateKeyUsage: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; uuid: string; usage: TokenProfileKeyUsageUpdateRequestModel }>,
        ) => {
            state.isUpdatingKeyUsage = true;
        },

        updateKeyUsageSuccess: (state, action: PayloadAction<{ uuid: string; usage: Array<KeyUsage> }>) => {
            state.isUpdatingKeyUsage = false;

            state.tokenProfile!.usages = action.payload.usage;
        },

        updateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsage: (state, action: PayloadAction<{ usage: TokenProfileKeyUsageBulkUpdateRequestModel }>) => {
            state.isBulkUpdatingKeyUsage = true;
        },

        bulkUpdateKeyUsageSuccess: (state, action: PayloadAction<Record<string, never>>) => {
            state.isBulkUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingKeyUsage = false;
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state: State) => state.checkedRows);

const tokenProfile = createSelector(state, (state: State) => state.tokenProfile);
const tokenProfiles = createSelector(state, (state: State) => state.tokenProfiles);

const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const isFetchingAttributes = createSelector(state, (state: State) => state.isFetchingAttributes);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const createTokenProfileSucceeded = createSelector(state, (state: State) => state.createTokenProfileSucceeded);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state: State) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const updateTokenProfileSucceeded = createSelector(state, (state: State) => state.updateTokenProfileSucceeded);
const isEnabling = createSelector(state, (state: State) => state.isEnabling);
const isBulkEnabling = createSelector(state, (state: State) => state.isBulkEnabling);
const isDisabling = createSelector(state, (state: State) => state.isDisabling);
const isBulkDisabling = createSelector(state, (state: State) => state.isBulkDisabling);
const isUpdatingKeyUsage = createSelector(state, (state: State) => state.isUpdatingKeyUsage);
const isBulkUpdatingKeyUsage = createSelector(state, (state: State) => state.isBulkUpdatingKeyUsage);

export const selectors = {
    state,

    checkedRows,

    tokenProfile,
    tokenProfiles,

    isFetchingList,
    isFetchingDetail,
    isFetchingAttributes,
    isCreating,
    createTokenProfileSucceeded,
    isDeleting,
    isBulkDeleting,
    isUpdating,
    updateTokenProfileSucceeded,
    isEnabling,
    isBulkEnabling,
    isDisabling,
    isBulkDisabling,
    isUpdatingKeyUsage,
    isBulkUpdatingKeyUsage,
};

export const actions = slice.actions;

export default slice.reducer;
