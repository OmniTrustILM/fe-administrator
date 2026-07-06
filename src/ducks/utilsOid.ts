import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { OidInfoResponseDto } from '../types/openapi/utils';

export type State = {
    oidInfo?: OidInfoResponseDto;
    isFetchingDetail: boolean;
};

export const initialState: State = {
    isFetchingDetail: false,
};

export const slice = createSlice({
    name: 'utilsOid',
    initialState,
    reducers: {
        getOidInfo: (state, action: PayloadAction<string>) => {
            state.oidInfo = undefined;
            state.isFetchingDetail = true;
        },

        getOidInfoSuccess: (state, action: PayloadAction<OidInfoResponseDto>) => {
            state.oidInfo = action.payload;
            state.isFetchingDetail = false;
        },

        getOidInfoFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const oidInfo = createSelector(state, (state: State) => state.oidInfo);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);

export const selectors = {
    state,
    oidInfo,
    isFetchingDetail,
};

export const actions = slice.actions;

export default slice.reducer;
