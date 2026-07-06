import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from 'ducks';
import type { SearchRequestModel } from 'types/certificate';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import type {
    SecretContent,
    SecretDetailDto,
    SecretDto,
    SecretRequestDto,
    SecretType,
    SecretUpdateObjectsDto,
    SecretUpdateRequestDto,
    SecretVersionDto,
} from 'types/openapi';
import { resetSliceState } from './reducerUtils';

export type State = {
    secrets: SecretDto[];
    secret?: SecretDetailDto;
    versions: SecretVersionDto[];
    secretContent?: SecretContent;

    secretCreationAttributeDescriptors: AttributeDescriptorModel[];
    isFetchingSecretCreationAttributes: boolean;
    syncVaultProfileAttributeDescriptors: AttributeDescriptorModel[];
    isFetchingSyncVaultProfileAttributes: boolean;

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isFetchingVersions: boolean;
    isFetchingContent: boolean;

    isCreating: boolean;
    createSecretSucceeded: boolean;
    isUpdating: boolean;
    updateSecretSucceeded: boolean;
    isDeleting: boolean;
    isEnabling: boolean;
    isDisabling: boolean;
};

export const initialState: State = {
    secrets: [],
    versions: [],

    secretCreationAttributeDescriptors: [],
    isFetchingSecretCreationAttributes: false,
    syncVaultProfileAttributeDescriptors: [],
    isFetchingSyncVaultProfileAttributes: false,

    isFetchingList: false,
    isFetchingDetail: false,
    isFetchingVersions: false,
    isFetchingContent: false,

    isCreating: false,
    createSecretSucceeded: false,
    isUpdating: false,
    updateSecretSucceeded: false,
    isDeleting: false,
    isEnabling: false,
    isDisabling: false,
};

export const slice = createSlice({
    name: 'secrets',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        clearSecret: (state, action: PayloadAction<void>) => {
            state.secret = undefined;
            state.versions = [];
            state.secretContent = undefined;
            state.isFetchingContent = false;
        },

        getSecretContent: (state, action: PayloadAction<{ uuid: string }>) => {
            state.secretContent = undefined;
            state.isFetchingContent = true;
        },

        getSecretContentSuccess: (state, action: PayloadAction<{ content: SecretContent }>) => {
            state.secretContent = action.payload.content;
            state.isFetchingContent = false;
        },

        getSecretContentFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingContent = false;
        },

        clearSecretContent: (state) => {
            state.secretContent = undefined;
        },

        listSecrets: (state, action: PayloadAction<SearchRequestModel>) => {
            state.secrets = [];
            state.isFetchingList = true;
        },

        listSecretsSuccess: (state, action: PayloadAction<{ secrets: SecretDto[] }>) => {
            state.secrets = action.payload.secrets;
            state.isFetchingList = false;
        },

        listSecretsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getSecretDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.secret = undefined;
            state.isFetchingDetail = true;
        },

        getSecretDetailSuccess: (state, action: PayloadAction<{ secret: SecretDetailDto }>) => {
            state.secret = action.payload.secret;
            state.isFetchingDetail = false;
        },

        getSecretDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        getSecretVersions: (state, action: PayloadAction<{ uuid: string }>) => {
            state.versions = [];
            state.isFetchingVersions = true;
        },

        getSecretVersionsSuccess: (state, action: PayloadAction<{ versions: SecretVersionDto[] }>) => {
            state.versions = action.payload.versions;
            state.isFetchingVersions = false;
        },

        getSecretVersionsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingVersions = false;
        },

        listSecretAttributes: (state, _action: PayloadAction<{ vaultUuid: string; vaultProfileUuid: string; secretType: SecretType }>) => {
            state.secretCreationAttributeDescriptors = [];
            state.isFetchingSecretCreationAttributes = true;
        },

        listSecretAttributesSuccess: (state, action: PayloadAction<{ descriptors: AttributeDescriptorModel[] }>) => {
            state.secretCreationAttributeDescriptors = action.payload.descriptors;
            state.isFetchingSecretCreationAttributes = false;
        },

        listSecretAttributesFailure: (state) => {
            state.isFetchingSecretCreationAttributes = false;
        },

        getSyncVaultProfileAttributes: (
            state,
            _action: PayloadAction<{ vaultUuid: string; vaultProfileUuid: string; secretType: SecretType }>,
        ) => {
            state.syncVaultProfileAttributeDescriptors = [];
            state.isFetchingSyncVaultProfileAttributes = true;
        },

        getSyncVaultProfileAttributesSuccess: (state, action: PayloadAction<{ descriptors: AttributeDescriptorModel[] }>) => {
            state.syncVaultProfileAttributeDescriptors = action.payload.descriptors;
            state.isFetchingSyncVaultProfileAttributes = false;
        },

        getSyncVaultProfileAttributesFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingSyncVaultProfileAttributes = false;
        },

        createSecret: (state, action: PayloadAction<{ vaultUuid: string; vaultProfileUuid: string; request: SecretRequestDto }>) => {
            state.isCreating = true;
            state.createSecretSucceeded = false;
        },

        createSecretSuccess: (state, action: PayloadAction<{ secret: SecretDetailDto }>) => {
            state.isCreating = false;
            state.createSecretSucceeded = true;
            state.secret = action.payload.secret;
        },

        createSecretFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createSecretSucceeded = false;
        },

        updateSecret: (state, action: PayloadAction<{ uuid: string; update: SecretUpdateRequestDto }>) => {
            state.isUpdating = true;
            state.updateSecretSucceeded = false;
        },

        updateSecretSuccess: (state, action: PayloadAction<{ secret: SecretDetailDto }>) => {
            state.isUpdating = false;
            state.updateSecretSucceeded = true;
            state.secret = action.payload.secret;
        },

        updateSecretFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateSecretSucceeded = false;
        },

        updateSecretObjects: (state, action: PayloadAction<{ uuid: string; update: SecretUpdateObjectsDto }>) => {
            state.isUpdating = true;
            state.updateSecretSucceeded = false;
        },

        updateSecretObjectsSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isUpdating = false;
            state.updateSecretSucceeded = true;
        },

        updateSecretObjectsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateSecretSucceeded = false;
        },

        addSyncVaultProfile: (
            state,
            _action: PayloadAction<{ uuid: string; vaultProfileUuid: string; attributes: AttributeRequestModel[] }>,
        ) => {
            state.isUpdating = true;
        },

        addSyncVaultProfileSuccess: (state, _action: PayloadAction<{ uuid: string }>) => {
            state.isUpdating = false;
        },

        addSyncVaultProfileFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        removeSyncVaultProfile: (state, _action: PayloadAction<{ uuid: string; vaultProfileUuid: string }>) => {
            state.isUpdating = true;
        },

        removeSyncVaultProfileSuccess: (state, _action: PayloadAction<{ uuid: string; vaultProfileUuid: string }>) => {
            state.isUpdating = false;
        },

        removeSyncVaultProfileFailure: (state, _action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
        },

        deleteSecret: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = true;
        },

        deleteSecretSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDeleting = false;
            state.secrets = state.secrets.filter((s) => s.uuid !== action.payload.uuid);
            if (state.secret?.uuid === action.payload.uuid) {
                state.secret = undefined;
                state.versions = [];
            }
        },

        deleteSecretFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        enableSecret: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = true;
        },

        enableSecretSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;
            state.secrets = state.secrets.map((secret) => (secret.uuid === action.payload.uuid ? { ...secret, enabled: true } : secret));
            if (state.secret?.uuid === action.payload.uuid) {
                state.secret = { ...state.secret, enabled: true };
            }
        },

        enableSecretFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableSecret: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = true;
        },

        disableSecretSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;
            state.secrets = state.secrets.map((secret) => (secret.uuid === action.payload.uuid ? { ...secret, enabled: false } : secret));
            if (state.secret?.uuid === action.payload.uuid) {
                state.secret = { ...state.secret, enabled: false };
            }
        },

        disableSecretFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore.secrets;

const secrets = createSelector(state, (state) => state.secrets);
const secret = createSelector(state, (state) => state.secret);
const versions = createSelector(state, (state) => state.versions);
const secretContent = createSelector(state, (state) => state.secretContent);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isFetchingVersions = createSelector(state, (state) => state.isFetchingVersions);
const isFetchingContent = createSelector(state, (state) => state.isFetchingContent);

const isCreating = createSelector(state, (state) => state.isCreating);
const createSecretSucceeded = createSelector(state, (state) => state.createSecretSucceeded);
const isUpdating = createSelector(state, (state) => state.isUpdating);
const updateSecretSucceeded = createSelector(state, (state) => state.updateSecretSucceeded);
const isDeleting = createSelector(state, (state) => state.isDeleting);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);

const secretCreationAttributeDescriptors = createSelector(state, (state) => state.secretCreationAttributeDescriptors);
const isFetchingSecretCreationAttributes = createSelector(state, (state) => state.isFetchingSecretCreationAttributes);
const syncVaultProfileAttributeDescriptors = createSelector(state, (state) => state.syncVaultProfileAttributeDescriptors);
const isFetchingSyncVaultProfileAttributes = createSelector(state, (state) => state.isFetchingSyncVaultProfileAttributes);

export const selectors = {
    state,

    secrets,
    secret,
    versions,
    secretContent,

    isFetchingList,
    isFetchingDetail,
    isFetchingVersions,
    isFetchingContent,

    isCreating,
    createSecretSucceeded,
    isUpdating,
    updateSecretSucceeded,
    isDeleting,
    isEnabling,
    isDisabling,

    secretCreationAttributeDescriptors,
    isFetchingSecretCreationAttributes,
    syncVaultProfileAttributeDescriptors,
    isFetchingSyncVaultProfileAttributes,
};

export const actions = slice.actions;

export default slice.reducer;
