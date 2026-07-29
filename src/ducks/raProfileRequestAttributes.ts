import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    CertificateRequestAttributesSettingsDto,
    CertificateRequestAttributesSettingsUpdateDto,
    RaProfileCertificateRequestAttributesDto,
    RaProfileCertificateRequestAttributesUpdateDto,
} from 'types/openapi';

export type State = {
    // Per-RA-Profile static set + bindings (PATCH .../requestAttributes)
    raProfileSet?: RaProfileCertificateRequestAttributesDto;
    isUpdatingRaProfileSet: boolean;
    updateRaProfileSetSucceeded: boolean;
    /** Rejection message of the last update; the editor shows it and rolls back to the persisted set. */
    updateRaProfileSetError?: string;

    // Platform default set (/platform CertificateSettings.requestAttributes)
    defaultSet?: CertificateRequestAttributesSettingsDto;
    isFetchingDefaultSet: boolean;
    isUpdatingDefaultSet: boolean;
    updateDefaultSetSucceeded: boolean;
    updateDefaultSetError?: string;
};

export const initialState: State = {
    isUpdatingRaProfileSet: false,
    updateRaProfileSetSucceeded: false,
    isFetchingDefaultSet: false,
    isUpdatingDefaultSet: false,
    updateDefaultSetSucceeded: false,
};

export const slice = createSlice({
    name: 'raProfileRequestAttributes',
    initialState,
    reducers: {
        updateRaProfileRequestAttributes: (
            state,
            action: PayloadAction<{
                authorityUuid: string;
                raProfileUuid: string;
                data: RaProfileCertificateRequestAttributesUpdateDto;
            }>,
        ) => {
            state.isUpdatingRaProfileSet = true;
            state.updateRaProfileSetSucceeded = false;
            state.updateRaProfileSetError = undefined;
        },

        updateRaProfileRequestAttributesSuccess: (state, action: PayloadAction<{ set?: RaProfileCertificateRequestAttributesDto }>) => {
            state.isUpdatingRaProfileSet = false;
            state.updateRaProfileSetSucceeded = true;
            state.updateRaProfileSetError = undefined;
            state.raProfileSet = action.payload.set;
        },

        updateRaProfileRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRaProfileSet = false;
            state.updateRaProfileSetSucceeded = false;
            state.updateRaProfileSetError = action.payload.error;
        },

        getPlatformDefaultRequestAttributes: (state, action: PayloadAction<void>) => {
            state.isFetchingDefaultSet = true;
        },

        getPlatformDefaultRequestAttributesSuccess: (state, action: PayloadAction<CertificateRequestAttributesSettingsDto>) => {
            state.isFetchingDefaultSet = false;
            state.defaultSet = action.payload;
        },

        getPlatformDefaultRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDefaultSet = false;
        },

        updatePlatformDefaultRequestAttributes: (state, action: PayloadAction<{ data: CertificateRequestAttributesSettingsUpdateDto }>) => {
            state.isUpdatingDefaultSet = true;
            state.updateDefaultSetSucceeded = false;
            state.updateDefaultSetError = undefined;
        },

        updatePlatformDefaultRequestAttributesSuccess: (state, action: PayloadAction<CertificateRequestAttributesSettingsDto>) => {
            state.isUpdatingDefaultSet = false;
            state.updateDefaultSetSucceeded = true;
            state.updateDefaultSetError = undefined;
            state.defaultSet = action.payload;
        },

        updatePlatformDefaultRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingDefaultSet = false;
            state.updateDefaultSetSucceeded = false;
            state.updateDefaultSetError = action.payload.error;
        },
    },
});

const state = (reduxStore: { [slice.name]?: State }): State => reduxStore?.[slice.name] ?? initialState;

const raProfileSet = createSelector(state, (state: State) => state.raProfileSet);
const isUpdatingRaProfileSet = createSelector(state, (state: State) => state.isUpdatingRaProfileSet);
const updateRaProfileSetSucceeded = createSelector(state, (state: State) => state.updateRaProfileSetSucceeded);
const updateRaProfileSetError = createSelector(state, (state: State) => state.updateRaProfileSetError);

const defaultSet = createSelector(state, (state: State) => state.defaultSet);
const isFetchingDefaultSet = createSelector(state, (state: State) => state.isFetchingDefaultSet);
const isUpdatingDefaultSet = createSelector(state, (state: State) => state.isUpdatingDefaultSet);
const updateDefaultSetSucceeded = createSelector(state, (state: State) => state.updateDefaultSetSucceeded);
const updateDefaultSetError = createSelector(state, (state: State) => state.updateDefaultSetError);

export const selectors = {
    state,
    raProfileSet,
    isUpdatingRaProfileSet,
    updateRaProfileSetSucceeded,
    updateRaProfileSetError,
    defaultSet,
    isFetchingDefaultSet,
    isUpdatingDefaultSet,
    updateDefaultSetSucceeded,
    updateDefaultSetError,
};

export const actions = slice.actions;

export default slice.reducer;
