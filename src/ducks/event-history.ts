import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { SearchFieldListModel } from 'types/certificate';
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
    /** Condition filter fields per resource, so a record is only ever rendered with the fields of its own resource. */
    conditionFilterFieldsByResource: Partial<Record<Resource, SearchFieldListModel[]>>;
};

export const initialState: State = {
    isFetchingEventHistory: false,
    isFetchingObjectEventHistory: false,
    conditionFilterFieldsByResource: {},
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

        getConditionFilterFields: (state, action: PayloadAction<{ resource: Resource }>) => {},
        getConditionFilterFieldsSuccess: (state, action: PayloadAction<{ resource: Resource; filterFields: SearchFieldListModel[] }>) => {
            state.conditionFilterFieldsByResource[action.payload.resource] = action.payload.filterFields;
        },
        getConditionFilterFieldsFailure: (state, action: PayloadAction<{ resource: Resource; error: string | undefined }>) => {},

        resetEventHistory: () => initialState,
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const eventHistory = createSelector(state, (s) => s.eventHistory);
const isFetchingEventHistory = createSelector(state, (s) => s.isFetchingEventHistory);
const objectEventHistory = createSelector(state, (s) => s.objectEventHistory);
const isFetchingObjectEventHistory = createSelector(state, (s) => s.isFetchingObjectEventHistory);
const conditionFilterFields = (resource: Resource | undefined) =>
    createSelector(state, (s) => (resource ? s.conditionFilterFieldsByResource[resource] : undefined));

export const selectors = {
    state,
    eventHistory,
    isFetchingEventHistory,
    objectEventHistory,
    isFetchingObjectEventHistory,
    conditionFilterFields,
};

export const actions = slice.actions;

export default slice.reducer;
