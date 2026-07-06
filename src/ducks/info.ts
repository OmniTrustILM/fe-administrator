import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { CoreInfoResponseModel } from 'types/info';

export type State = {
    platformInfo?: CoreInfoResponseModel;
    isFetching: boolean;
};

export const initialState: State = {
    isFetching: false,
};

export const slice = createSlice({
    name: 'info',
    initialState,
    reducers: {
        getPlatformInfo: (state, action: PayloadAction<void>) => {
            state.platformInfo = undefined;
            state.isFetching = true;
        },

        getPlatformInfoSuccess: (state, action: PayloadAction<CoreInfoResponseModel>) => {
            state.platformInfo = action.payload;
            state.isFetching = false;
        },

        getPlatformInfoFailure: (state, action: PayloadAction<void>) => {
            state.isFetching = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const platformInfo = createSelector(state, (state: State) => state.platformInfo);
const isFetching = createSelector(state, (state: State) => state.isFetching);

export const selectors = {
    state,
    platformInfo,
    isFetching,
};

export const actions = slice.actions;

export default slice.reducer;
