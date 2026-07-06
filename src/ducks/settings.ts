import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type {
    SettingsPlatformModel,
    SettingsLoggingModel,
    SettingsPlatformUpdateModel,
    EventsSettingsDto,
    EventSettingsDto,
} from '../types/settings';

export type State = {
    platformSettings?: SettingsPlatformModel;
    isFetchingPlatform: boolean;
    isUpdatingPlatform: boolean;

    eventsSettings?: EventsSettingsDto;
    isFetchingEventsSetting: boolean;
    isUpdatingEventsSetting: boolean;
    updateEventSettingsSucceeded: boolean;

    loggingSettings?: SettingsLoggingModel;
    isFetchingLoggingSetting: boolean;
    isUpdatingLoggingSetting: boolean;
};

export const initialState: State = {
    isFetchingPlatform: false,
    isUpdatingPlatform: false,
    isFetchingEventsSetting: false,
    isUpdatingEventsSetting: false,
    updateEventSettingsSucceeded: false,
    isFetchingLoggingSetting: false,
    isUpdatingLoggingSetting: false,
};

export const slice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        getPlatformSettings: (state, action: PayloadAction<void>) => {
            state.isFetchingPlatform = true;
        },

        getPlatformSettingsSuccess: (state, action: PayloadAction<SettingsPlatformModel>) => {
            state.platformSettings = action.payload;
            state.isFetchingPlatform = false;
        },

        getPlatformSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingPlatform = false;
        },

        updatePlatformSettings: (state, action: PayloadAction<SettingsPlatformUpdateModel>) => {
            state.isUpdatingPlatform = true;
        },

        updatePlatformSettingsSuccess: (state, action: PayloadAction<SettingsPlatformUpdateModel>) => {
            state.isUpdatingPlatform = false;
            state.platformSettings = { ...state.platformSettings, ...action.payload };
        },

        updatePlatformSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingPlatform = false;
        },

        getEventsSettings: (state, action: PayloadAction<void>) => {
            state.isFetchingEventsSetting = true;
            state.updateEventSettingsSucceeded = false;
        },

        getEventsSettingsSuccess: (state, action: PayloadAction<EventsSettingsDto>) => {
            state.eventsSettings = action.payload;
            state.isFetchingEventsSetting = false;
        },

        getEventsSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingEventsSetting = false;
        },

        updateEventSettings: (state, action: PayloadAction<{ eventSettings: EventSettingsDto; redirect?: string }>) => {
            state.isUpdatingEventsSetting = true;
            state.updateEventSettingsSucceeded = false;
        },

        updateEventSettingsSuccess: (state, action: PayloadAction<{ eventSettings: EventSettingsDto; redirect?: string }>) => {
            state.isUpdatingEventsSetting = false;
            state.updateEventSettingsSucceeded = true;
            if (state.eventsSettings) {
                state.eventsSettings = {
                    eventsMapping: {
                        ...state.eventsSettings.eventsMapping,
                        [action.payload.eventSettings.event]: action.payload.eventSettings.triggerUuids,
                    },
                };
            }
        },

        updateEventSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingEventsSetting = false;
            state.updateEventSettingsSucceeded = false;
        },

        getLoggingSettings: (state, action: PayloadAction<void>) => {
            state.isFetchingLoggingSetting = true;
        },

        getLoggingSettingsSuccess: (state, action: PayloadAction<SettingsLoggingModel>) => {
            state.loggingSettings = action.payload;
            state.isFetchingLoggingSetting = false;
        },

        getLoggingSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingLoggingSetting = false;
        },

        updateLoggingSettings: (state, action: PayloadAction<SettingsLoggingModel>) => {
            state.isUpdatingLoggingSetting = true;
        },

        updateLoggingSettingsSuccess: (state, action: PayloadAction<SettingsLoggingModel>) => {
            state.isUpdatingLoggingSetting = false;
            state.loggingSettings = action.payload;
        },

        updateLoggingSettingsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingLoggingSetting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const platformSettings = createSelector(state, (state: State) => state.platformSettings);
const isFetchingPlatform = createSelector(state, (state: State) => state.isFetchingPlatform);
const isUpdatingPlatform = createSelector(state, (state: State) => state.isUpdatingPlatform);

const eventsSettings = createSelector(state, (state: State) => state.eventsSettings);
const isFetchingEventsSetting = createSelector(state, (state: State) => state.isFetchingEventsSetting);
const isUpdatingEventsSetting = createSelector(state, (state: State) => state.isUpdatingEventsSetting);
const updateEventSettingsSucceeded = createSelector(state, (state: State) => state.updateEventSettingsSucceeded);

const loggingSettings = createSelector(state, (state: State) => state.loggingSettings);
const isFetchingLoggingSetting = createSelector(state, (state: State) => state.isFetchingLoggingSetting);
const isUpdatingLoggingSetting = createSelector(state, (state: State) => state.isUpdatingLoggingSetting);

export const selectors = {
    state,
    platformSettings,
    isFetchingPlatform,
    isUpdatingPlatform,

    eventsSettings,
    isFetchingEventsSetting,
    isUpdatingEventsSetting,
    updateEventSettingsSucceeded,

    loggingSettings,
    isFetchingLoggingSetting,
    isUpdatingLoggingSetting,
};

export const actions = slice.actions;

export default slice.reducer;
