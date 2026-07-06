import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { Resource } from 'types/openapi';

export type ListFilterState = {
    resource?: Resource;
};

export type State = {
    byKey: Record<string, ListFilterState>;
};

const DEFAULT_LIST_FILTER_STATE: ListFilterState = {
    resource: undefined,
};

export const initialState: State = {
    byKey: {},
};

export const slice = createSlice({
    name: 'listFilters',

    initialState,

    reducers: {
        setListResource: (state, action: PayloadAction<{ key: string; resource?: Resource }>) => {
            state.byKey[action.payload.key] = {
                ...state.byKey[action.payload.key],
                resource: action.payload.resource,
            };
        },

        clearListFilter: (state, action: PayloadAction<{ key: string }>) => {
            delete state.byKey[action.payload.key];
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name] ?? initialState;

const listFilter =
    (key: string) =>
    (reduxStore: AppState): ListFilterState =>
        state(reduxStore).byKey[key] ?? DEFAULT_LIST_FILTER_STATE;

export const selectors = {
    state,
    listFilter,
};

export const actions = slice.actions;

export default slice.reducer;
