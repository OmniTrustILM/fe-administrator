import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { ParseRequestRequestDtoParseTypeEnum, ParseRequestResponseDto } from '../types/openapi/utils';

export type State = {
    parsedCertificateRequest?: ParseRequestResponseDto;
    isFetchingDetail: boolean;
    parseError?: string;
};

export const initialState: State = {
    isFetchingDetail: false,
};

export const slice = createSlice({
    name: 'utilsCertificateRequest',
    initialState,
    reducers: {
        reset: (state) => {
            state.parsedCertificateRequest = undefined;
            state.parseError = undefined;
        },
        parseCertificateRequest: (
            state,
            action: PayloadAction<{ content: string; requestParseType: ParseRequestRequestDtoParseTypeEnum }>,
        ) => {
            state.parsedCertificateRequest = undefined;
            state.parseError = undefined;
            state.isFetchingDetail = true;
        },

        parseCertificateRequestSuccess: (state, action: PayloadAction<ParseRequestResponseDto>) => {
            state.parsedCertificateRequest = action.payload;
            state.isFetchingDetail = false;
        },

        parseCertificateRequestFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
            state.parseError = action.payload.error ?? 'Failed to parse certificate request';
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const parsedCertificateRequest = createSelector(state, (state: State) => state.parsedCertificateRequest);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const parseError = createSelector(state, (state: State) => state.parseError);

export const selectors = {
    state,
    parsedCertificateRequest,
    isFetchingDetail,
    parseError,
};

export const actions = slice.actions;

export default slice.reducer;
