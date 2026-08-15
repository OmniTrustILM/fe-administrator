import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import { resetSliceState } from 'ducks/reducerUtils';
import type { BrandingSettingsModel, BrandingSettingsUpdateModel, PublicBrandingModel } from 'types/branding';

/**
 * What an instance with no branding configured looks like. Held here rather than assembled at each call site so the
 * ENV-disabled path, the unbranded-instance path and a failed read all resolve to the same thing: a client that reads
 * `configured: false` applies the platform's own themes.
 */
export const platformDefaultBranding: PublicBrandingModel = { configured: false };

export type State = {
    /** The operator's stored branding, read through the authenticated settings API for the Appearance tab. */
    branding?: BrandingSettingsModel;

    /** The subset an unauthenticated caller may read, used by the login page before there is any session. */
    publicBranding?: PublicBrandingModel;

    isFetchingBranding: boolean;
    isFetchingPublicBranding: boolean;
    isUpdatingBranding: boolean;
    updateSucceeded: boolean;
    isResettingBranding: boolean;
    resetSucceeded: boolean;

    error?: string;
};

export const initialState: State = {
    isFetchingBranding: false,
    isFetchingPublicBranding: false,
    isUpdatingBranding: false,
    updateSucceeded: false,
    isResettingBranding: false,
    resetSucceeded: false,
};

export const slice = createSlice({
    name: 'branding',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        getBranding: (state, action: PayloadAction<void>) => {
            state.isFetchingBranding = true;
            state.error = undefined;
        },

        getBrandingSuccess: (state, action: PayloadAction<{ branding: BrandingSettingsModel }>) => {
            state.branding = action.payload.branding;
            state.isFetchingBranding = false;
        },

        getBrandingFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingBranding = false;
            state.error = action.payload.error;
        },

        getPublicBranding: (state, action: PayloadAction<void>) => {
            state.isFetchingPublicBranding = true;
            state.error = undefined;
        },

        getPublicBrandingSuccess: (state, action: PayloadAction<{ branding: PublicBrandingModel }>) => {
            state.publicBranding = action.payload.branding;
            state.isFetchingPublicBranding = false;
        },

        /**
         * A failed read still settles on the platform default. The login page renders before anyone can be told about
         * an error, so leaving branding undefined would only mean rendering nothing at all.
         */
        getPublicBrandingFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.publicBranding = platformDefaultBranding;
            state.isFetchingPublicBranding = false;
            state.error = action.payload.error;
        },

        updateBranding: (state, action: PayloadAction<{ branding: BrandingSettingsUpdateModel }>) => {
            state.isUpdatingBranding = true;
            state.updateSucceeded = false;
            state.error = undefined;
        },

        updateBrandingSuccess: (state, action: PayloadAction<{ branding: BrandingSettingsModel }>) => {
            state.branding = action.payload.branding;
            state.isUpdatingBranding = false;
            state.updateSucceeded = true;
        },

        updateBrandingFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingBranding = false;
            state.updateSucceeded = false;
            state.error = action.payload.error;
        },

        /**
         * Reset to default is an update with nothing in it: Core removes the stored row for every field left unset, so
         * each one falls back to its platform default independently.
         */
        resetBranding: (state, action: PayloadAction<void>) => {
            state.isResettingBranding = true;
            state.resetSucceeded = false;
            state.error = undefined;
        },

        resetBrandingSuccess: (state, action: PayloadAction<void>) => {
            state.branding = {};
            state.isResettingBranding = false;
            state.resetSucceeded = true;
        },

        resetBrandingFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isResettingBranding = false;
            state.resetSucceeded = false;
            state.error = action.payload.error;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const branding = createSelector(state, (state) => state?.branding);
const publicBranding = createSelector(state, (state) => state?.publicBranding);

const isFetchingBranding = createSelector(state, (state) => state?.isFetchingBranding);
const isFetchingPublicBranding = createSelector(state, (state) => state?.isFetchingPublicBranding);
const isUpdatingBranding = createSelector(state, (state) => state?.isUpdatingBranding);
const updateSucceeded = createSelector(state, (state) => state?.updateSucceeded);
const isResettingBranding = createSelector(state, (state) => state?.isResettingBranding);
const resetSucceeded = createSelector(state, (state) => state?.resetSucceeded);
const error = createSelector(state, (state) => state?.error);

export const selectors = {
    state,
    branding,
    publicBranding,

    isFetchingBranding,
    isFetchingPublicBranding,
    isUpdatingBranding,
    updateSucceeded,
    isResettingBranding,
    resetSucceeded,
    error,
};

export const actions = slice.actions;

export default slice.reducer;
