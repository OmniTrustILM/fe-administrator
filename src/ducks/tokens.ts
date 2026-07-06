import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import type { ConnectorResponseModel } from 'types/connectors';
import { TokenInstanceStatus } from 'types/openapi';
import type { TokenDetailResponseModel, TokenRequestModel, TokenResponseModel } from 'types/tokens';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;

    token?: TokenDetailResponseModel;
    tokens: TokenResponseModel[];

    tokenProviders?: ConnectorResponseModel[];
    tokenProviderAttributeDescriptors?: AttributeDescriptorModel[];
    tokenProfileAttributeDescriptors?: AttributeDescriptorModel[];

    isFetchingTokenProviders: boolean;
    isFetchingTokenProviderAttributeDescriptors: boolean;
    isFetchingTokenProfileAttributesDescriptors: boolean;

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isCreating: boolean;
    createTokenSucceeded: boolean;
    isDeleting: boolean;
    isForceDeleting: boolean;
    isUpdating: boolean;
    updateTokenSucceeded: boolean;
    isBulkDeleting: boolean;

    isActivating: boolean;
    isDeactivating: boolean;
    isReloading: boolean;

    isFetchingActivationAttributeDescriptors: boolean;
    activationAttributeDescriptors?: AttributeDescriptorModel[];
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',

    tokens: [],

    isFetchingTokenProviders: false,
    isFetchingTokenProviderAttributeDescriptors: false,
    isFetchingTokenProfileAttributesDescriptors: false,

    isFetchingList: false,
    isFetchingDetail: false,
    isCreating: false,
    createTokenSucceeded: false,
    isDeleting: false,
    isForceDeleting: false,
    isUpdating: false,
    updateTokenSucceeded: false,
    isBulkDeleting: false,

    isActivating: false,
    isDeactivating: false,
    isReloading: false,

    isFetchingActivationAttributeDescriptors: false,
    activationAttributeDescriptors: [],
};

export const slice = createSlice({
    name: 'tokens',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
        },

        clearTokenProviderAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.tokenProviderAttributeDescriptors = [];
        },

        clearActivationAttributesDescriptors: (state, action: PayloadAction<void>) => {
            state.activationAttributeDescriptors = undefined;
        },

        clearTokenProfileAttributesDescriptors: (state, action: PayloadAction<void>) => {
            state.tokenProfileAttributeDescriptors = [];
        },

        listTokenProviders: (state, action: PayloadAction<void>) => {
            state.tokenProviders = undefined;
            state.isFetchingTokenProviders = true;
        },

        listTokenProvidersSuccess: (state, action: PayloadAction<{ connectors: ConnectorResponseModel[] }>) => {
            state.tokenProviders = action.payload.connectors;
            state.isFetchingTokenProviders = false;
        },

        listTokenProvidersFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTokenProviders = false;
        },

        getTokenProviderAttributesDescriptors: (state, action: PayloadAction<{ uuid: string; kind: string }>) => {
            state.tokenProviderAttributeDescriptors = [];
            state.isFetchingTokenProviderAttributeDescriptors = true;
        },

        getTokenProviderAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ attributeDescriptor: AttributeDescriptorModel[] }>,
        ) => {
            state.tokenProviderAttributeDescriptors = action.payload.attributeDescriptor;
            state.isFetchingTokenProviderAttributeDescriptors = false;
        },

        getTokenProviderAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTokenProviderAttributeDescriptors = false;
        },

        getTokenProfileAttributesDescriptors: (state, action: PayloadAction<{ tokenUuid: string }>) => {
            state.isFetchingTokenProfileAttributesDescriptors = true;
        },

        getTokenProfileAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ tokenUuid: string; attributesDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingTokenProfileAttributesDescriptors = false;
            state.tokenProfileAttributeDescriptors = action.payload.attributesDescriptors;
        },

        getTokenProfileAttributesDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingTokenProfileAttributesDescriptors = false;
        },

        listTokens: (state, action: PayloadAction<void>) => {
            state.tokens = [];
            state.isFetchingList = true;
        },

        listTokensSuccess: (state, action: PayloadAction<{ tokenList: TokenResponseModel[] }>) => {
            state.tokens = action.payload.tokenList;
            state.isFetchingList = false;
        },

        listTokensFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getTokenDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            if (state.token?.uuid !== action.payload.uuid) {
                state.token = undefined;
            }
            state.isFetchingDetail = true;
        },

        getTokenDetailSuccess: (state, action: PayloadAction<{ token: TokenDetailResponseModel }>) => {
            state.isFetchingDetail = false;

            state.token = action.payload.token;
        },

        getTokenDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        createToken: (state, action: PayloadAction<TokenRequestModel>) => {
            state.isCreating = true;
            state.createTokenSucceeded = false;
        },

        createTokenSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isCreating = false;
            state.createTokenSucceeded = true;
        },

        createTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createTokenSucceeded = false;
        },

        updateToken: (state, action: PayloadAction<{ uuid: string; updateToken: TokenRequestModel }>) => {
            state.isUpdating = true;
            state.updateTokenSucceeded = false;
        },

        updateTokenSuccess: (state, action: PayloadAction<{ token: TokenDetailResponseModel }>) => {
            state.isUpdating = false;
            state.updateTokenSucceeded = true;

            state.token = action.payload.token;
        },

        updateTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateTokenSucceeded = false;
        },

        listActivationAttributeDescriptors: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isFetchingActivationAttributeDescriptors = true;
        },

        listActivationAttributesDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributesDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingActivationAttributeDescriptors = false;

            state.activationAttributeDescriptors = action.payload.attributesDescriptors;
        },

        listActivationAttributesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingActivationAttributeDescriptors = false;
        },

        activateToken: (state, action: PayloadAction<{ uuid: string; request: Array<AttributeRequestModel> }>) => {
            state.isActivating = true;
        },

        activateTokenSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isActivating = false;

            const token = state.tokens.find((token) => token.uuid === action.payload.uuid);
            if (token) token.status = TokenInstanceStatus.Activated;

            if (state.token?.uuid === action.payload.uuid) state.token.status.status = TokenInstanceStatus.Activated;
        },

        activateTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isActivating = false;
        },

        deactivateToken: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivating = true;
        },

        deactivateTokenSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeactivating = false;

            const token = state.tokens.find((token) => token.uuid === action.payload.uuid);
            if (token) token.status = TokenInstanceStatus.Deactivated;

            if (state.token?.uuid === action.payload.uuid) state.token.status.status = TokenInstanceStatus.Deactivated;
        },

        deactivateTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeactivating = false;
        },

        reloadToken: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isReloading = true;
        },

        reloadSuccess: (state, action: PayloadAction<{ token: TokenDetailResponseModel }>) => {
            state.isReloading = false;

            state.token = action.payload.token;
        },

        reloadFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isReloading = false;
        },

        deleteToken: (state, action: PayloadAction<{ uuid: string }>) => {
            state.deleteErrorMessage = '';
            state.isDeleting = true;
        },

        deleteTokenSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;

            const index = state.tokens.findIndex((a) => a.uuid === action.payload.uuid);

            if (index !== -1) state.tokens.splice(index, 1);

            if (state.token?.uuid === action.payload.uuid) state.token = undefined;
        },

        deleteTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.deleteErrorMessage = action.payload.error || 'Unknown error';
            state.isDeleting = false;
        },

        bulkDeleteToken: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = true;
        },

        bulkDeleteTokenSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.tokens.findIndex((token) => token.uuid === uuid);
                if (index !== -1) state.tokens.splice(index, 1);
            });

            if (state.token && action.payload.uuids.includes(state.token.uuid)) state.token = undefined;
        },

        bulkDeleteTokenFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state) => state.checkedRows);

const deleteErrorMessage = createSelector(state, (state) => state.deleteErrorMessage);

const tokenProviders = createSelector(state, (state) => state.tokenProviders);
const tokenProviderAttributeDescriptors = createSelector(state, (state) => state.tokenProviderAttributeDescriptors);

const token = createSelector(state, (state) => state.token);
const tokens = createSelector(state, (state) => state.tokens);
const tokenProfileAttributeDescriptors = createSelector(state, (state) => state.tokenProfileAttributeDescriptors);

const isFetchingTokenProviders = createSelector(state, (state) => state.isFetchingTokenProviders);
const isFetchingTokenProviderAttributeDescriptors = createSelector(state, (state) => state.isFetchingTokenProviderAttributeDescriptors);
const isFetchingTokenProfileAttributesDescriptors = createSelector(state, (state) => state.isFetchingTokenProfileAttributesDescriptors);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isCreating = createSelector(state, (state) => state.isCreating);
const createTokenSucceeded = createSelector(state, (state) => state.createTokenSucceeded);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateTokenSucceeded = createSelector(state, (state) => state.updateTokenSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isActivating = createSelector(state, (state) => state.isActivating);
const isDeactivating = createSelector(state, (state) => state.isDeactivating);
const isReloading = createSelector(state, (state) => state.isReloading);
const isBulkDeleting = createSelector(state, (state) => state.isBulkDeleting);
const activationAttributes = createSelector(state, (state) => state.activationAttributeDescriptors);
const isFetchingActivationAttributeDescriptors = createSelector(state, (state) => state.isFetchingActivationAttributeDescriptors);

export const selectors = {
    state,

    checkedRows,

    deleteErrorMessage,

    tokenProviders,
    tokenProviderAttributeDescriptors,

    token,
    tokens,
    tokenProfileAttributeDescriptors,

    isFetchingTokenProviders,
    isFetchingTokenProviderAttributeDescriptors,
    isFetchingTokenProfileAttributesDescriptors,

    isFetchingList,
    isFetchingDetail,
    isCreating,
    createTokenSucceeded,
    isUpdating,
    updateTokenSucceeded,
    isDeleting,
    isBulkDeleting,
    isActivating,
    isDeactivating,
    isReloading,
    activationAttributes,
    isFetchingActivationAttributeDescriptors,
};

export const actions = slice.actions;

export default slice.reducer;
