import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EnumItemModel, PlatformEnumModel } from 'types/enums';
import type { PlatformEnum } from 'types/openapi';

export type State = {
    platformEnums: PlatformEnumModel;
};

export const initialState: State = {
    platformEnums: {},
};

export const slice = createSlice({
    name: 'enums',
    initialState,
    reducers: {
        getPlatformEnums: (state, action: PayloadAction<void>) => {
            state.platformEnums = {};
        },

        getPlatformEnumsSuccess: (state, action: PayloadAction<PlatformEnumModel>) => {
            state.platformEnums = action.payload;
        },
    },
});

const state = (reduxStore: any): State | undefined => reduxStore?.[slice.name];

const platformEnums = createSelector(state, (featureState) => featureState?.platformEnums ?? {});

const platformEnum = (platformEnum: PlatformEnum) => createSelector(platformEnums, (allEnums) => allEnums[platformEnum]);

export const getEnumLabel = (platformEnum: { [key: string]: EnumItemModel } | undefined, enumItemKey: string): string =>
    platformEnum ? (platformEnum[enumItemKey]?.label ?? enumItemKey) : enumItemKey;

export const getEnumDescription = (
    platformEnum: { [key: string]: EnumItemModel } | undefined,
    enumItemKey: string | undefined,
): string | undefined => (platformEnum && enumItemKey ? platformEnum[enumItemKey]?.description : undefined);

export const selectors = {
    state,
    platformEnums,
    platformEnum,
};

export const actions = slice.actions;

export default slice.reducer;
