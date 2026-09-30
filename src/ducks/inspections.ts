import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { InspectionRequestDto, InspectionResponseDto } from 'types/openapi';
import type { AppState } from 'ducks';

export type State = {
    inspection?: InspectionResponseDto;
    inspectionError?: string;
    /** The HTTP status Core refused the latest inspection with, if it answered. */
    inspectionErrorStatus?: number;
    isInspecting: boolean;
};

export const initialState: State = {
    isInspecting: false,
};

export const slice = createSlice({
    name: 'inspections',

    initialState,

    reducers: {
        inspectFile: (state, action: PayloadAction<{ inspectionRequestDto: InspectionRequestDto }>) => {
            state.isInspecting = true;
            state.inspectionError = undefined;
            state.inspectionErrorStatus = undefined;
        },

        inspectFileSuccess: (state, action: PayloadAction<{ inspection: InspectionResponseDto }>) => {
            state.isInspecting = false;
            state.inspection = action.payload.inspection;
        },

        inspectFileFailure: (state, action: PayloadAction<{ error: string | undefined; status?: number }>) => {
            state.isInspecting = false;
            state.inspectionError = action.payload.error;
            state.inspectionErrorStatus = action.payload.status;
        },

        resetInspection: (state, action: PayloadAction<void>) => {
            state.inspection = undefined;
            state.inspectionError = undefined;
            state.inspectionErrorStatus = undefined;
            state.isInspecting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const inspection = createSelector(state, (state) => state.inspection);
const inspectionError = createSelector(state, (state) => state.inspectionError);
const inspectionErrorStatus = createSelector(state, (state) => state.inspectionErrorStatus);
const isInspecting = createSelector(state, (state) => state.isInspecting);

export const selectors = {
    state,
    inspection,
    inspectionError,
    inspectionErrorStatus,
    isInspecting,
};

export const actions = slice.actions;

export default slice.reducer;
