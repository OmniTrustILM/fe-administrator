import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BulkActionModel } from 'types/connectors';
import type {
    KeyUsage,
    RequestAttribute,
    TokenKeyListResponseDto,
    TokenKeyOnboardingResultDto,
    TokenKeySelectionDto,
    TokenProfileDto,
} from 'types/openapi';
import type {
    TokenProfileAddRequestModel,
    TokenProfileDetailResponseModel,
    TokenProfileEditRequestModel,
    TokenProfileKeyUsageBulkUpdateRequestModel,
    TokenProfileKeyUsageUpdateRequestModel,
    TokenProfileResponseModel,
} from 'types/token-profiles';

export type State = {
    checkedRows: string[];

    deleteErrorMessage: string;
    bulkDeleteErrorMessages: BulkActionModel[];

    tokenProfile?: TokenProfileDetailResponseModel;
    tokenProfiles: TokenProfileResponseModel[];
    importableTokenProfiles: TokenProfileDto[];
    /** Whether the last listing of importable profiles succeeded, which tells an empty answer from a failed request. */
    importableTokenProfilesListed: boolean;
    /** Why the last listing of importable profiles failed, until the next one. */
    importableTokenProfilesError?: string;
    /** The profiles whose connector lists the keys in their key storage. */
    keyListableTokenProfiles: TokenProfileDto[];
    keyListableTokenProfilesListed: boolean;
    keyListableTokenProfilesError?: string;
    tokenKeys?: TokenKeyListResponseDto;
    /** Why the last listing of key pairs failed. */
    tokenKeysError?: string;
    tokenKeyOnboardingResults?: TokenKeyOnboardingResultDto[];

    isFetchingList: boolean;
    isFetchingImportable: boolean;
    isFetchingKeyListable: boolean;
    isFetchingDetail: boolean;
    detailFetchSucceeded: boolean;
    /** Why the last detail request failed, until the next one. */
    detailError?: string;
    isFetchingAttributes: boolean;
    isUpdatingKeyUsage: boolean;
    isBulkUpdatingKeyUsage: boolean;

    isCreating: boolean;
    createTokenProfileSucceeded: boolean;
    isDeleting: boolean;
    isBulkDeleting: boolean;
    isUpdating: boolean;
    updateTokenProfileSucceeded: boolean;
    isEnabling: boolean;
    isBulkEnabling: boolean;
    isDisabling: boolean;
    isBulkDisabling: boolean;
    isListingTokenKeys: boolean;
    isOnboardingTokenKeys: boolean;
};

export const initialState: State = {
    checkedRows: [],

    deleteErrorMessage: '',
    bulkDeleteErrorMessages: [],

    tokenProfiles: [],
    importableTokenProfiles: [],
    importableTokenProfilesListed: false,
    keyListableTokenProfiles: [],
    keyListableTokenProfilesListed: false,

    isFetchingList: false,
    isFetchingImportable: false,
    isFetchingKeyListable: false,
    isFetchingDetail: false,
    detailFetchSucceeded: false,
    isFetchingAttributes: false,
    isUpdatingKeyUsage: false,
    isBulkUpdatingKeyUsage: false,
    isCreating: false,
    createTokenProfileSucceeded: false,
    isDeleting: false,
    isBulkDeleting: false,
    isUpdating: false,
    updateTokenProfileSucceeded: false,
    isEnabling: false,
    isDisabling: false,
    isBulkEnabling: false,
    isBulkDisabling: false,
    isListingTokenKeys: false,
    isOnboardingTokenKeys: false,
};

export const slice = createSlice({
    name: 'tokenprofiles',

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
            state.bulkDeleteErrorMessages = [];
        },

        listTokenProfiles: (state, action: PayloadAction<{ enabled?: boolean }>) => {
            state.tokenProfiles = [];
            state.isFetchingList = true;
        },

        listTokenProfilesSuccess: (state, action: PayloadAction<{ tokenProfiles: TokenProfileResponseModel[] }>) => {
            state.tokenProfiles = action.payload.tokenProfiles;
            state.isFetchingList = false;
        },

        listTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        listImportableTokenProfiles: (state, action: PayloadAction<{ importable: string[] }>) => {
            state.importableTokenProfiles = [];
            state.importableTokenProfilesListed = false;
            state.importableTokenProfilesError = undefined;
            state.isFetchingImportable = true;
        },

        listImportableTokenProfilesSuccess: (state, action: PayloadAction<{ tokenProfiles: TokenProfileDto[] }>) => {
            state.importableTokenProfiles = action.payload.tokenProfiles;
            state.importableTokenProfilesListed = true;
            state.importableTokenProfilesError = undefined;
            state.isFetchingImportable = false;
        },

        listImportableTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.importableTokenProfilesListed = false;
            state.importableTokenProfilesError = action.payload.error;
            state.isFetchingImportable = false;
        },

        listKeyListableTokenProfiles: (state, action: PayloadAction<void>) => {
            state.keyListableTokenProfiles = [];
            state.keyListableTokenProfilesListed = false;
            state.keyListableTokenProfilesError = undefined;
            state.isFetchingKeyListable = true;
        },

        listKeyListableTokenProfilesSuccess: (state, action: PayloadAction<{ tokenProfiles: TokenProfileDto[] }>) => {
            state.keyListableTokenProfiles = action.payload.tokenProfiles;
            state.keyListableTokenProfilesListed = true;
            state.isFetchingKeyListable = false;
        },

        listKeyListableTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.keyListableTokenProfilesError = action.payload.error;
            state.isFetchingKeyListable = false;
        },

        getTokenProfileDetail: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string; skipWidgetLock?: boolean }>) => {
            if (state.tokenProfile?.uuid !== action.payload.uuid) {
                state.tokenProfile = undefined;
            }
            state.isFetchingDetail = true;
            state.detailFetchSucceeded = false;
            state.detailError = undefined;
        },

        getTokenProfileDetailSuccess: (state, action: PayloadAction<{ tokenProfile: TokenProfileDetailResponseModel }>) => {
            state.isFetchingDetail = false;
            state.detailFetchSucceeded = true;
            state.tokenProfile = action.payload.tokenProfile;
        },

        getTokenProfileDetailFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
            state.detailFetchSucceeded = false;
            state.detailError = action.payload.error;
        },

        createTokenProfile: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileAddRequest: TokenProfileAddRequestModel;
                usesGlobalModal: boolean;
            }>,
        ) => {
            state.isCreating = true;
            state.createTokenProfileSucceeded = false;
        },

        createTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string; tokenInstanceUuid: string }>) => {
            state.isCreating = false;
            state.createTokenProfileSucceeded = true;
        },

        createTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isCreating = false;
            state.createTokenProfileSucceeded = false;
        },

        updateTokenProfile: (
            state,
            action: PayloadAction<{
                profileUuid: string;
                tokenInstanceUuid: string;
                tokenProfileEditRequest: TokenProfileEditRequestModel;
                redirect?: string;
                usesGlobalModal?: boolean;
            }>,
        ) => {
            state.isUpdating = true;
            state.updateTokenProfileSucceeded = false;
        },

        updateTokenProfileSuccess: (state, action: PayloadAction<{ tokenProfile: TokenProfileDetailResponseModel; redirect?: string }>) => {
            state.isUpdating = false;
            state.updateTokenProfileSucceeded = true;
            state.tokenProfile = action.payload.tokenProfile;
        },

        updateTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdating = false;
            state.updateTokenProfileSucceeded = false;
        },

        enableTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string }>) => {
            state.isEnabling = true;
        },

        enableTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const tokenProfile = state.tokenProfiles.find((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (tokenProfile) tokenProfile.enabled = true;

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile.enabled = true;
        },

        enableTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string }>) => {
            state.isDisabling = true;
        },

        disableTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const tokenProfile = state.tokenProfiles.find((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (tokenProfile) tokenProfile.enabled = false;

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile.enabled = false;
        },

        disableTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDisabling = false;
        },

        deleteTokenProfile: (state, action: PayloadAction<{ tokenInstanceUuid: string; uuid: string; redirect?: string }>) => {
            state.isDeleting = true;
        },

        deleteTokenProfileSuccess: (state, action: PayloadAction<{ uuid: string; redirect?: string }>) => {
            state.isDeleting = false;

            const index = state.tokenProfiles.findIndex((tokenProfile) => tokenProfile.uuid === action.payload.uuid);
            if (index !== -1) state.tokenProfiles.splice(index, 1);

            if (state.tokenProfile?.uuid === action.payload.uuid) state.tokenProfile = undefined;
        },

        deleteTokenProfileFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isDeleting = false;
        },

        bulkDeleteTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.bulkDeleteErrorMessages = [];
            state.isBulkDeleting = true;
        },

        bulkDeleteTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDeleting = false;

            action.payload.uuids.forEach((uuid) => {
                const index = state.tokenProfiles.findIndex((tokenProfile) => tokenProfile.uuid === uuid);
                if (index >= 0) state.tokenProfiles.splice(index, 1);
            });

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile = undefined;
        },

        bulkDeleteTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDeleting = false;
        },

        bulkEnableTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            state.tokenProfiles = state.tokenProfiles.map((tokenProfile) => ({
                ...tokenProfile,
                enabled: action.payload.uuids.includes(tokenProfile.uuid) ? true : tokenProfile.enabled,
            }));

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile.enabled = true;
        },

        bulkEnableTokenProfilesFailure: (state, action: PayloadAction<{ error: string }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableTokenProfiles: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableTokenProfilesSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            state.tokenProfiles = state.tokenProfiles.map((tokenProfile) => ({
                ...tokenProfile,
                enabled: action.payload.uuids.includes(tokenProfile.uuid) ? false : tokenProfile.enabled,
            }));

            if (state.tokenProfile && action.payload.uuids.includes(state.tokenProfile.uuid)) state.tokenProfile.enabled = false;
        },

        bulkDisableTokenProfilesFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },

        updateKeyUsage: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; uuid: string; usage: TokenProfileKeyUsageUpdateRequestModel }>,
        ) => {
            state.isUpdatingKeyUsage = true;
        },

        updateKeyUsageSuccess: (state, action: PayloadAction<{ uuid: string; usage: Array<KeyUsage> }>) => {
            state.isUpdatingKeyUsage = false;

            state.tokenProfile!.usages = action.payload.usage;
        },

        updateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsage: (state, action: PayloadAction<{ usage: TokenProfileKeyUsageBulkUpdateRequestModel }>) => {
            state.isBulkUpdatingKeyUsage = true;
        },

        bulkUpdateKeyUsageSuccess: (state, action: PayloadAction<Record<string, never>>) => {
            state.isBulkUpdatingKeyUsage = false;
        },

        bulkUpdateKeyUsageFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkUpdatingKeyUsage = false;
        },

        listTokenKeys: (
            state,
            action: PayloadAction<{ tokenInstanceUuid: string; tokenProfileUuid: string; pageNumber: number; itemsPerPage: number }>,
        ) => {
            state.isListingTokenKeys = true;
            state.tokenKeysError = undefined;
        },

        listTokenKeysSuccess: (state, action: PayloadAction<{ tokenKeys: TokenKeyListResponseDto }>) => {
            if (!state.isListingTokenKeys) return;

            state.isListingTokenKeys = false;
            state.tokenKeys = action.payload.tokenKeys;
        },

        listTokenKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            if (!state.isListingTokenKeys) return;

            state.isListingTokenKeys = false;
            state.tokenKeys = undefined;
            state.tokenKeysError = action.payload.error;
        },

        onboardTokenKeys: (
            state,
            action: PayloadAction<{
                tokenInstanceUuid: string;
                tokenProfileUuid: string;
                keys: TokenKeySelectionDto[];
                customAttributes?: RequestAttribute[];
            }>,
        ) => {
            state.isOnboardingTokenKeys = true;
            state.tokenKeyOnboardingResults = undefined;
        },

        onboardTokenKeysSuccess: (state, action: PayloadAction<{ results: TokenKeyOnboardingResultDto[] }>) => {
            if (!state.isOnboardingTokenKeys) return;

            state.isOnboardingTokenKeys = false;
            state.tokenKeyOnboardingResults = action.payload.results;
        },

        onboardTokenKeysFailure: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isOnboardingTokenKeys = false;
        },

        clearTokenKeys: (state, action: PayloadAction<void>) => {
            state.tokenKeys = undefined;
            state.tokenKeysError = undefined;
            state.isListingTokenKeys = false;
            state.isOnboardingTokenKeys = false;
            state.tokenKeyOnboardingResults = undefined;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state: State) => state.checkedRows);

const tokenProfile = createSelector(state, (state: State) => state.tokenProfile);
/** The token profile detail, only while it is the named profile's, fetched successfully and not being fetched again. */
const loadedTokenProfile = (uuid: string | undefined) =>
    createSelector(state, (state: State) =>
        uuid && state.tokenProfile?.uuid === uuid && !state.isFetchingDetail && state.detailFetchSucceeded ? state.tokenProfile : undefined,
    );
const tokenProfiles = createSelector(state, (state: State) => state.tokenProfiles);
const importableTokenProfiles = createSelector(state, (state: State) => state.importableTokenProfiles);
const isFetchingImportable = createSelector(state, (state: State) => state.isFetchingImportable);
const isImportableTokenProfilesListed = createSelector(state, (state: State) => state.importableTokenProfilesListed);
const importableTokenProfilesError = createSelector(state, (state: State) => state.importableTokenProfilesError);
const keyListableTokenProfiles = createSelector(state, (state: State) => state.keyListableTokenProfiles);
const isFetchingKeyListable = createSelector(state, (state: State) => state.isFetchingKeyListable);
const isKeyListableTokenProfilesListed = createSelector(state, (state: State) => state.keyListableTokenProfilesListed);
const keyListableTokenProfilesError = createSelector(state, (state: State) => state.keyListableTokenProfilesError);

const isFetchingList = createSelector(state, (state: State) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state: State) => state.isFetchingDetail);
const detailFetchSucceeded = createSelector(state, (state: State) => state.detailFetchSucceeded);
const detailError = createSelector(state, (state: State) => state.detailError);
const isFetchingAttributes = createSelector(state, (state: State) => state.isFetchingAttributes);
const isCreating = createSelector(state, (state: State) => state.isCreating);
const createTokenProfileSucceeded = createSelector(state, (state: State) => state.createTokenProfileSucceeded);
const isDeleting = createSelector(state, (state: State) => state.isDeleting);
const isBulkDeleting = createSelector(state, (state: State) => state.isBulkDeleting);
const isUpdating = createSelector(state, (state: State) => state.isUpdating);
const updateTokenProfileSucceeded = createSelector(state, (state: State) => state.updateTokenProfileSucceeded);
const isEnabling = createSelector(state, (state: State) => state.isEnabling);
const isBulkEnabling = createSelector(state, (state: State) => state.isBulkEnabling);
const isDisabling = createSelector(state, (state: State) => state.isDisabling);
const isBulkDisabling = createSelector(state, (state: State) => state.isBulkDisabling);
const isUpdatingKeyUsage = createSelector(state, (state: State) => state.isUpdatingKeyUsage);
const isBulkUpdatingKeyUsage = createSelector(state, (state: State) => state.isBulkUpdatingKeyUsage);
const tokenKeys = createSelector(state, (state: State) => state.tokenKeys);
const tokenKeysError = createSelector(state, (state: State) => state.tokenKeysError);
const tokenKeyOnboardingResults = createSelector(state, (state: State) => state.tokenKeyOnboardingResults);
const isListingTokenKeys = createSelector(state, (state: State) => state.isListingTokenKeys);
const isOnboardingTokenKeys = createSelector(state, (state: State) => state.isOnboardingTokenKeys);

export const selectors = {
    state,

    checkedRows,

    tokenProfile,
    loadedTokenProfile,
    tokenProfiles,
    importableTokenProfiles,
    isFetchingImportable,
    isImportableTokenProfilesListed,
    importableTokenProfilesError,
    keyListableTokenProfiles,
    isFetchingKeyListable,
    isKeyListableTokenProfilesListed,
    keyListableTokenProfilesError,

    isFetchingList,
    isFetchingDetail,
    detailFetchSucceeded,
    detailError,
    isFetchingAttributes,
    isCreating,
    createTokenProfileSucceeded,
    isDeleting,
    isBulkDeleting,
    isUpdating,
    updateTokenProfileSucceeded,
    isEnabling,
    isBulkEnabling,
    isDisabling,
    isBulkDisabling,
    isUpdatingKeyUsage,
    isBulkUpdatingKeyUsage,
    tokenKeys,
    tokenKeysError,
    tokenKeyOnboardingResults,
    isListingTokenKeys,
    isOnboardingTokenKeys,
};

export const actions = slice.actions;

export default slice.reducer;
