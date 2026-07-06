import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { BulkActionModel } from 'types/connectors';
import type {
    CryptographicKeyAddRequestModel,
    CryptographicKeyBulkCompromiseRequestModel,
    CryptographicKeyCompromiseRequestModel,
    CryptographicKeyDetailResponseModel,
    CryptographicKeyEditRequestModel,
    CryptographicKeyHistoryModel,
    CryptographicKeyItemBulkCompromiseRequestModel,
    CryptographicKeyItemDetailResponseModel,
    CryptographicKeyItemEditRequestDto,
    CryptographicKeyKeyUsageBulkUpdateRequestModel,
    CryptographicKeyKeyUsageUpdateRequestModel,
    CryptographicKeyPairResponseModel,
    CryptographicKeyResponseModel,
} from 'types/cryptographic-keys';
import { type KeyRequestType, KeyState, type KeyUsage } from 'types/openapi';
import type { SearchRequestModel } from '../types/certificate';

export type State = {
    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    keyAttributeDescriptors?: AttributeDescriptorModel[];

    cryptographicKey?: CryptographicKeyDetailResponseModel;
    cryptographicKeys: CryptographicKeyResponseModel[];
    cryptographicKeyPairs: CryptographicKeyPairResponseModel[];
    altCryptographicKeyPairs: CryptographicKeyPairResponseModel[];

    isFetchingKeyPairs: boolean;
    isFetchingDetail: boolean;
    isUpdatingKeyItem: boolean;
    isUpdatingKeyUsage: boolean;
    isBulkUpdatingKeyUsage: boolean;

    isCreating: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
    createCryptographicKeySucceeded: boolean;
    isEnabling: boolean;
    isBulkEnabling: boolean;
    isDisabling: boolean;
    updateCryptographicKeySucceeded: boolean;
    isBulkDisabling: boolean;
    isCompromising: boolean;
    isBulkCompromising: boolean;
    isDestroying: boolean;
    isBulkDestroying: boolean;
    isSyncing: boolean;

    isFetchingAttributes: boolean;

    isFetchingHistory: boolean;

    keyHistory?: { uuid: string; history: CryptographicKeyHistoryModel[] }[];
};

export const initialState: State = {
    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    keyAttributeDescriptors: [],

    cryptographicKeys: [],
    cryptographicKeyPairs: [],
    altCryptographicKeyPairs: [],

    isFetchingKeyPairs: false,
    isFetchingDetail: false,
    isUpdatingKeyItem: false,
    isUpdatingKeyUsage: false,
    isBulkUpdatingKeyUsage: false,
    isCreating: false,
    createCryptographicKeySucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
    updateCryptographicKeySucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isCompromising: false,
    isBulkCompromising: false,
    isDestroying: false,
    isBulkDestroying: false,
    isSyncing: false,

    isFetchingAttributes: false,

    isFetchingHistory: false,

    keyHistory: [],
};

export const slice = createSlice({
    name: 'cryptographicKeys',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        clearDeleteErrorMessages: (state, action: PayloadAction<void>) => {
            state.deleteErrorMessage = '';
            state.bulkDeleteErrorMessages = [];
        },

        clearKeyAttributeDescriptors: (state, action: PayloadAction<void>) => {
            state.keyAttributeDescriptors = [];
        },

        clearCryptographicKey: (state, action: PayloadAction<void>) => {
            state.cryptographicKey = undefined;
        },

        listCryptographicKeys: (state, action: PayloadAction<SearchRequestModel>) => {
            state.cryptographicKeys = [];
        },

        listCryptographicKeysSuccess: (state, action: PayloadAction<CryptographicKeyResponseModel[]>) => {
            state.cryptographicKeys = action.payload;
        },

        listCryptographicKeyPairs: (state, action: PayloadAction<{ tokenProfileUuid?: string; store?: 'alt' | 'normal' }>) => {
            if (action.payload.store === 'alt') {
                state.altCryptographicKeyPairs = [];
            } else {
                state.cryptographicKeyPairs = [];
            }
            state.isFetchingKeyPairs = true;
        },

        listCryptographicKeyPairSuccess: (
            state,
            action: PayloadAction<{ cryptographicKeys: CryptographicKeyPairResponseModel[]; store?: 'alt' | 'normal' }>,
        ) => {
            if (action.payload.store === 'alt') {
                state.altCryptographicKeyPairs = action.payload.cryptographicKeys;
            } else {
                state.cryptographicKeyPairs = action.payload.cryptographicKeys;
            }
            state.isFetchingKeyPairs = false;
        },

        listCryptographicKeyPairFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingKeyPairs = false;
        },

        getCryptographicKeyDetail: (state, action: PayloadAction<{ uuid: string }>) => {
            state.cryptographicKey = undefined;
            state.isFetchingDetail = true;
        },

        getCryptographicKeyDetailSuccess: (state, action: PayloadAction<{ cryptographicKey: CryptographicKeyDetailResponseModel }>) => {
            state.isFetchingDetail = false;
            state.cryptographicKey = action.payload.cryptographicKey;
        },

        getCryptographicKeyDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
            state.isSyncing = false;
        },

        syncKeys: (state, action: PayloadAction<{ tokenInstanceUuid: string }>) => {
            state.isSyncing = true;
        },

        syncKeysSuccess: (state, action: PayloadAction<void>) => {
            state.isSyncing = false;
        },

        syncKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isSyncing = false;
        },

        createCryptographicKey: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                type: KeyRequestType;
                cryptographicKeyAddRequest: CryptographicKeyAddRequestModel;
                usesGlobalModal: boolean;
            }>,
        ) => {
            state.isCreating = true;
            state.createCryptographicKeySucceeded = false;
        },

        createCryptographicKeyFromGlobalModal: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                type: KeyRequestType;
                cryptographicKeyAddRequest: CryptographicKeyAddRequestModel;
            }>,
        ) => {
            state.isCreating = true;
            state.createCryptographicKeySucceeded = false;
        },

        listAttributeDescriptors: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; tokenProfileUuid: string; keyRequestType: KeyRequestType }>,
        ) => {
            state.isFetchingAttributes = true;
        },

        listAttributeDescriptorsSuccess: (
            state,
            action: PayloadAction<{ uuid: string; attributeDescriptors: AttributeDescriptorModel[] }>,
        ) => {
            state.isFetchingAttributes = false;

            state.keyAttributeDescriptors = action.payload.attributeDescriptors;
        },

        listAttributeDescriptorsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingAttributes = false;
        },

        createCryptographicKeySuccess: (state, action: PayloadAction<{ uuid: string; tokenInstanceUuid: string }>) => {
            state.isCreating = false;
            state.createCryptographicKeySucceeded = true;
        },

        createCryptographicKeyFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createCryptographicKeySucceeded = false;
        },

        updateCryptographicKey: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                cryptographicKeyEditRequest: CryptographicKeyEditRequestModel;
                redirect?: string;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateCryptographicKeySucceeded = false;
        },

        updateCryptographicKeySuccess: (
            state,
            action: PayloadAction<{ cryptographicKey: CryptographicKeyDetailResponseModel; redirect?: string }>,
        ) => {
            state.isUpdating = false;
            state.updateCryptographicKeySucceeded = true;
            state.cryptographicKey = action.payload.cryptographicKey;
        },

        updateCryptographicKeyFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateCryptographicKeySucceeded = false;
        },

        updateCryptographicKeyItem: (
            state,
            action: PayloadAction<{
                uuid: string;
                keyItemUuid: string;
                cryptographicKeyItemEditRequest: CryptographicKeyItemEditRequestDto;
                redirect?: string;
            }>,
        ) => {
            state.isUpdatingKeyItem = true;
        },

        updateCryptographicKeyItemSuccess: (
            state,
            action: PayloadAction<{ cryptographicKeyItem: CryptographicKeyItemDetailResponseModel; redirect?: string }>,
        ) => {
            state.isUpdatingKeyItem = false;
            if (state.cryptographicKey?.items) {
                state.cryptographicKey.items = state.cryptographicKey.items.map((keyItem) => {
                    if (keyItem.uuid === action.payload.cryptographicKeyItem.uuid) {
                        return action.payload.cryptographicKeyItem;
                    }
                    return keyItem;
                });
            }
        },

        updateCryptographicKeyItemFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingKeyItem = false;
        },

        enableCryptographicKey: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isEnabling = true;
        },

        enableCryptographicKeySuccess: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isEnabling = false;

            if (action.payload.keyItemUuid.length > 0) {
                action.payload.keyItemUuid.forEach((keyItemUuid) => {
                    const keyItem = state.cryptographicKey?.items.find((keyItem) => keyItem.uuid === keyItemUuid);
                    if (keyItem) keyItem.enabled = true;
                });
            } else {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    keyItem.enabled = true;
                });
            }
        },

        enableCryptographicKeyFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            if (action.payload.requestUuids.length === 0) {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    if (!action.payload.failedUuids.includes(keyItem.uuid)) {
                        keyItem.enabled = true;
                    }
                });
            }
            state.isEnabling = false;
        },

        disableCryptographicKey: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isDisabling = true;
        },

        disableCryptographicKeySuccess: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isDisabling = false;

            if (action.payload.keyItemUuid.length > 0) {
                action.payload.keyItemUuid.forEach((keyItemUuid) => {
                    const keyItem = state.cryptographicKey?.items.find((keyItem) => keyItem.uuid === keyItemUuid);
                    if (keyItem) keyItem.enabled = false;
                });
            } else {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    keyItem.enabled = false;
                });
            }
        },

        disableCryptographicKeyFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            if (action.payload.requestUuids.length === 0) {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    if (!action.payload.failedUuids.includes(keyItem.uuid)) {
                        keyItem.enabled = false;
                    }
                });
            }
            state.isDisabling = false;
        },

        deleteCryptographicKey: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string>; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteCryptographicKeySuccess: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string>; redirect?: string }>) => {
            state.isDeleting = false;

            const index = state.cryptographicKeys.findIndex((cryptographicKey) => cryptographicKey.uuid === action.payload.uuid);
            if (action.payload.keyItemUuid.length === state.cryptographicKey?.items.length || action.payload.keyItemUuid.length === 0) {
                if (index !== -1) state.cryptographicKeys.splice(index, 1);
                if (state.cryptographicKey?.uuid === action.payload.uuid) {
                    state.cryptographicKey = undefined;
                }
            } else {
                action.payload.keyItemUuid.forEach((keyUuid) => {
                    const keyItem = state.cryptographicKey?.items.find((keyItem) => keyItem.uuid === keyUuid);
                    if (keyItem) {
                        const keyItemIndex = state.cryptographicKey?.items.indexOf(keyItem);
                        if (keyItemIndex !== undefined && keyItemIndex !== -1) {
                            state.cryptographicKey?.items.splice(keyItemIndex, 1);
                        }
                    }
                    return null;
                });
            }
        },

        deleteCryptographicKeyFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        compromiseCryptographicKey: (state, action: PayloadAction<{ uuid: string; request: CryptographicKeyCompromiseRequestModel }>) => {
            state.isCompromising = true;
        },

        compromiseCryptographicKeySuccess: (
            state,
            action: PayloadAction<{ uuid: string; request: CryptographicKeyCompromiseRequestModel }>,
        ) => {
            state.isCompromising = false;

            if (action.payload.request.uuids) {
                action.payload.request.uuids.forEach((keyItemUuid) => {
                    const keyItem = state.cryptographicKey?.items.find((keyItem) => keyItem.uuid === keyItemUuid);
                    if (keyItem) keyItem.state = KeyState.Compromised;
                    if (keyItem) keyItem.reason = action.payload.request.reason;
                });
            } else {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    keyItem.state = KeyState.Compromised;
                    keyItem.reason = action.payload.request.reason;
                });
            }
        },

        compromiseCryptographicKeyFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            if (action.payload.requestUuids.length === 0) {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    if (!action.payload.failedUuids.includes(keyItem.uuid)) {
                        keyItem.state = KeyState.Compromised;
                    }
                });
            }
            state.isCompromising = false;
        },

        destroyCryptographicKey: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isDestroying = true;
        },

        destroyCryptographicKeySuccess: (state, action: PayloadAction<{ uuid: string; keyItemUuid: Array<string> }>) => {
            state.isDestroying = false;

            if (action.payload.keyItemUuid.length > 0) {
                action.payload.keyItemUuid.forEach((keyItemUuid) => {
                    const keyItem = state.cryptographicKey?.items.find((keyItem) => keyItem.uuid === keyItemUuid);
                    if (keyItem)
                        keyItem.state = keyItem.state === KeyState.Compromised ? KeyState.DestroyedCompromised : KeyState.Destroyed;
                });
            } else {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    keyItem.state = keyItem.state === KeyState.Compromised ? KeyState.DestroyedCompromised : KeyState.Destroyed;
                });
            }
        },

        destroyCryptographicKeyFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            if (action.payload.requestUuids.length === 0) {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    if (!action.payload.failedUuids.includes(keyItem.uuid)) {
                        keyItem.state = keyItem.state === KeyState.Compromised ? KeyState.DestroyedCompromised : KeyState.Destroyed;
                    }
                });
            }
            state.isDestroying = false;
        },

        bulkDeleteCryptographicKeys: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteCryptographicKeysSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.cryptographicKeys.findIndex((cryptographicKey) => cryptographicKey.uuid === uuid);
                if (index >= 0) state.cryptographicKeys.splice(index, 1);
            });

            if (state.cryptographicKey && action.payload.uuids.includes(state.cryptographicKey.uuid)) state.cryptographicKey = undefined;
        },

        bulkDeleteCryptographicKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkDeleteCryptographicKeyItems: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteCryptographicKeyItemsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                if (keyItemIndex >= 0) state.cryptographicKeys.splice(keyItemIndex, 1);
            });

            if (state.cryptographicKey && action.payload.uuids.includes(state.cryptographicKey.uuid)) state.cryptographicKey = undefined;
        },

        bulkDeleteCryptographicKeyItemsFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableCryptographicKeys: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableCryptographicKeysSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;
        },

        bulkEnableCryptographicKeysFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkEnabling = false;
        },

        bulkEnableCryptographicKeyItems: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableCryptographicKeyItemsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                if (keyItemIndex >= 0) state.cryptographicKeys[keyItemIndex].enabled = true;
            });
        },

        bulkEnableCryptographicKeyItemsFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            action.payload.requestUuids.forEach((uuid) => {
                if (!action.payload.failedUuids.includes(uuid)) {
                    const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                    if (keyItemIndex >= 0) {
                        state.cryptographicKeys[keyItemIndex].enabled = true;
                    }
                }
            });
            state.isBulkEnabling = false;
        },

        bulkDisableCryptographicKeys: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableCryptographicKeysSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;
        },

        bulkDisableCryptographicKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },

        bulkDisableCryptographicKeyItems: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableCryptographicKeyItemsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                if (keyItemIndex >= 0) state.cryptographicKeys[keyItemIndex].enabled = false;
            });
        },

        bulkDisableCryptographicKeyItemsFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            action.payload.requestUuids.forEach((uuid) => {
                if (!action.payload.failedUuids.includes(uuid)) {
                    const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                    if (keyItemIndex >= 0) {
                        state.cryptographicKeys[keyItemIndex].enabled = false;
                    }
                }
            });
            state.isBulkDisabling = false;
        },

        updateKeyUsage: (state, action: PayloadAction<{ uuid: string; usage: CryptographicKeyKeyUsageUpdateRequestModel }>) => {
            state.isUpdatingKeyUsage = true;
        },

        updateKeyUsageSuccess: (state, action: PayloadAction<{ uuid: string; keyItemsUuid: Array<string>; usage: Array<KeyUsage> }>) => {
            state.isUpdatingKeyUsage = false;

            if (action.payload.keyItemsUuid && action.payload.keyItemsUuid.length > 0) {
                action.payload.keyItemsUuid.forEach((keyItemUuid) => {
                    const index = state.cryptographicKey!.items.findIndex((keyItem) => keyItem.uuid === keyItemUuid);
                    if (index >= 0) state.cryptographicKey!.items[index].usage = action.payload.usage;
                });
            } else {
                state.cryptographicKey?.items.forEach((keyItem) => {
                    keyItem.usage = action.payload.usage;
                });
            }
        },

        updateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsage: (state, action: PayloadAction<{ usage: CryptographicKeyKeyUsageBulkUpdateRequestModel }>) => {
            state.isBulkUpdatingKeyUsage = true;
        },

        bulkUpdateKeyUsageSuccess: (state, action: PayloadAction<Record<string, never>>) => {
            state.isBulkUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingKeyUsage = false;
        },

        bulkUpdateKeyItemUsage: (state, action: PayloadAction<{ usage: CryptographicKeyKeyUsageBulkUpdateRequestModel }>) => {
            state.isBulkUpdatingKeyUsage = true;
        },

        bulkUpdateKeyItemUsageSuccess: (state, action: PayloadAction<{ usages: Array<KeyUsage>; uuids: Array<string> }>) => {
            state.isBulkUpdatingKeyUsage = false;

            if (action.payload.uuids && state.cryptographicKey) {
                action.payload.uuids.forEach((uuid) => {
                    const index = state.cryptographicKey!.items.findIndex((keyItem) => keyItem.uuid === uuid);
                    if (index >= 0) {
                        state.cryptographicKey!.items[index].usage = action.payload.usages;
                    }
                });
            }
        },

        bulkUpdateKeyItemUsageFailure: (
            state,
            action: PayloadAction<{ requestUuids: string[]; failedUuids: string[]; usages: Array<KeyUsage> }>,
        ) => {
            if (state.cryptographicKey) {
                action.payload.requestUuids.forEach((uuid) => {
                    if (!action.payload.failedUuids.includes(uuid)) {
                        const index = state.cryptographicKey!.items.findIndex((keyItem) => keyItem.uuid === uuid);
                        if (index >= 0) {
                            state.cryptographicKey!.items[index].usage = action.payload.usages;
                        }
                    }
                });
            }
            state.isBulkUpdatingKeyUsage = false;
        },

        bulkCompromiseCryptographicKeys: (state, action: PayloadAction<{ request: CryptographicKeyBulkCompromiseRequestModel }>) => {
            state.isBulkCompromising = true;
        },

        bulkCompromiseCryptographicKeysSuccess: (state, action: PayloadAction<{ request: CryptographicKeyBulkCompromiseRequestModel }>) => {
            state.isBulkCompromising = false;
        },

        bulkCompromiseCryptographicKeysFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkCompromising = false;
        },

        bulkCompromiseCryptographicKeyItems: (
            state,
            action: PayloadAction<{ request: CryptographicKeyItemBulkCompromiseRequestModel }>,
        ) => {
            state.isBulkCompromising = true;
        },

        bulkCompromiseCryptographicKeyItemsSuccess: (
            state,
            action: PayloadAction<{ request: CryptographicKeyItemBulkCompromiseRequestModel }>,
        ) => {
            state.isBulkCompromising = false;

            action.payload.request.uuids?.forEach((uuid) => {
                const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                if (keyItemIndex >= 0) {
                    state.cryptographicKeys[keyItemIndex].state = KeyState.Compromised;
                }
            });
        },

        bulkCompromiseCryptographicKeyItemsFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            action.payload.requestUuids.forEach((uuid) => {
                if (!action.payload.failedUuids.includes(uuid)) {
                    const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                    if (keyItemIndex >= 0) {
                        state.cryptographicKeys[keyItemIndex].state = KeyState.Compromised;
                    }
                }
            });
            state.isBulkCompromising = false;
        },

        bulkDestroyCryptographicKeys: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDestroying = true;
        },

        bulkDestroyCryptographicKeysSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDestroying = false;
        },

        bulkDestroyCryptographicKeysFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkDestroying = false;
        },

        bulkDestroyCryptographicKeyItems: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDestroying = true;
        },

        bulkDestroyCryptographicKeyItemsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDestroying = false;

            action.payload.uuids.forEach((uuid) => {
                const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                if (keyItemIndex >= 0)
                    state.cryptographicKeys[keyItemIndex].state =
                        state.cryptographicKeys[keyItemIndex].state === KeyState.Compromised
                            ? KeyState.DestroyedCompromised
                            : KeyState.Destroyed;
            });
        },

        bulkDestroyCryptographicKeyItemsFailure: (state, action: PayloadAction<{ requestUuids: string[]; failedUuids: string[] }>) => {
            action.payload.requestUuids.forEach((uuid) => {
                if (!action.payload.failedUuids.includes(uuid)) {
                    const keyItemIndex = state.cryptographicKeys.findIndex((keyItem) => keyItem.uuid === uuid);
                    if (keyItemIndex >= 0) {
                        state.cryptographicKeys[keyItemIndex].state =
                            state.cryptographicKeys[keyItemIndex].state === KeyState.Compromised
                                ? KeyState.DestroyedCompromised
                                : KeyState.Destroyed;
                    }
                }
            });
            state.isBulkDestroying = false;
        },

        getHistory: (state, action: PayloadAction<{ keyUuid: string; keyItemUuid: string }>) => {
            // set key history for the uuid as empty array
            state.keyHistory?.forEach((keyHistoryItem) => {
                if (keyHistoryItem.uuid === action.payload.keyItemUuid) {
                    state.keyHistory?.splice(state.keyHistory?.indexOf(keyHistoryItem), 1);
                }
            });
            state.isFetchingHistory = true;
        },

        getHistorySuccess: (state, action: PayloadAction<{ keyItemUuid: string; keyHistory: CryptographicKeyHistoryModel[] }>) => {
            state.isFetchingHistory = false;
            state.keyHistory?.push({ uuid: action.payload.keyItemUuid, history: action.payload.keyHistory });
        },

        getHistoryFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingHistory = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const cryptographicKey = createSelector(state, (state: State) => state.cryptographicKey);
const cryptographicKeys = createSelector(state, (state: State) => state.cryptographicKeys);
const cryptographicKeyPairs = createSelector(state, (state: State) => state.cryptographicKeyPairs);
const altCryptographicKeyPairs = createSelector(state, (state: State) => state.altCryptographicKeyPairs);

const isFetchingKeyPairs = createSelector(state, (state: State) => state.isFetchingKeyPairs);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state: State) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const createCryptographicKeySucceeded = createSelector(state, (state: State) => state.createCryptographicKeySucceeded);
const updateCryptographicKeySucceeded = createSelector(state, (state: State) => state.updateCryptographicKeySucceeded);
const isEnabling = createSelector(state, (state: State) => state.isEnabling);
const isBulkEnabling = createSelector(state, (state: State) => state.isBulkEnabling);
const isDisabling = createSelector(state, (state: State) => state.isDisabling);
const isBulkDisabling = createSelector(state, (state: State) => state.isBulkDisabling);
const isCompromising = createSelector(state, (state: State) => state.isCompromising);
const isBulkCompromising = createSelector(state, (state: State) => state.isBulkCompromising);
const isDestroying = createSelector(state, (state: State) => state.isDestroying);
const isBulkDestroying = createSelector(state, (state: State) => state.isBulkDestroying);
const isSyncing = createSelector(state, (state: State) => state.isSyncing);

const isUpdatingKeyUsage = createSelector(state, (state: State) => state.isUpdatingKeyUsage);
const isUpdatingKeyItem = createSelector(state, (state: State) => state.isUpdatingKeyItem);
const isBulkUpdatingKeyUsage = createSelector(state, (state: State) => state.isBulkUpdatingKeyUsage);

const isFetchingAttributes = createSelector(state, (state: State) => state.isFetchingAttributes);
const keyAttributeDescriptors = createSelector(state, (state: State) => state.keyAttributeDescriptors);

const isFetchingHistory = createSelector(state, (state: State) => state.isFetchingHistory);
const keyHistory = createSelector(state, (state: State) => state.keyHistory);

export const selectors = {
    state,

    cryptographicKey,
    cryptographicKeys,
    cryptographicKeyPairs,
    altCryptographicKeyPairs,

    isFetchingKeyPairs,
    isFetchingDetail,
    isCreating,
    createCryptographicKeySucceeded,
    isDeleting,
    isBulkDeleting,
    isUpdating,
    updateCryptographicKeySucceeded,
    isEnabling,
    isBulkEnabling,
    isDisabling,
    isBulkDisabling,
    isCompromising,
    isBulkCompromising,
    isDestroying,
    isBulkDestroying,
    isSyncing,

    isUpdatingKeyUsage,
    isUpdatingKeyItem,
    isBulkUpdatingKeyUsage,

    isFetchingAttributes,
    keyAttributeDescriptors,

    isFetchingHistory,
    keyHistory,
};

export const actions = slice.actions;

export default slice.reducer;
