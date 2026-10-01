import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    CryptographicAssetDetailDto,
    CryptographicAssetDto,
    CryptographicAssetPqcExplanationDto,
    PaginationResponseDtoCryptographicAssetDto,
    SearchRequestDto,
} from 'types/openapi';
import type { WidgetLockErrorModel } from 'types/user-interface';
import { resetSliceState } from './reducerUtils';

// No searchable-fields state here: the filter widget reads the catalogue through the `filters` duck.
export type State = {
    assetsData?: PaginationResponseDtoCryptographicAssetDto;
    isFetchingList: boolean;

    assetDetail?: CryptographicAssetDetailDto;
    assetDetailError?: string;
    assetDetailErrorStatusCode?: number;
    isFetchingDetail: boolean;

    pqcExplanation?: CryptographicAssetPqcExplanationDto;
    /** Set when the explanation fails to load; rendered through its widget's own lock, so the widget's Refresh retries it. */
    pqcExplanationLock?: WidgetLockErrorModel;
    isFetchingPqcExplanation: boolean;
};

export const initialState: State = {
    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingPqcExplanation: false,
};

const NO_ASSETS: CryptographicAssetDto[] = [];

export const slice = createSlice({
    name: 'cryptoAssets',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        // The previous page stays under PagedList's busy overlay rather than dropping to the skeleton.
        listCryptoAssets: (state, action: PayloadAction<SearchRequestDto>) => {
            state.isFetchingList = true;
        },

        listCryptoAssetsSuccess: (state, action: PayloadAction<{ data: PaginationResponseDtoCryptographicAssetDto }>) => {
            state.assetsData = action.payload.data;
            state.isFetchingList = false;
        },

        listCryptoAssetsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        // The explanation is re-requested once the detail has loaded, so a reload starts it from nothing as well.
        getCryptoAssetDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.assetDetail = undefined;
            state.assetDetailError = undefined;
            state.assetDetailErrorStatusCode = undefined;
            state.isFetchingDetail = true;
            state.pqcExplanation = undefined;
            state.pqcExplanationLock = undefined;
            state.isFetchingPqcExplanation = false;
        },

        getCryptoAssetDetailSuccess: (state, action: PayloadAction<{ detail: CryptographicAssetDetailDto }>) => {
            state.assetDetail = action.payload.detail;
            state.isFetchingDetail = false;
        },

        getCryptoAssetDetailFailure: (state, action: PayloadAction<{ error: string | undefined; statusCode?: number }>) => {
            state.assetDetailError = action.payload.error;
            state.assetDetailErrorStatusCode = action.payload.statusCode;
            state.isFetchingDetail = false;
        },

        clearCryptoAssetDetail: (state, action: PayloadAction<void>) => {
            state.assetDetail = undefined;
            state.assetDetailError = undefined;
            state.assetDetailErrorStatusCode = undefined;
            state.isFetchingDetail = false;
            state.pqcExplanation = undefined;
            state.pqcExplanationLock = undefined;
            state.isFetchingPqcExplanation = false;
        },

        // A refresh keeps the explanation on screen under the busy spinner.
        getCryptoAssetPqcExplanation: (state, action: PayloadAction<{ uuid: string }>) => {
            state.pqcExplanationLock = undefined;
            state.isFetchingPqcExplanation = true;
        },

        getCryptoAssetPqcExplanationSuccess: (state, action: PayloadAction<{ explanation: CryptographicAssetPqcExplanationDto }>) => {
            state.pqcExplanation = action.payload.explanation;
            state.isFetchingPqcExplanation = false;
        },

        getCryptoAssetPqcExplanationFailure: (state, action: PayloadAction<{ lock: WidgetLockErrorModel }>) => {
            state.pqcExplanation = undefined;
            state.pqcExplanationLock = action.payload.lock;
            state.isFetchingPqcExplanation = false;
        },
    },
});

const featureSelector = (reduxStore: AppState): State => reduxStore.cryptoAssets;

export const selectCryptoAssetList = createSelector(featureSelector, (state) => state.assetsData?.items ?? NO_ASSETS);
export const selectIsFetchingList = createSelector(featureSelector, (state) => state.isFetchingList);

export const selectCryptoAssetDetail = createSelector(featureSelector, (state) => state.assetDetail);
export const selectCryptoAssetDetailError = createSelector(featureSelector, (state) => state.assetDetailError);
export const selectCryptoAssetDetailErrorStatusCode = createSelector(featureSelector, (state) => state.assetDetailErrorStatusCode);
export const selectIsFetchingDetail = createSelector(featureSelector, (state) => state.isFetchingDetail);

export const selectPqcExplanation = createSelector(featureSelector, (state) => state.pqcExplanation);
export const selectPqcExplanationLock = createSelector(featureSelector, (state) => state.pqcExplanationLock);
export const selectIsFetchingPqcExplanation = createSelector(featureSelector, (state) => state.isFetchingPqcExplanation);

export const selectors = {
    selectCryptoAssetList,
    selectIsFetchingList,
    selectCryptoAssetDetail,
    selectCryptoAssetDetailError,
    selectCryptoAssetDetailErrorStatusCode,
    selectIsFetchingDetail,
    selectPqcExplanation,
    selectPqcExplanationLock,
    selectIsFetchingPqcExplanation,
};

export const { actions } = slice;
export default slice.reducer;
