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
    name: 'cbomActuator',
    initialState,
    reducers: {
        reset: (state) => {
            state.health = undefined;
            state.isFetching = false;
        },
        health: (state, action: PayloadAction<string | undefined>) => {
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

const createStateSelector = <T>(selector: (state: State) => T) => createSelector(state, selector);

const health = createStateSelector((state: State) => state.health);
const isFetching = createStateSelector((state: State) => state.isFetching);

export const selectors = {
    state,
    health,
    isFetching,
};

export const actions = slice.actions;

export default slice.reducer;
