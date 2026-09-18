import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    CryptographicAssetDetailDto,
    CryptographicAssetDto,
    PaginationResponseDtoCryptographicAssetDto,
    SearchRequestDto,
} from 'types/openapi';
import { resetSliceState } from './reducerUtils';

// No searchable-fields state here: the filter widget reads the catalogue through the `filters` duck.
export type State = {
    assetsData?: PaginationResponseDtoCryptographicAssetDto;
    isFetchingList: boolean;

    assetDetail?: CryptographicAssetDetailDto;
    assetDetailError?: string;
    assetDetailErrorStatusCode?: number;
    isFetchingDetail: boolean;
};

export const initialState: State = {
    isFetchingList: false,
    isFetchingDetail: false,
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

        getCryptoAssetDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.assetDetail = undefined;
            state.assetDetailError = undefined;
            state.assetDetailErrorStatusCode = undefined;
            state.isFetchingDetail = true;
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

export const selectors = {
    selectCryptoAssetList,
    selectIsFetchingList,
    selectCryptoAssetDetail,
    selectCryptoAssetDetailError,
    selectCryptoAssetDetailErrorStatusCode,
    selectIsFetchingDetail,
};

export const { actions } = slice;
export default slice.reducer;
