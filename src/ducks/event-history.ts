import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    EventHistoryRequestDto,
    PaginationResponseDtoEventHistoryDto,
    PaginationResponseDtoObjectEventHistoryDto,
    Resource,
    ResourceEvent,
} from 'types/openapi';

export type State = {
    eventHistory?: PaginationResponseDtoEventHistoryDto;
    isFetchingEventHistory: boolean;
    objectEventHistory?: PaginationResponseDtoObjectEventHistoryDto;
    isFetchingObjectEventHistory: boolean;
};

export const initialState: State = {
    isFetchingEventHistory: false,
    isFetchingObjectEventHistory: false,
};

export const slice = createSlice({
    name: 'eventHistory',
    initialState,
    reducers: {
        getPlatformSettingsEventHistory: (state, action: PayloadAction<{ event: ResourceEvent; request: EventHistoryRequestDto }>) => {
            state.eventHistory = undefined;
            state.isFetchingEventHistory = true;
        },
        getPlatformSettingsEventHistorySuccess: (state, action: PayloadAction<{ eventHistory: PaginationResponseDtoEventHistoryDto }>) => {
            state.eventHistory = action.payload.eventHistory;
            state.isFetchingEventHistory = false;
        },
        getPlatformSettingsEventHistoryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingEventHistory = false;
        },

        getObjectEventHistory: (
            state,
            action: PayloadAction<{ resource: Resource; uuid: string; itemsPerPage: number; pageNumber: number }>,
        ) => {
            state.objectEventHistory = undefined;
            state.isFetchingObjectEventHistory = true;
        },
        getObjectEventHistorySuccess: (
            state,
            action: PayloadAction<{ objectEventHistory: PaginationResponseDtoObjectEventHistoryDto }>,
        ) => {
            state.objectEventHistory = action.payload.objectEventHistory;
            state.isFetchingObjectEventHistory = false;
        },
        getObjectEventHistoryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingObjectEventHistory = false;
        },

        resetEventHistory: () => initialState,
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const eventHistory = createSelector(state, (s) => s.eventHistory);
const isFetchingEventHistory = createSelector(state, (s) => s.isFetchingEventHistory);
const objectEventHistory = createSelector(state, (s) => s.objectEventHistory);
const isFetchingObjectEventHistory = createSelector(state, (s) => s.isFetchingObjectEventHistory);

export const selectors = {
    state,
    eventHistory,
    isFetchingEventHistory,
    objectEventHistory,
    isFetchingObjectEventHistory,
};

export const actions = slice.actions;

export default slice.reducer;
