import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SearchFieldDataByGroupDto, TspProfileDto, TspProfileListDto, TspProfileRequestDto } from 'types/openapi';
import type { BulkActionMessageDto } from 'types/openapi/models/BulkActionMessageDto';
import type { SearchRequestModel } from 'types/certificate';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionMessageDto[];

    tspProfile?: TspProfileDto;
    tspProfiles: TspProfileListDto[];

    searchableFields?: SearchFieldDataByGroupDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingSearchableFields: boolean;
    isCreating: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
    isBulkDeleting: boolean;
    isBulkEnabling: boolean;
    isBulkDisabling: boolean;
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    tspProfiles: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingSearchableFields: false,
    isCreating: false,
    isDeleting: false,
    isUpdating: false,
    isEnabling: false,
    isDisabling: false,
    isBulkDeleting: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
};

export const slice = createSlice({
    name: 'tspProfiles',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        listTspProfiles: (state, action: PayloadAction<SearchRequestModel | undefined>) => {
            state.isFetchingList = true;
        },

        listTspProfilesSuccess: (state, action: PayloadAction<{ tspProfiles: TspProfileListDto[] }>) => {
            state.isFetchingList = false;
            state.tspProfiles = action.payload.tspProfiles;
        },

        listTspProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getTspProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getTspProfileSuccess: (state, action: PayloadAction<{ tspProfile: TspProfileDto }>) => {
            state.isFetchingDetail = false;
            state.tspProfile = action.payload.tspProfile;

            const idx = state.tspProfiles.findIndex((c) => c.uuid === action.payload.tspProfile.uuid);
            if (idx >= 0) {
                state.tspProfiles[idx] = action.payload.tspProfile;
            }
        },

        getTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        listTspProfileSearchableFields: (state, action: PayloadAction<void>) => {
            state.isFetchingSearchableFields = true;
        },

        listTspProfileSearchableFieldsSuccess: (state, action: PayloadAction<{ searchableFields: SearchFieldDataByGroupDto[] }>) => {
            state.isFetchingSearchableFields = false;
            state.searchableFields = action.payload.searchableFields;
        },

        listTspProfileSearchableFieldsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSearchableFields = false;
        },

        createTspProfile: (state, action: PayloadAction<{ tspProfileRequestDto: TspProfileRequestDto }>) => {
            state.isCreating = true;
        },

        createTspProfileSuccess: (state, action: PayloadAction<{ tspProfile: TspProfileDto }>) => {
            state.isCreating = false;
        },

        createTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
        },

        updateTspProfile: (
            state,
            action: PayloadAction<{
                uuid: string;
                tspProfileRequestDto: TspProfileRequestDto;
            }>,
        ) => {
            state.isUpdating = true;
        },

        updateTspProfileSuccess: (state, action: PayloadAction<{ tspProfile: TspProfileDto }>) => {
            state.isUpdating = false;
            state.tspProfile = action.payload.tspProfile;

            const idx = state.tspProfiles.findIndex((c) => c.uuid === action.payload.tspProfile.uuid);
            if (idx >= 0) {
                state.tspProfiles[idx] = action.payload.tspProfile;
            }
        },

        updateTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        deleteTspProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteTspProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const idx = state.tspProfiles.findIndex((c) => c.uuid === action.payload.uuid);
            if (idx >= 0) state.tspProfiles.splice(idx, 1);

            if (state.tspProfile?.uuid === action.payload.uuid) {
                state.tspProfile = undefined;
            }
        },

        deleteTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        enableTspProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableTspProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const idx = state.tspProfiles.findIndex((c) => c.uuid === action.payload.uuid);
            if (idx >= 0) state.tspProfiles[idx].enabled = true;

            if (state.tspProfile?.uuid === action.payload.uuid) state.tspProfile.enabled = true;
        },

        enableTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableTspProfile: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableTspProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const idx = state.tspProfiles.findIndex((c) => c.uuid === action.payload.uuid);
            if (idx >= 0) state.tspProfiles[idx].enabled = false;

            if (state.tspProfile?.uuid === action.payload.uuid) state.tspProfile.enabled = false;
        },

        disableTspProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        bulkDeleteTspProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteTspProfilesSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionMessageDto[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const idx = state.tspProfiles.findIndex((c) => c.uuid === uuid);
                if (idx >= 0) state.tspProfiles.splice(idx, 1);
            });

            if (state.tspProfile && action.payload.uuids.includes(state.tspProfile.uuid)) {
                state.tspProfile = undefined;
            }
        },

        bulkDeleteTspProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableTspProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableTspProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const idx = state.tspProfiles.findIndex((c) => c.uuid === uuid);
                if (idx >= 0) state.tspProfiles[idx].enabled = true;
            });

            if (state.tspProfile && action.payload.uuids.includes(state.tspProfile.uuid)) state.tspProfile.enabled = true;
        },

        bulkEnableTspProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableTspProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableTspProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const idx = state.tspProfiles.findIndex((c) => c.uuid === uuid);
                if (idx >= 0) state.tspProfiles[idx].enabled = false;
            });

            if (state.tspProfile && action.payload.uuids.includes(state.tspProfile.uuid)) state.tspProfile.enabled = false;
        },

        bulkDisableTspProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const tspProfile = createSelector(state, (state) => state.tspProfile);
const tspProfiles = createSelector(state, (state) => state.tspProfiles);
const checkedRows = createSelector(state, (state) => state.checkedRows);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);
const searchableFields = createSelector(state, (state) => state.searchableFields);

const isFetchingSearchableFields = createSelector(state, (state) => state.isFetchingSearchableFields);
const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const isBulkEnabling = createSelector(state, (state) => state.isBulkEnabling);
const isBulkDisabling = createSelector(state, (state) => state.isBulkDisabling);

export const selectors = {
    state,
    checkedRows,
    deleteErrorMessage,
    bulkDeleteErrorMessages,
    tspProfile,
    tspProfiles,
    searchableFields,
    isFetchingList,
    isFetchingDetail,
    isFetchingSearchableFields,
    isCreating,
    isDeleting,
    isUpdating,
    isEnabling,
    isDisabling,
    isBulkDeleting,
    isBulkEnabling,
    isBulkDisabling,
};

export const actions = slice.actions;

export default slice.reducer;
