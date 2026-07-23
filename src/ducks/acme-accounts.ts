import { resetSliceState } from 'ducks/reducerUtils';
import type { AppState } from 'ducks';
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AcmeAccountListResponseModel, AcmeAccountResponseModel } from 'types/acme-accounts';
import { AccountStatus } from 'types/openapi';

export type State = {
    checkedRows: string[];

    account?: AcmeAccountResponseModel;
    accounts: AcmeAccountListResponseModel[];

    isFetchingList: boolean;
    isFetchingDetail: boolean;
    isRevoking: boolean;
    isBulkRevoking: boolean;
    isEnabling: boolean;
    isBulkEnabling: boolean;
    isDisabling: boolean;
    isBulkDisabling: boolean;
};

export const initialState: State = {
    checkedRows: [],

    accounts: [],

    isFetchingList: false,
    isFetchingDetail: false,
    isRevoking: false,
    isBulkRevoking: false,
    isEnabling: false,
    isBulkEnabling: false,
    isDisabling: false,
    isBulkDisabling: false,
};

export const slice = createSlice({
    name: 'acmeAccounts',

    initialState,

    reducers: {
        resetState: (state, action: PayloadAction<void>) => {
            resetSliceState(state, initialState);
        },

        setCheckedRows: (state, action: PayloadAction<{ checkedRows: string[] }>) => {
            state.checkedRows = action.payload.checkedRows;
        },

        listAcmeAccounts: (state, action: PayloadAction<void>) => {
            state.isFetchingList = true;
        },

        listAcmeAccountsSuccess: (state, action: PayloadAction<{ acmeAccounts: AcmeAccountListResponseModel[] }>) => {
            state.accounts = action.payload.acmeAccounts;
            state.isFetchingList = false;
        },

        listAcmeAccountsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingList = false;
        },

        getAcmeAccount: (state, action: PayloadAction<{ acmeProfileUuid: string; uuid: string }>) => {
            state.isFetchingDetail = true;
        },

        getAcmeAccountSuccess: (state, action: PayloadAction<{ acmeAccount: AcmeAccountResponseModel }>) => {
            state.account = action.payload.acmeAccount;
            state.isFetchingDetail = false;
        },

        getAcmeAccountFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        revokeAcmeAccount: (state, action: PayloadAction<{ acmeProfileUuid: string; uuid: string }>) => {
            state.isRevoking = true;
        },

        revokeAcmeAccountSuccess: (state, action: PayloadAction<{ acmeProfileUuid: string; uuid: string }>) => {
            state.isRevoking = false;

            const account = state.accounts.find((account) => account.uuid === action.payload.uuid);
            if (account) {
                account.status = AccountStatus.Revoked;
                account.enabled = false;
            }

            if (state.account?.uuid === action.payload.uuid) {
                state.account.status = AccountStatus.Revoked;
                state.account.enabled = false;
            }
        },

        revokeAcmeAccountFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isRevoking = false;
        },

        enableAcmeAccount: (state, action: PayloadAction<{ acmeProfileUuid: string; uuid: string }>) => {
            state.isEnabling = true;
        },

        enableAcmeAccountSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isEnabling = false;

            const account = state.accounts.find((account) => account.uuid === action.payload.uuid);
            if (account) account.enabled = true;

            if (state.account?.uuid === action.payload.uuid) state.account.enabled = true;
        },

        enableAcmeAccountFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isEnabling = false;
        },

        disableAcmeAccount: (state, action: PayloadAction<{ acmeProfileUuid: string; uuid: string }>) => {
            state.isDisabling = true;
        },

        disableAcmeAccountSuccess: (state, action: PayloadAction<{ uuid: string }>) => {
            state.isDisabling = false;

            const account = state.accounts.find((account) => account.uuid === action.payload.uuid);
            if (account) account.enabled = false;

            if (state.account?.uuid === action.payload.uuid) state.account.enabled = false;
        },

        disableAcmeAccountFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isFetchingDetail = false;
        },

        bulkRevokeAcmeAccounts: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkRevoking = true;
        },

        bulkRevokeAcmeAccountsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkRevoking = false;

            action.payload.uuids.forEach((uuid) => {
                const account = state.accounts.find((account) => account.uuid === uuid);
                if (account) {
                    account.status = AccountStatus.Revoked;
                    account.enabled = false;
                }
            });

            if (state.account && action.payload.uuids.includes(state.account?.uuid)) {
                state.account.status = AccountStatus.Revoked;
                state.account.enabled = false;
            }
        },

        bulkRevokeAcmeAccountsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkRevoking = false;
        },

        bulkEnableAcmeAccounts: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = true;
        },

        bulkEnableAcmeAccountsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkEnabling = false;

            action.payload.uuids.forEach((uuid) => {
                const account = state.accounts.find((account) => account.uuid === uuid);
                if (account) account.enabled = true;
            });

            if (state.account && action.payload.uuids.includes(state.account?.uuid)) state.account.enabled = true;
        },

        bulkEnableAcmeAccountsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkEnabling = false;
        },

        bulkDisableAcmeAccounts: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = true;
        },

        bulkDisableAcmeAccountsSuccess: (state, action: PayloadAction<{ uuids: string[] }>) => {
            state.isBulkDisabling = false;

            action.payload.uuids.forEach((uuid) => {
                const account = state.accounts.find((account) => account.uuid === uuid);
                if (account) account.enabled = false;
            });

            if (state.account && action.payload.uuids.includes(state.account?.uuid)) state.account.enabled = false;
        },

        bulkDisableAcmeAccountsFailed: (state, action: PayloadAction<{ error: string | undefined }>) => {
            state.isBulkDisabling = false;
        },
    },
});

const state = (reduxStore: AppState): State => reduxStore?.[slice.name];

const checkedRows = createSelector(state, (state) => state.checkedRows);

const account = createSelector(state, (state) => state.account);
const accounts = createSelector(state, (state) => state.accounts);

const isFetchingList = createSelector(state, (state) => state.isFetchingList);
const isFetchingDetail = createSelector(state, (state) => state.isFetchingDetail);
const isDeleting = createSelector(state, (state) => state.isRevoking);
const isBulkDeleting = createSelector(state, (state) => state.isBulkRevoking);
const isEnabling = createSelector(state, (state) => state.isEnabling);
const isBulkEnabling = createSelector(state, (state) => state.isBulkEnabling);
const isDisabling = createSelector(state, (state) => state.isDisabling);
const isBulkDisabling = createSelector(state, (state) => state.isBulkDisabling);

export const selectors = {
    state,

    checkedRows,

    account,
    accounts,

    isFetchingList,
    isFetchingDetail,
    isRevoking: isDeleting,
    isBulkRevoking: isBulkDeleting,
    isEnabling,
    isBulkEnabling,
    isDisabling,
    isBulkDisabling,
};

export const actions = slice.actions;

export default slice.reducer;
