import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Resource } from 'types/openapi';
import { attachCustomAttributesSync } from './customAttributesSync';
import type { CertificateListResponseDto, CertificateListResponseModel } from 'types/certificate';
import type { BulkActionModel } from 'types/connectors';
import type {
    ScepProfileAddRequestModel,
    ScepProfileEditRequestModel,
    ScepProfileListResponseModel,
    ScepProfileResponseModel,
} from 'types/scep-profiles';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    scepProfile?: ScepProfileResponseModel;
    scepProfiles: ScepProfileListResponseModel[];
    caCertificates?: CertificateListResponseModel[];

    isFetchingList: boolean;
    isFetchingCertificates: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createScepProfileSucceeded: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    updateScepProfileSucceeded: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isBulkDeleting: boolean;
    isBulkEnabling: boolean;
    isBulkDisabling: boolean;
    isBulkForceDeleting: boolean;
};

export const initialState: State = {
    checkedRows: [],

    scepProfiles: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    isFetchingList: false,
    isFetchingCertificates: false,
    isFetchingDetail: false,
    isCreating: false,
    createScepProfileSucceeded: false,
    isDeleting: false,
    isUpdating: false,
    updateScepProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkDeleting: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isBulkForceDeleting: false,
};

export const slice = createSlice({
    name: 'scepProfiles',

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

        listScepProfiles: (state, action: PayloadAction<void>) => {
            state.isFetchingList = true;
        },

        listScepProfilesSuccess: (state, action: PayloadAction<{ scepProfileList: ScepProfileListResponseModel[] }>) => {
            state.scepProfiles = action.payload.scepProfileList;
            state.isFetchingList = false;
        },

        listScepProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        listScepCaCertificates: (state, action: PayloadAction<boolean>) => {
            state.isFetchingCertificates = true;
        },

        listScepCaCertificatesSuccess: (state, action: PayloadAction<{ certificates: CertificateListResponseDto[] }>) => {
            state.caCertificates = action.payload.certificates;
            state.isFetchingCertificates = false;
        },

        listScepCaCertificatesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingCertificates = false;
        },

        getScepProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getScepProfileSuccess: (state, action: PayloadAction<{ scepProfile: ScepProfileResponseModel }>) => {
            state.isFetchingDetail = false;

            state.scepProfile = action.payload.scepProfile;

            const scepProfileIndex = state.scepProfiles.findIndex((scepProfile) => scepProfile.uuid === action.payload.scepProfile.uuid);

            if (scepProfileIndex >= 0) {
                state.scepProfiles[scepProfileIndex] = action.payload.scepProfile;
            } else {
                state.scepProfiles.push(action.payload.scepProfile);
            }
        },

        getScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createScepProfile: (state, action: PayloadAction<ScepProfileAddRequestModel>) => {
            state.isCreating = true;
            state.createScepProfileSucceeded = false;
        },

        createScepProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createScepProfileSucceeded = true;
        },

        createScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createScepProfileSucceeded = false;
        },

        updateScepProfile: (
            state,
            action: PayloadAction<{
                uuid: string;
                updateScepRequest: ScepProfileEditRequestModel;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateScepProfileSucceeded = false;
        },

        updateScepProfileSuccess: (state, action: PayloadAction<{ scepProfile: ScepProfileResponseModel }>) => {
            state.isUpdating = false;
            state.updateScepProfileSucceeded = true;

            const scepProfileIndex = state.scepProfiles.findIndex((scepProfile) => scepProfile.uuid === action.payload.scepProfile.uuid);

            if (scepProfileIndex >= 0) {
                state.scepProfiles[scepProfileIndex] = action.payload.scepProfile;
            } else {
                state.scepProfiles.push(action.payload.scepProfile);
            }

            if (state.scepProfile?.uuid === action.payload.scepProfile.uuid) state.scepProfile = action.payload.scepProfile;
        },

        updateScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateScepProfileSucceeded = false;
        },

        deleteScepProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteScepProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.scepProfiles.splice(profileIndex, 1);

            if (state.scepProfile?.uuid === action.payload.uuid) state.scepProfile = undefined;
        },

        deleteScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        enableScepProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableScepProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.scepProfiles[profileIndex].enabled = true;

            if (state.scepProfile?.uuid === action.payload.uuid) state.scepProfile.enabled = true;
        },

        enableScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableScepProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableScepProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === action.payload.uuid);

            if (profileIndex >= 0) state.scepProfiles[profileIndex].enabled = false;

            if (state.scepProfile?.uuid === action.payload.uuid) state.scepProfile.enabled = false;
        },

        disableScepProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        bulkDeleteScepProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];

            state.isBulkDeleting = true;
        },

        bulkDeleteScepProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionModel[] }>) => {
            state.isBulkDeleting = false;
            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.scepProfiles.splice(profileIndex, 1);
            });

            if (state.scepProfile && action.payload.uuids.includes(state.scepProfile.uuid)) state.scepProfile = undefined;
        },

        bulkDeleteScepProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkForceDeleteScepProfiles: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = true;
        },

        bulkForceDeleteScepProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; redirect?: string }>) => {
            state.isBulkForceDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.scepProfiles.splice(profileIndex, 1);
            });

            if (state.scepProfile && action.payload.uuids.includes(state.scepProfile.uuid)) state.scepProfile = undefined;
        },

        bulkForceDeleteScepProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkForceDeleting = false;
        },

        bulkEnableScepProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableScepProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.scepProfiles[profileIndex].enabled = true;
            });

            if (state.scepProfile && action.payload.uuids.includes(state.scepProfile.uuid)) state.scepProfile.enabled = true;
        },

        bulkEnableScepProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableScepProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableScepProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const profileIndex = state.scepProfiles.findIndex((profile) => profile.uuid === uuid);
                if (profileIndex >= 0) state.scepProfiles[profileIndex].enabled = false;
            });

            if (state.scepProfile && action.payload.uuids.includes(state.scepProfile.uuid)) state.scepProfile.enabled = false;
        },

        bulkDisableScepProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },
    },

    extraReducers: (builder) => {
        attachCustomAttributesSync(builder, Resource.ScepProfiles, (state) => state.scepProfile);
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name];

const scepProfile = createSelector(state, (state) => state.scepProfile);
const scepProfiles = createSelector(state, (state) => state.scepProfiles);
const caCertificates = createSelector(state, (state) => state.caCertificates);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const checkedRows = createSelector(state, (state) => state.checkedRows);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingCertificates = createSelector(state, (state) => state.isFetchingCertificates);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createScepProfileSucceeded = createSelector(state, (state) => state.createScepProfileSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateScepProfileSucceeded = createSelector(state, (state) => state.updateScepProfileSucceeded);
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

    scepProfile,
    scepProfiles,
    caCertificates,

    isFetchingList,
    isFetchingCertificates,
    isFetchingDetail,
    isCreating,
    createScepProfileSucceeded,
    isDeleting,
    isUpdating,
    updateScepProfileSucceeded,
    isEnabling,
    isDisabling,
    isBulkDeleting,
    isBulkEnabling,
    isBulkDisabling,
    isBulkForceDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
