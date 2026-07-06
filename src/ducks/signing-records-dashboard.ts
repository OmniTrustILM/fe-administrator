import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { SigningRecordStatisticsPeriod, type SigningRecordStatisticsDto } from 'types/openapi';

export type State = {
    isFetching: boolean;
    isFetchingSeries: boolean;
    period: SigningRecordStatisticsPeriod;
    statistics?: SigningRecordStatisticsDto;
};

export const initialState: State = {
    isFetching: false,
    isFetchingSeries: false,
    period: SigningRecordStatisticsPeriod._24h,
    statistics: undefined,
};

export const slice = createSlice({
    name: 'signingRecordsDashboard',

    initialState,

    reducers: {
        getStatistics: (state, action: PayloadAction<{ period: SigningRecordStatisticsPeriod }>) => {
            state.isFetching = true;
            state.period = action.payload.period;
            state.statistics = undefined;
        },

        setPeriod: (state, action: PayloadAction<{ period: SigningRecordStatisticsPeriod }>) => {
            state.isFetchingSeries = true;
            state.period = action.payload.period;
        },

        getStatisticsSuccess: (state, action: PayloadAction<{ statistics: SigningRecordStatisticsDto }>) => {
            state.isFetching = false;
            state.isFetchingSeries = false;
            state.statistics = action.payload.statistics;
        },

        getStatisticsFailure: (state, _action: PayloadAction<void>) => {
            state.isFetching = false;
            state.isFetchingSeries = false;
        },
    },
});

const selectState = (reduxStore: AppState): State => reduxStore?.[slice.name];

const statistics = createSelector(selectState, (state) => state.statistics);
const isFetching = createSelector(selectState, (state) => state.isFetching);
const isFetchingSeries = createSelector(selectState, (state) => state.isFetchingSeries);
const period = createSelector(selectState, (state) => state.period);

export const selectors = {
    selectState,
    statistics,
    isFetching,
    isFetchingSeries,
    period,
};

export const actions = slice.actions;

export default slice.reducer;
