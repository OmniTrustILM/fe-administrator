import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';

export type State = {
    health?: object;
    isFetching: boolean;
};

export const initialState: State = {
    isFetching: false,
};

export const slice = createSlice({
    name: 'utilsActuator',
    initialState,
    reducers: {
        reset: (state) => {
            state.health = undefined;
        },
        health: (state, action: PayloadAction<void>) => {
            state.health = undefined;
            state.isFetching = true;
        },

        healthSuccess: (state, action: PayloadAction<object>) => {
            state.health = action.payload;
            state.isFetching = false;
        },

        healthFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetching = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const health = createSelector(state, (state: State) => state.health);
const isFetching = createSelector(state, (state: State) => state.isFetching);

export const selectors = {
    state,
    health,
    isFetching,
};

export const actions = slice.actions;

export default slice.reducer;
