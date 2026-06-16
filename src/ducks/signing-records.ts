import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    BulkActionMessageDto,
    PaginationResponseDtoSigningRecordListDto,
    SearchFieldDataByGroupDto,
    SearchRequestDto,
    SigningRecordDto,
} from 'types/openapi';

export type State = {
    signingRecordsData?: PaginationResponseDtoSigningRecordListDto;
    deletedSigningRecordUuids: string[];
    signingRecordDetail?: SigningRecordDto;
    signingRecordDetailError?: string;
    signingRecordDetailErrorStatusCode?: number;
    searchableFields: SearchFieldDataByGroupDto[];
    bulkDeleteErrorMessages: BulkActionMessageDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingSearchableFields: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
};

export const initialState: State = {
    deletedSigningRecordUuids: [],
    searchableFields: [],
    bulkDeleteErrorMessages: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingSearchableFields: false,
    isDeleting: false,
    isBulkDeleting: false,
};

export const slice = createSlice({
    name: 'signingRecords',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            Object.keys(state).forEach((key) => {
                if (!Object.hasOwn(initialState, key)) (state as any)[key] = undefined;
            });

            Object.keys(initialState).forEach((key) => ((state as any)[key] = (initialState as any)[key]));
        },

        // List Signing Records
        listSigningRecords: (state, action: PayloadAction<SearchRequestDto>) => {
            state.signingRecordsData = undefined;
            state.isFetchingList = true;
        },

        listSigningRecordsSuccess: (state, action: PayloadAction<{ data: PaginationResponseDtoSigningRecordListDto }>) => {
            state.signingRecordsData = action.payload.data;
            state.isFetchingList = false;
        },

        listSigningRecordsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        // Get Signing Record Detail
        getSigningRecord: (state, action: PayloadAction<{ uuid: string }>) => {
            state.signingRecordDetail = undefined;
            state.signingRecordDetailError = undefined;
            state.signingRecordDetailErrorStatusCode = undefined;
            state.isFetchingDetail = true;
        },

        getSigningRecordSuccess: (state, action: PayloadAction<{ detail: SigningRecordDto }>) => {
            state.signingRecordDetail = action.payload.detail;
            state.signingRecordDetailError = undefined;
            state.signingRecordDetailErrorStatusCode = undefined;
            state.isFetchingDetail = false;
        },

        getSigningRecordFailure: (state, action: PayloadAction<{ error: string | undefined; statusCode?: number }>) => {
            state.signingRecordDetailError = action.payload.error;
            state.signingRecordDetailErrorStatusCode = action.payload.statusCode;
            state.isFetchingDetail = false;
        },

        clearSigningRecordDetail: (state, action: PayloadAction<void>) => {
            state.signingRecordDetail = undefined;
            state.signingRecordDetailError = undefined;
            state.signingRecordDetailErrorStatusCode = undefined;
        },

        // Get Searchable Fields
        getSearchableFields: (state, action: PayloadAction<void>) => {
            state.searchableFields = [];
            state.isFetchingSearchableFields = true;
        },

        getSearchableFieldsSuccess: (state, action: PayloadAction<{ fields: SearchFieldDataByGroupDto[] }>) => {
            state.searchableFields = action.payload.fields;
            state.isFetchingSearchableFields = false;
        },

        getSearchableFieldsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSearchableFields = false;
        },

        // Delete Signing Record
        deleteSigningRecord: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteSigningRecordSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            if (!state.deletedSigningRecordUuids.includes(action.payload.uuid)) {
                state.deletedSigningRecordUuids.push(action.payload.uuid);
            }

            if (state.signingRecordsData) {
                const index = state.signingRecordsData.items.findIndex((record) => record.uuid === action.payload.uuid);
                if (index !== -1) {
                    state.signingRecordsData.items.splice(index, 1);
                    state.signingRecordsData.totalItems = Math.max(0, (state.signingRecordsData.totalItems ?? 0) - 1);
                }
            }
        },

        deleteSigningRecordFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        // Bulk delete Signing Records
        bulkDeleteSigningRecords: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteSigningRecordsSuccess: (state, action: PayloadAction<{ uuids: string[]; errors: BulkActionMessageDto[] }>) => {
            state.isBulkDeleting = false;

            if (action.payload.errors?.length > 0) {
                state.bulkDeleteErrorMessages = action.payload.errors;
                return;
            }

            action.payload.uuids.forEach((uuid) => {
                if (!state.deletedSigningRecordUuids.includes(uuid)) {
                    state.deletedSigningRecordUuids.push(uuid);
                }
            });

            if (state.signingRecordsData) {
                const uuidSet = new Set(action.payload.uuids);
                const previousItemsCount = state.signingRecordsData.items.length;
                state.signingRecordsData.items = state.signingRecordsData.items.filter((item) => !uuidSet.has(item.uuid));
                const removedItemsCount = previousItemsCount - state.signingRecordsData.items.length;
                state.signingRecordsData.totalItems = Math.max(0, (state.signingRecordsData.totalItems ?? 0) - removedItemsCount);
            }
        },

        bulkDeleteSigningRecordsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.bulkDeleteErrorMessages = [];
        },
    },
});

const featureSelector = (reduxStore: any): State => reduxStore?.signingRecords;

export const selectSigningRecordsData = createSelector(featureSelector, (state) => state.signingRecordsData);
export const selectSigningRecordsList = createSelector(featureSelector, (state) => state.signingRecordsData?.items || []);
export const selectDeletedSigningRecordUuids = createSelector(featureSelector, (state) => state.deletedSigningRecordUuids);
export const selectBulkDeleteErrorMessages = createSelector(featureSelector, (state) => state.bulkDeleteErrorMessages);
export const selectSigningRecordDetail = createSelector(featureSelector, (state) => state.signingRecordDetail);
export const selectSigningRecordDetailError = createSelector(featureSelector, (state) => state.signingRecordDetailError);
export const selectSigningRecordDetailErrorStatusCode = createSelector(
    featureSelector,
    (state) => state.signingRecordDetailErrorStatusCode,
);
export const selectSearchableFields = createSelector(featureSelector, (state) => state.searchableFields);

export const selectIsFetchingList = createSelector(featureSelector, (state) => state.isFetchingList);
export const selectIsFetchingDetail = createSelector(featureSelector, (state) => state.isFetchingDetail);
export const selectIsFetchingSearchableFields = createSelector(featureSelector, (state) => state.isFetchingSearchableFields);
export const selectIsDeleting = createSelector(featureSelector, (state) => state.isDeleting);
export const selectIsBulkDeleting = createSelector(featureSelector, (state) => state.isBulkDeleting);

export const selectors = {
    selectSigningRecordsData,
    selectSigningRecordsList,
    selectDeletedSigningRecordUuids,
    selectBulkDeleteErrorMessages,
    selectSigningRecordDetail,
    selectSigningRecordDetailError,
    selectSigningRecordDetailErrorStatusCode,
    selectSearchableFields,
    selectIsFetchingList,
    selectIsFetchingDetail,
    selectIsFetchingSearchableFields,
    selectIsDeleting,
    selectIsBulkDeleting,
};

export const { actions } = slice;
export default slice.reducer;
