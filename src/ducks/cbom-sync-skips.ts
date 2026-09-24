import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { CbomSyncSkipDto, PaginationResponseDtoCbomSyncSkipDto, SearchRequestDto } from 'types/openapi';
import { resetSliceState } from './reducerUtils';

/** The documents the CBOM sync could not store, as the operator list shows them, and the retry an operator asks for. */
export type State = {
    skipsData?: PaginationResponseDtoCbomSyncSkipDto;
    isFetchingList: boolean;
    /** The row a retry is in flight for. The page shows the whole list as busy meanwhile, as the CBOM list does. */
    retryingUuid?: string;
    /** Bumped when a retry landed; the page forwards it as `refreshToken` so the list re-reads the changed row. */
    listRefreshToken: number;
};

export const initialState: State = {
    isFetchingList: false,
    listRefreshToken: 0,
};

export const slice = createSlice({
    name: 'cbomSyncSkips',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listSyncSkips: (state, action: PayloadAction<SearchRequestDto>) => {
            state.skipsData = undefined;
            state.isFetchingList = true;
        },

        listSyncSkipsSuccess: (state, action: PayloadAction<{ data: PaginationResponseDtoCbomSyncSkipDto }>) => {
            state.skipsData = action.payload.data;
            state.isFetchingList = false;
        },

        listSyncSkipsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        retrySyncSkip: (state, action: PayloadAction<{ uuid: string }>) => {
            state.retryingUuid = action.payload.uuid;
        },

        /**
         * The answered row is not patched into the page: the filters and the page size decide whether it still belongs
         * there at all, so the list is re-read instead.
         */
        retrySyncSkipSuccess: (state, action: PayloadAction<{ skip: CbomSyncSkipDto }>) => {
            state.retryingUuid = undefined;
            state.listRefreshToken += 1;
        },

        retrySyncSkipFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.retryingUuid = undefined;
        },
    },
});

const state = createSelector(
    (state: AppState) => state,
    (state) => state[slice.name],
);

const selectSkipsData = createSelector(state, (state) => state.skipsData);
const selectSkipList = createSelector(selectSkipsData, (data) => data?.items ?? []);
const selectIsFetchingList = createSelector(state, (state) => state.isFetchingList);
const selectRetryingUuid = createSelector(state, (state) => state.retryingUuid);
const selectListRefreshToken = createSelector(state, (state) => state.listRefreshToken);

export const selectors = {
    state,
    selectSkipsData,
    selectSkipList,
    selectIsFetchingList,
    selectRetryingUuid,
    selectListRefreshToken,
};

export const actions = slice.actions;

export default slice.reducer;
