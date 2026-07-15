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

    // Platform default set (/platform CertificateSettings.requestAttributes)
    defaultSet?: CertificateRequestAttributesSettingsDto;
    isFetchingDefaultSet: boolean;
    isUpdatingDefaultSet: boolean;
    updateDefaultSetSucceeded: boolean;
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
        },

        updateRaProfileRequestAttributesSuccess: (state, action: PayloadAction<{ set?: RaProfileCertificateRequestAttributesDto }>) => {
            state.isUpdatingRaProfileSet = false;
            state.updateRaProfileSetSucceeded = true;
            state.raProfileSet = action.payload.set;
        },

        updateRaProfileRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingRaProfileSet = false;
            state.updateRaProfileSetSucceeded = false;
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
        },

        updatePlatformDefaultRequestAttributesSuccess: (state, action: PayloadAction<CertificateRequestAttributesSettingsDto>) => {
            state.isUpdatingDefaultSet = false;
            state.updateDefaultSetSucceeded = true;
            state.defaultSet = action.payload;
        },

        updatePlatformDefaultRequestAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingDefaultSet = false;
            state.updateDefaultSetSucceeded = false;
        },
    },
});

const state = (reduxStore: { [slice.name]?: State }): State => reduxStore?.[slice.name] ?? initialState;

const raProfileSet = createSelector(state, (state: State) => state.raProfileSet);
const isUpdatingRaProfileSet = createSelector(state, (state: State) => state.isUpdatingRaProfileSet);
const updateRaProfileSetSucceeded = createSelector(state, (state: State) => state.updateRaProfileSetSucceeded);

const defaultSet = createSelector(state, (state: State) => state.defaultSet);
const isFetchingDefaultSet = createSelector(state, (state: State) => state.isFetchingDefaultSet);
const isUpdatingDefaultSet = createSelector(state, (state: State) => state.isUpdatingDefaultSet);
const updateDefaultSetSucceeded = createSelector(state, (state: State) => state.updateDefaultSetSucceeded);

export const selectors = {
    state,
    raProfileSet,
    isUpdatingRaProfileSet,
    updateRaProfileSetSucceeded,
    defaultSet,
    isFetchingDefaultSet,
    isUpdatingDefaultSet,
    updateDefaultSetSucceeded,
};

export const actions = slice.actions;

export default slice.reducer;
