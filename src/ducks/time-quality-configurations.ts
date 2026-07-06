import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    SearchFieldDataByGroupDto,
    SimplifiedSigningProfileDto,
    TimeQualityConfigurationDto,
    TimeQualityConfigurationListDto,
    TimeQualityConfigurationRequestDto,
} from 'types/openapi';
import type { BulkActionMessageDto } from 'types/openapi/models/BulkActionMessageDto';
import type { SearchRequestModel } from 'types/certificate';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionMessageDto[];

    timeQualityConfiguration?: TimeQualityConfigurationDto;
    timeQualityConfigurations: TimeQualityConfigurationListDto[];

    searchableFields?: SearchFieldDataByGroupDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingSearchableFields: boolean;
    isCreating: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    isBulkDeleting: boolean;

    associatedSigningProfiles: SimplifiedSigningProfileDto[];
    isFetchingAssociatedSigningProfiles: boolean;
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    timeQualityConfigurations: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingSearchableFields: false,
    isCreating: false,
    isDeleting: false,
    isUpdating: false,
    isBulkDeleting: false,

    associatedSigningProfiles: [],
    isFetchingAssociatedSigningProfiles: false,
};

export const slice = createSlice({
    name: 'timeQualityConfigurations',

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

        listTimeQualityConfigurations: (state, action: PayloadAction<SearchRequestModel | undefined>) => {
            state.isFetchingList = true;
        },

        listTimeQualityConfigurationsSuccess: (
            state,
            action: PayloadAction<{ timeQualityConfigurations: TimeQualityConfigurationListDto[] }>,
        ) => {
            state.isFetchingList = false;
            state.timeQualityConfigurations = action.payload.timeQualityConfigurations;
        },

        listTimeQualityConfigurationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getTimeQualityConfiguration: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getTimeQualityConfigurationSuccess: (state, action: PayloadAction<{ timeQualityConfiguration: TimeQualityConfigurationDto }>) => {
            state.isFetchingDetail = false;
            state.timeQualityConfiguration = action.payload.timeQualityConfiguration;

            const idx = state.timeQualityConfigurations.findIndex((c) => c.uuid === action.payload.timeQualityConfiguration.uuid);
            if (idx >= 0) {
                state.timeQualityConfigurations[idx] = action.payload.timeQualityConfiguration;
            }
        },

        getTimeQualityConfigurationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        listAssociatedSigningProfiles: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingAssociatedSigningProfiles = true;
            state.associatedSigningProfiles = [];
        },

        listAssociatedSigningProfilesSuccess: (state, action: PayloadAction<{ signingProfiles: SimplifiedSigningProfileDto[] }>) => {
            state.isFetchingAssociatedSigningProfiles = false;
            state.associatedSigningProfiles = action.payload.signingProfiles;
        },

        listAssociatedSigningProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAssociatedSigningProfiles = false;
        },

        listTimeQualityConfigurationSearchableFields: (state, action: PayloadAction<void>) => {
            state.isFetchingSearchableFields = true;
        },

        listTimeQualityConfigurationSearchableFieldsSuccess: (
            state,
            action: PayloadAction<{ searchableFields: SearchFieldDataByGroupDto[] }>,
        ) => {
            state.isFetchingSearchableFields = false;
            state.searchableFields = action.payload.searchableFields;
        },

        listTimeQualityConfigurationSearchableFieldsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSearchableFields = false;
        },

        createTimeQualityConfiguration: (
            state,
            action: PayloadAction<{ timeQualityConfigurationRequestDto: TimeQualityConfigurationRequestDto }>,
        ) => {
            state.isCreating = true;
        },

        createTimeQualityConfigurationSuccess: (
            state,
            action: PayloadAction<{ timeQualityConfiguration: TimeQualityConfigurationDto }>,
        ) => {
            state.isCreating = false;
        },

        createTimeQualityConfigurationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
        },

        updateTimeQualityConfiguration: (
            state,
            action: PayloadAction<{
                uuid: string;
                timeQualityConfigurationRequestDto: TimeQualityConfigurationRequestDto;
            }>,
        ) => {
            state.isUpdating = true;
        },

        updateTimeQualityConfigurationSuccess: (
            state,
            action: PayloadAction<{ timeQualityConfiguration: TimeQualityConfigurationDto }>,
        ) => {
            state.isUpdating = false;
            state.timeQualityConfiguration = action.payload.timeQualityConfiguration;

            const idx = state.timeQualityConfigurations.findIndex((c) => c.uuid === action.payload.timeQualityConfiguration.uuid);
            if (idx >= 0) {
                state.timeQualityConfigurations[idx] = action.payload.timeQualityConfiguration;
            }
        },

        updateTimeQualityConfigurationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        deleteTimeQualityConfiguration: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
            state.deleteErrorMessage = '';
        },

        deleteTimeQualityConfigurationSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const idx = state.timeQualityConfigurations.findIndex((c) => c.uuid === action.payload.uuid);
            if (idx >= 0) state.timeQualityConfigurations.splice(idx, 1);

            if (state.timeQualityConfiguration?.uuid === action.payload.uuid) {
                state.timeQualityConfiguration = undefined;
            }
        },

        deleteTimeQualityConfigurationFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
        },

        bulkDeleteTimeQualityConfigurations: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteTimeQualityConfigurationsSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionMessageDto[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                const idx = state.timeQualityConfigurations.findIndex((c) => c.uuid === uuid);
                if (idx >= 0) state.timeQualityConfigurations.splice(idx, 1);
            });

            if (state.timeQualityConfiguration && action.payload.uuids.includes(state.timeQualityConfiguration.uuid)) {
                state.timeQualityConfiguration = undefined;
            }
        },

        bulkDeleteTimeQualityConfigurationsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const timeQualityConfiguration = createSelector(state, (state) => state.timeQualityConfiguration);
const timeQualityConfigurations = createSelector(state, (state) => state.timeQualityConfigurations);
const searchableFields = createSelector(state, (state) => state.searchableFields);
const checkedRows = createSelector(state, (state) => state.checkedRows);
const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);
const bulkDeleteErrorMessages = createSelector(state, (state) => state.bulkDeleteErrorMessages);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingSearchableFields = createSelector(state, (state) => state.isFetchingSearchableFields);
const isCreating = createSelector(state, (state) => state.isCreating);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const associatedSigningProfiles = createSelector(state, (state) => state.associatedSigningProfiles);
const isFetchingAssociatedSigningProfiles = createSelector(state, (state) => state.isFetchingAssociatedSigningProfiles);

export const selectors = {
    state,
    checkedRows,
    deleteErrorMessage,
    bulkDeleteErrorMessages,
    timeQualityConfiguration,
    timeQualityConfigurations,
    searchableFields,
    isFetchingList,
    isFetchingDetail,
    isFetchingSearchableFields,
    isCreating,
    isDeleting,
    isUpdating,
    isBulkDeleting,
    associatedSigningProfiles,
    isFetchingAssociatedSigningProfiles,
};

export const actions = slice.actions;

export default slice.reducer;
