import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestAttribute, TokenKeyListResponseDto, TokenKeyOnboardingResultDto, TokenKeySelectionDto } from 'types/openapi';

export type State = {
    tokenKeys?: TokenKeyListResponseDto;
    /** Why the last listing of key pairs failed. */
    tokenKeysError?: string;
    tokenKeyOnboardingResults?: TokenKeyOnboardingResultDto[];

    isListingTokenKeys: boolean;
    isOnboardingTokenKeys: boolean;
};

export const initialState: State = {
    isListingTokenKeys: false,
    isOnboardingTokenKeys: false,
};

export const slice = createSlice({
    name: 'tokenKeys',

    initialState,

    reducers: {
        listTokenKeys: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; tokenProfileUuid: string; pageNumber: number; itemsPerPage: number }>,
        ) => {
            state.isListingTokenKeys = true;
            state.tokenKeysError = undefined;
        },

        listTokenKeysSuccess: (state, action: PayloadAction<{ tokenKeys: TokenKeyListResponseDto }>) => {
            if (!state.isListingTokenKeys) return;

            state.isListingTokenKeys = false;
            state.tokenKeys = action.payload.tokenKeys;
        },

        listTokenKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            if (!state.isListingTokenKeys) return;

            state.isListingTokenKeys = false;
            state.tokenKeys = undefined;
            state.tokenKeysError = action.payload.error;
        },

        onboardTokenKeys: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                keys: TokenKeySelectionDto[];
                customAttributes?: RequestAttribute[];
            }>,
        ) => {
            state.isOnboardingTokenKeys = true;
            state.tokenKeyOnboardingResults = undefined;
        },

        onboardTokenKeysSuccess: (state, action: PayloadAction<{ results: TokenKeyOnboardingResultDto[] }>) => {
            if (!state.isOnboardingTokenKeys) return;

            state.isOnboardingTokenKeys = false;
            state.tokenKeyOnboardingResults = action.payload.results;
        },

        onboardTokenKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isOnboardingTokenKeys = false;
        },

        clearTokenKeys: (state, action: PayloadAction<void>) => {
            state.tokenKeys = undefined;
            state.tokenKeysError = undefined;
            state.isListingTokenKeys = false;
            state.isOnboardingTokenKeys = false;
            state.tokenKeyOnboardingResults = undefined;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const tokenKeys = createSelector(state, (state: State) => state.tokenKeys);
const tokenKeysError = createSelector(state, (state: State) => state.tokenKeysError);
const tokenKeyOnboardingResults = createSelector(state, (state: State) => state.tokenKeyOnboardingResults);
const isListingTokenKeys = createSelector(state, (state: State) => state.isListingTokenKeys);
const isOnboardingTokenKeys = createSelector(state, (state: State) => state.isOnboardingTokenKeys);

export const selectors = {
    state,

    tokenKeys,
    tokenKeysError,
    tokenKeyOnboardingResults,
    isListingTokenKeys,
    isOnboardingTokenKeys,
};

export const actions = slice.actions;

export default slice.reducer;
