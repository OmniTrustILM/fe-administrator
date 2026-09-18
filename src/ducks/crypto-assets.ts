import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { CryptographicAssetDto, PaginationResponseDtoCryptographicAssetDto, SearchRequestDto } from 'types/openapi';
import { resetSliceState } from './reducerUtils';

// No searchable-fields state here: the filter widget reads the catalogue through the `filters` duck.
export type State = {
    assetsData?: PaginationResponseDtoCryptographicAssetDto;
    isFetchingList: boolean;
};

export const initialState: State = {
    isFetchingList: false,
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
    },
});

const featureSelector = (reduxStore: AppState): State => reduxStore.cryptoAssets;

export const selectCryptoAssetList = createSelector(featureSelector, (state) => state.assetsData?.items ?? NO_ASSETS);
export const selectIsFetchingList = createSelector(featureSelector, (state) => state.isFetchingList);

export const selectors = {
    selectCryptoAssetList,
    selectIsFetchingList,
};

export const { actions } = slice;
export default slice.reducer;
