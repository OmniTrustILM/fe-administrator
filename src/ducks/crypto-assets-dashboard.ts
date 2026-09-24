import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { CryptographicAssetStatisticsDto } from 'types/openapi';

export type State = {
    isFetching: boolean;
    statistics?: CryptographicAssetStatisticsDto;
};

export const initialState: State = {
    isFetching: false,
};

export const slice = createSlice({
    name: 'cryptoAssetsDashboard',

    initialState,

    reducers: {
        getStatistics: (state, action: PayloadAction<void>) => {
            state.isFetching = true;
        },

        getStatisticsSuccess: (state, action: PayloadAction<{ statistics: CryptographicAssetStatisticsDto }>) => {
            state.isFetching = false;
            state.statistics = action.payload.statistics;
        },

        getStatisticsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetching = false;
        },
    },
});

const selectState = (reduxStore: AppState): State => reduxStore[slice.name];

export const statistics = createSelector(selectState, (state) => state.statistics);
export const isFetching = createSelector(selectState, (state) => state.isFetching);

export const selectors = {
    selectState,
    statistics,
    isFetching,
};

export const actions = slice.actions;

export default slice.reducer;
