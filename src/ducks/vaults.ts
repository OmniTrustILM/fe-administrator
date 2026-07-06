import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { SearchRequestModel } from 'types/certificate';
import type { VaultInstanceDetailDto, VaultInstanceDto, VaultInstanceRequestDto, VaultInstanceUpdateRequestDto } from 'types/openapi';
import type { AttributeDescriptorModel } from 'types/attributes';
import { resetSliceState } from './reducerUtils';

export type State = {
    vaults: VaultInstanceDto[];
    vault?: VaultInstanceDetailDto;

    vaultInstanceAttributeDescriptors: AttributeDescriptorModel[];
    vaultInstanceAttributesConnectorUuid: string | null;
    isFetchingVaultInstanceAttributes: boolean;

    isFetchingList: boolean;
    isFetchingDetail: boolean;

    isCreating: boolean;
    createVaultSucceeded: boolean;
    isUpdating: boolean;
    updateVaultSucceeded: boolean;
    isDeleting: boolean;
};

export const initialState: State = {
    vaults: [],

    vaultInstanceAttributeDescriptors: [],
    vaultInstanceAttributesConnectorUuid: null,
    isFetchingVaultInstanceAttributes: false,

    isFetchingList: false,
    isFetchingDetail: false,

    isCreating: false,
    createVaultSucceeded: false,
    isUpdating: false,
    updateVaultSucceeded: false,
    isDeleting: false,
};

export const slice = createSlice({
    name: 'vaults',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        listVaults: (state, action: PayloadAction<SearchRequestModel>) => {
            state.vaults = [];
            state.isFetchingList = true;
        },

        listVaultsSuccess: (state, action: PayloadAction<{ items: VaultInstanceDto[] }>) => {
            state.vaults = action.payload.items;
            state.isFetchingList = false;
        },

        listVaultsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getVaultDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.vault = undefined;
            state.isFetchingDetail = true;
        },

        getVaultDetailSuccess: (state, action: PayloadAction<{ vault: VaultInstanceDetailDto }>) => {
            state.vault = action.payload.vault;
            state.isFetchingDetail = false;
        },

        getVaultDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        getVaultInstanceAttributes: (state, action: PayloadAction<{ connectorUuid: string }>) => {
            state.isFetchingVaultInstanceAttributes = true;
            state.vaultInstanceAttributesConnectorUuid = action.payload.connectorUuid;
            state.vaultInstanceAttributeDescriptors = [];
        },

        getVaultInstanceAttributesSuccess: (
            state,
            action: PayloadAction<{ connectorUuid: string; attributes: AttributeDescriptorModel[] }>,
        ) => {
            if (state.vaultInstanceAttributesConnectorUuid === action.payload.connectorUuid) {
                state.vaultInstanceAttributeDescriptors = action.payload.attributes;
                state.vaultInstanceAttributesConnectorUuid = action.payload.connectorUuid;
            }
            state.isFetchingVaultInstanceAttributes = false;
        },

        getVaultInstanceAttributesFailure: (state, action: PayloadAction<{ connectorUuid: string }>) => {
            if (state.vaultInstanceAttributesConnectorUuid === action.payload.connectorUuid) {
                state.vaultInstanceAttributeDescriptors = [];
                state.vaultInstanceAttributesConnectorUuid = null;
            }
            state.isFetchingVaultInstanceAttributes = false;
        },

        createVault: (state, action: PayloadAction<{ request: VaultInstanceRequestDto }>) => {
            state.isCreating = true;
            state.createVaultSucceeded = false;
        },

        createVaultSuccess: (state, action: PayloadAction<{ vault: VaultInstanceDetailDto }>) => {
            state.isCreating = false;
            state.createVaultSucceeded = true;
            state.vault = action.payload.vault;
        },

        createVaultFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createVaultSucceeded = false;
        },

        updateVault: (state, action: PayloadAction<{ uuid: string; request: VaultInstanceUpdateRequestDto }>) => {
            state.isUpdating = true;
            state.updateVaultSucceeded = false;
        },

        updateVaultSuccess: (state, action: PayloadAction<{ vault: VaultInstanceDetailDto }>) => {
            state.isUpdating = false;
            state.updateVaultSucceeded = true;
            state.vault = action.payload.vault;
        },

        updateVaultFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateVaultSucceeded = false;
        },

        deleteVault: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteVaultSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            state.vaults = state.vaults.filter((v) => v.uuid !== action.payload.uuid);
            if (state.vault?.uuid === action.payload.uuid) {
                state.vault = undefined;
            }
        },

        deleteVaultFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore.vaults;

const vaults = createSelector(state, (state) => state.vaults);
const vault = createSelector(state, (state) => state.vault);
const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const createVaultSucceeded = createSelector(state, (state) => state.createVaultSucceeded);
const updateVaultSucceeded = createSelector(state, (state) => state.updateVaultSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);

const vaultInstanceAttributeDescriptors = createSelector(state, (state) => state.vaultInstanceAttributeDescriptors);
const vaultInstanceAttributesConnectorUuid = createSelector(state, (state) => state.vaultInstanceAttributesConnectorUuid);
const isFetchingVaultInstanceAttributes = createSelector(state, (state) => state.isFetchingVaultInstanceAttributes);

export const selectors = {
    state,
    vaults,
    vault,
    isFetchingList,
    isFetchingDetail,
    vaultInstanceAttributeDescriptors,
    vaultInstanceAttributesConnectorUuid,
    isFetchingVaultInstanceAttributes,
    isCreating,
    createVaultSucceeded,
    isUpdating,
    updateVaultSucceeded,
    isDeleting,
};

export const actions = slice.actions;

export default slice.reducer;
