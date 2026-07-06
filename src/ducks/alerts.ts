import { createSelector } from 'reselect';
import type { AppState } from 'ducks';
import { alertsSlice, type State } from './alert-slice';

const selectState = (reduxStore: AppState): State => reduxStore?.[alertsSlice.name];

const selectMessages = createSelector(selectState, (state) => state?.messages ?? []);

export const selectors = {
    selectState,
    selectMessages,
};

export const actions = alertsSlice.actions;

export default alertsSlice.reducer;
