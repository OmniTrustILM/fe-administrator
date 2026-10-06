import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    CbomDetailDto,
    CbomDto,
    CbomUploadRequestDto,
    PaginationResponseDtoCbomDto,
    SearchFieldDataByGroupDto,
    SearchRequestDto,
} from 'types/openapi';
import type { ContributedAssetRefs, ContributedAssets } from 'utils/cbom-asset-links';
import { resetSliceState } from './reducerUtils';

export type State = {
    cbomsData?: PaginationResponseDtoCbomDto;
    cbomDetail?: CbomDetailDto;
    cbomDetailError?: string;
    cbomDetailErrorStatusCode?: number;
    cbomVersions: CbomDto[];
    contributedAssets: ContributedAssets;
    searchableFields: SearchFieldDataByGroupDto[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingVersions: boolean;
    isFetchingSearchableFields: boolean;
    isUploading: boolean;
    isUploadSuccess: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isSyncing: boolean;
    syncSucceeded: boolean;

    /** Bumped whenever a mutation needs the listing re-read; the page forwards it as `refreshToken`. */
    listRefreshToken: number;
};

export const initialState: State = {
    cbomVersions: [],
    contributedAssets: { status: 'idle', assets: [] },
    searchableFields: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingVersions: false,
    isFetchingSearchableFields: false,
    isUploading: false,
    isUploadSuccess: false,
    isDeleting: false,
    isBulkDeleting: false,
    isSyncing: false,
    syncSucceeded: false,

    listRefreshToken: 0,
};

export const slice = createSlice({
    name: 'cbom',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        // List CBOMs
        listCboms: (state, action: PayloadAction<SearchRequestDto>) => {
            state.cbomsData = undefined;
            state.isFetchingList = true;
        },

        listCbomsSuccess: (state, action: PayloadAction<{ data: PaginationResponseDtoCbomDto }>) => {
            state.cbomsData = action.payload.data;
            state.isFetchingList = false;
        },

        listCbomsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        // Get CBOM Detail
        getCbomDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.cbomDetail = undefined;
            state.cbomDetailError = undefined;
            state.cbomDetailErrorStatusCode = undefined;
            state.isFetchingDetail = true;
        },

        getCbomDetailSuccess: (state, action: PayloadAction<{ detail: CbomDetailDto }>) => {
            state.cbomDetail = action.payload.detail;
            state.cbomDetailError = undefined;
            state.cbomDetailErrorStatusCode = undefined;
            state.isFetchingDetail = false;
        },

        getCbomDetailFailure: (state, action: PayloadAction<{ error: string | undefined; statusCode?: number }>) => {
            state.cbomDetailError = action.payload.error;
            state.cbomDetailErrorStatusCode = action.payload.statusCode;
            state.isFetchingDetail = false;
        },

        clearCbomDetail: (state, action: PayloadAction<void>) => {
            state.cbomDetail = undefined;
            state.cbomDetailError = undefined;
            state.cbomDetailErrorStatusCode = undefined;
        },

        // List CBOM Versions
        listCbomVersions: (state, action: PayloadAction<{ uuid: string }>) => {
            state.cbomVersions = [];
            state.isFetchingVersions = true;
        },

        listCbomVersionsSuccess: (state, action: PayloadAction<{ versions: CbomDto[] }>) => {
            state.cbomVersions = action.payload.versions;
            state.isFetchingVersions = false;
        },

        listCbomVersionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingVersions = false;
        },

        // List the inventory assets a CBOM contributed
        listCbomContributedAssets: (state, action: PayloadAction<{ uuid: string }>) => {
            state.contributedAssets = { cbomUuid: action.payload.uuid, status: 'fetching', assets: [] };
        },

        listCbomContributedAssetsSuccess: (state, action: PayloadAction<{ uuid: string; assets: ContributedAssetRefs[] }>) => {
            if (state.contributedAssets.cbomUuid !== action.payload.uuid) return;
            state.contributedAssets = { cbomUuid: action.payload.uuid, status: 'loaded', assets: action.payload.assets };
        },

        listCbomContributedAssetsFailure: (
            state,
            action: PayloadAction<{ uuid: string; error: string | undefined; statusCode?: number }>,
        ) => {
            if (state.contributedAssets.cbomUuid !== action.payload.uuid) return;
            state.contributedAssets = {
                cbomUuid: action.payload.uuid,
                status: 'failed',
                assets: [],
                error: action.payload.error,
                errorStatusCode: action.payload.statusCode,
            };
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

        // Upload CBOM
        uploadCbom: (state, action: PayloadAction<CbomUploadRequestDto>) => {
            state.isUploading = true;
            state.isUploadSuccess = false;
        },

        uploadCbomSuccess: (state, action: PayloadAction<{ cbom: CbomDto }>) => {
            state.isUploading = false;
            state.isUploadSuccess = true;
            if (state.cbomsData) {
                state.cbomsData.items.unshift(action.payload.cbom);
            }
        },

        uploadCbomFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUploading = false;
            state.isUploadSuccess = false;
        },

        // Delete CBOM
        deleteCbom: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteCbomSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            if (state.cbomsData) {
                const index = state.cbomsData.items.findIndex((cbom) => cbom.uuid === action.payload.uuid);
                if (index !== -1) {
                    state.cbomsData.items.splice(index, 1);
                    state.cbomsData.totalItems = Math.max(0, (state.cbomsData.totalItems ?? 0) - 1);
                }
            }
        },

        deleteCbomFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        // Bulk delete CBOM
        bulkDeleteCbom: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = true;
        },

        bulkDeleteCbomSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;
            // The host re-reads its own request rather than this slice pruning the rows: the request
            // carries the applied columns and ordering, which a list action assembled elsewhere cannot.
            state.listRefreshToken += 1;
        },

        bulkDeleteCbomFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        // Sync CBOMs
        syncCboms: (state, action: PayloadAction<void>) => {
            state.isSyncing = true;
            state.syncSucceeded = false;
        },

        syncCbomsSuccess: (state, action: PayloadAction<void>) => {
            state.isSyncing = false;
            state.syncSucceeded = true;
        },

        syncCbomsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isSyncing = false;
            state.syncSucceeded = false;
        },
    },
});

const featureSelector = (reduxStore: AppState): State => reduxStore.cbom;

export const selectCbomsData = createSelector(featureSelector, (state) => state.cbomsData);
export const selectCbomList = createSelector(featureSelector, (state) => state.cbomsData?.items || []);
export const selectCbomDetail = createSelector(featureSelector, (state) => state.cbomDetail);
export const selectCbomDetailError = createSelector(featureSelector, (state) => state.cbomDetailError);
export const selectCbomDetailErrorStatusCode = createSelector(featureSelector, (state) => state.cbomDetailErrorStatusCode);
export const selectCbomVersions = createSelector(featureSelector, (state) => state.cbomVersions);
export const selectContributedAssets = createSelector(featureSelector, (state) => state.contributedAssets);
export const selectSearchableFields = createSelector(featureSelector, (state) => state.searchableFields);

export const selectIsFetchingList = createSelector(featureSelector, (state) => state.isFetchingList);
export const selectIsFetchingDetail = createSelector(featureSelector, (state) => state.isFetchingDetail);
export const selectIsFetchingVersions = createSelector(featureSelector, (state) => state.isFetchingVersions);
export const selectIsFetchingSearchableFields = createSelector(featureSelector, (state) => state.isFetchingSearchableFields);
export const selectIsUploading = createSelector(featureSelector, (state) => state.isUploading);
export const selectIsUploadSuccess = createSelector(featureSelector, (state) => state.isUploadSuccess);
export const selectIsDeleting = createSelector(featureSelector, (state) => state.isDeleting);
export const selectIsBulkDeleting = createSelector(featureSelector, (state) => state.isBulkDeleting);
export const selectIsSyncing = createSelector(featureSelector, (state) => state.isSyncing);
export const selectSyncSucceeded = createSelector(featureSelector, (state) => state.syncSucceeded);
export const selectListRefreshToken = createSelector(featureSelector, (state) => state.listRefreshToken);

export const selectors = {
    selectCbomsData,
    selectCbomList,
    selectCbomDetail,
    selectCbomDetailError,
    selectCbomDetailErrorStatusCode,
    selectCbomVersions,
    selectContributedAssets,
    selectSearchableFields,
    selectIsFetchingList,
    selectIsFetchingDetail,
    selectIsFetchingVersions,
    selectIsFetchingSearchableFields,
    selectIsUploading,
    selectIsUploadSuccess,
    selectIsDeleting,
    selectIsBulkDeleting,
    selectIsSyncing,
    selectSyncSucceeded,
    selectListRefreshToken,
};

export const { actions } = slice;
export default slice.reducer;
