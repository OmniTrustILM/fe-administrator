import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EntityType } from './filters';

export type State = {
    byEntity: Record<string, string>;
};

export const initialState: State = {
    byEntity: {},
};

export const slice = createSlice({
    name: 'listScopes',

    initialState,

    reducers: {
        registerScope: (state, action: PayloadAction<{ entity: EntityType; prefix: string }>) => {
            state.byEntity[action.payload.entity] = action.payload.prefix;
        },

        unregisterScope: (state, action: PayloadAction<{ entity: EntityType }>) => {
            delete state.byEntity[action.payload.entity];
        },
    },
});

const state = (reduxStore: any): State => reduxStore?.[slice.name] ?? initialState;

const registeredScopes = (reduxStore: any): Record<string, string> => state(reduxStore).byEntity;

export const selectors = {
    state,
    registeredScopes,
};

export const actions = slice.actions;

export default slice.reducer;
