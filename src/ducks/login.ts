import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';

export interface LoginMethod {
    name: string;
    loginUrl: string;
}

export type State = {
    loginMethods?: LoginMethod[];
    isFetching: boolean;
    error?: string;
};

export const initialState: State = {
    isFetching: false,
};

export const slice = createSlice({
    name: 'login',

    initialState,

    reducers: {
        getLoginMethods(state, action: PayloadAction<{ redirect?: string }>) {
            state.isFetching = true;
            state.error = undefined;
        },

        getLoginMethodsSuccess(state, action: PayloadAction<{ loginMethods: LoginMethod[] }>) {
            state.isFetching = false;
            state.loginMethods = action.payload.loginMethods;
        },

        getLoginMethodsFailure(state, action: PayloadAction<{ error: string }>) {
            state.isFetching = false;
            state.error = action.payload.error;
        },

        resetState(state, action: PayloadAction<void>) {
            resetSliceState(state, initialState);
        },
    },
});

const selectState = (reduxStore: AppState): State => reduxStore?.[slice.name];

export const selectors = {
    loginMethods: createSelector(selectState, (state) => state.loginMethods),
    isFetching: createSelector(selectState, (state) => state.isFetching),
    error: createSelector(selectState, (state) => state.error),
};

export const actions = slice.actions;

export default slice.reducer;
